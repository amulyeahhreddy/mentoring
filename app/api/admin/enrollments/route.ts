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

    const { data: enrollments } = await adminClient
      .from('enrollments')
      .select(`
        enrolled_at,
        student_id,
        class_id,
        profiles!enrollments_student_id_fkey(name),
        classes(name)
      `)
      .order('enrolled_at', { ascending: false })

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ enrollments: [] })
    }

    // Get all unique class_ids to fetch mentors separately
    const classIds = [...new Set(enrollments.map(e => e.class_id).filter(Boolean))]

    const { data: mentorClasses } = await adminClient
      .from('mentor_classes')
      .select('class_id, profiles!mentor_classes_mentor_id_fkey(name)')
      .in('class_id', classIds)

    // Build a lookup map: class_id -> mentor name
    const mentorMap: Record<string, string> = {}
    mentorClasses?.forEach((mc: any) => {
      const name = Array.isArray(mc.profiles) ? mc.profiles[0]?.name : mc.profiles?.name
      if (mc.class_id && name) mentorMap[mc.class_id] = name
    })

    const formattedEnrollments = enrollments.map((e: any) => ({
      student_name: Array.isArray(e.profiles) ? e.profiles[0]?.name : e.profiles?.name || 'Unknown',
      class_name: Array.isArray(e.classes) ? e.classes[0]?.name : e.classes?.name || 'Unknown',
      mentor_name: mentorMap[e.class_id] || 'Not assigned',
      enrolled_at: e.enrolled_at
    }))

    return NextResponse.json({ enrollments: formattedEnrollments })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
