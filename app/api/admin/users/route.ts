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

    // Fetch mentors
    const { data: mentors } = await adminClient
      .from('profiles')
      .select(`id, name, email, created_at, mentor_classes(class_id)`)
      .eq('role', 'mentor')

    // Fetch students
    const { data: students } = await adminClient
      .from('profiles')
      .select(`id, name, email, created_at`)
      .eq('role', 'mentee')

    // For each student fetch their enrollment separately
    const formattedStudents = await Promise.all(
      (students || []).map(async (student) => {
        const { data: enrollment } = await adminClient
          .from('enrollments')
          .select(`class_id, classes(name)`)
          .eq('student_id', student.id)
          .single()

        let mentorName = 'Not assigned'
        if (enrollment?.class_id) {
          const { data: mc } = await adminClient
            .from('mentor_classes')
            .select(`profiles(name)`)
            .eq('class_id', enrollment.class_id)
            .single()
          mentorName = (mc?.profiles as any)?.name || 'Not assigned'
        }

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          created_at: student.created_at,
          class_name: (enrollment?.classes as any)?.name || 'Not enrolled',
          mentor_name: mentorName
        }
      })
    )

    const formattedMentors = (mentors || []).map(mentor => ({
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      created_at: mentor.created_at,
      classes_assigned: mentor.mentor_classes?.length || 0
    }))

    return NextResponse.json({ mentors: formattedMentors, students: formattedStudents })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
