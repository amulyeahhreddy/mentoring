import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const adminClient = createAdminClient()

    // Fetch all classes
    const { data: classes } = await adminClient
      .from('classes')
      .select('id, name, class_code, created_at')

    const formattedClasses = await Promise.all(
      (classes || []).map(async (cls) => {
        
        // Step 1: get mentor_id from mentor_classes
        const { data: mcRows } = await adminClient
          .from('mentor_classes')
          .select('mentor_id')
          .eq('class_id', cls.id)

        const mc = mcRows?.[0] || null

        console.log('mentor_classes result for', cls.id, ':', mc)

        // Step 2: if mentor_id found, get name from profiles
        let mentorName = 'Not Assigned'
        if (mc?.mentor_id) {
          const { data: mentorProfile } = await adminClient
            .from('profiles')
            .select('name')
            .eq('id', mc.mentor_id)
            .single()
          mentorName = mentorProfile?.name || 'Not Assigned'
        }

        // Step 3: get student count
        const { count } = await adminClient
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id)

        return {
          id: cls.id,
          name: cls.name,
          class_code: cls.class_code,
          created_at: cls.created_at,
          mentor_name: mentorName,
          student_count: count || 0
        }
      })
    )

    return NextResponse.json({ classes: formattedClasses })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
