import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const adminClient = createAdminClient()

    const body = await request.json()
    const { mentor_id, class_id } = body

    if (!mentor_id || !class_id) {
      return NextResponse.json({ error: 'Mentor ID and Class ID are required' }, { status: 400 })
    }

    // Verify mentor exists
    const { data: mentor, error: mentorError } = await adminClient
      .from('profiles')
      .select('id, name')
      .eq('id', mentor_id)
      .eq('role', 'mentor')
      .single()

    if (mentorError || !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 400 })
    }

    // Upsert into mentor_classes
    const { error: assignError } = await adminClient
      .from('mentor_classes')
      .upsert({
        mentor_id,
        class_id
      }, {
        onConflict: 'mentor_id,class_id',
        ignoreDuplicates: false
      })

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
