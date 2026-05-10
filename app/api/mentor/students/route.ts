import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const adminClient = createAdminClient()
    const { data: mentorClasses } = await adminClient
      .from('mentor_classes')
      .select('class_id')
      .eq('mentor_id', user.id)
    if (!mentorClasses || mentorClasses.length === 0) {
      return NextResponse.json({ students: [] })
    }
    const classIds = mentorClasses.map(mc => mc.class_id)
    const { data: enrollments } = await adminClient
      .from('enrollments')
      .select('student_id, class_id, classes(name)')
      .in('class_id', classIds)
    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ students: [] })
    }
    const students = await Promise.all(
      enrollments.map(async (enrollment) => {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, name, email')
          .eq('id', enrollment.student_id)
          .single()
        const { data: latestSem } = await adminClient
          .from('btech_sem_records')
          .select('cgpa')
          .eq('student_id', enrollment.student_id)
          .order('year', { ascending: false })
          .order('semester', { ascending: false })
          .limit(1)
          .maybeSingle()
        const { data: insights } = await adminClient
          .from('pre_session_insights')
          .select('insights')
          .eq('student_id', enrollment.student_id)
          .eq('mentor_id', user.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return {
          id: enrollment.student_id,
          name: profile?.name || 'Unknown',
          email: profile?.email || '',
          class_name: (enrollment.classes as any)?.name || '',
          class_id: enrollment.class_id,
          latest_cgpa: latestSem?.cgpa || null,
          latest_attendance_pct: null,
          risk: (insights?.insights as any)?.overall_student_risk || null
        }
      })
    )
    return NextResponse.json({ students })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
