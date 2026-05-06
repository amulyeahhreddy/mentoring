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

    // Fetch enrollments with student, class, and mentor information
    const { data: enrollments } = await adminClient
      .from('enrollments')
      .select(`
        enrolled_at,
        profiles!enrollments_student_id_fkey(
          name
        ),
        classes(
          name
        ),
        mentor_classes(
          profiles!mentor_classes_mentor_id_fkey(
            name
          )
        )
      `)

    // Format the data
    const formattedEnrollments = enrollments?.map(enrollment => ({
      student_name: enrollment.profiles?.[0]?.name || 'Unknown',
      class_name: enrollment.classes?.[0]?.name || 'Unknown',
      mentor_name: enrollment.mentor_classes?.[0]?.profiles?.[0]?.name || 'Not assigned',
      enrolled_at: enrollment.enrolled_at
    })) || []

    return NextResponse.json({ enrollments: formattedEnrollments })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
