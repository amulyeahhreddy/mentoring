import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchDiaryExportData(studentId: string) {
  const supabase = createAdminClient()

  const [
    { data: profile },
    { data: preAdmissionRecords },
    { data: preCollegeActivities },
    { data: semesterResults },
    { data: aptitudeScores },
    { data: initialQuestionnaire },
    { data: goalsDeclaration },
    { data: mentorAssignments },
    { data: sessions },
    { data: portfolioRatings },
    { data: backlogRecords },
    { data: extracurricularLog },
    { data: booksReadLog },
    { data: socialWorkLog },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', studentId).single(),
    supabase.from('pre_admission_academic_records').select('*').eq('student_id', studentId),
    supabase.from('pre_college_activities').select('*').eq('student_id', studentId),
    supabase.from('btech_sem_records').select('*').eq('student_id', studentId).order('year').order('semester'),
    supabase.from('aptitude_test_scores').select('*').eq('student_id', studentId).order('year').order('semester'),
    supabase.from('initial_questionnaire').select('*').eq('student_id', studentId).maybeSingle(),
    supabase.from('goals_declaration').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('mentor_assignments').select('*').eq('student_id', studentId).order('start_date'),
    supabase.from('sessions').select('*').eq('student_id', studentId).order('session_date'),
    supabase.from('portfolio_ratings').select('*').eq('student_id', studentId).order('semester_label'),
    supabase.from('backlog_records').select('*').eq('student_id', studentId),
    supabase.from('extracurricular_log').select('*').eq('student_id', studentId),
    supabase.from('books_read_log').select('*').eq('student_id', studentId),
    supabase.from('social_work_log').select('*').eq('student_id', studentId),
    supabase.from('tasks').select('*').eq('student_id', studentId),
  ])

  const sessionsWithData = await Promise.all(
    (sessions || []).map(async (session: any) => {
      const [
        { data: courseRatings },
        { data: facilityFeedback },
        { data: impactAssessment },
        { data: attendance },
        { data: careerCounselling },
        { data: psychometricTest },
      ] = await Promise.all([
        supabase.from('session_course_ratings').select('*').eq('session_id', session.id),
        supabase.from('session_facility_feedback').select('*').eq('session_id', session.id).maybeSingle(),
        supabase.from('session_impact_assessment').select('*').eq('session_id', session.id).maybeSingle(),
        supabase.from('fortnightly_attendance').select('*').eq('session_id', session.id).order('fortnight_number'),
        supabase.from('career_counselling').select('*').eq('session_id', session.id).maybeSingle(),
        supabase.from('psychometric_test').select('*').eq('session_id', session.id).maybeSingle(),
      ])
      return { ...session, courseRatings: courseRatings || [], facilityFeedback, impactAssessment, attendance: attendance || [], careerCounselling, psychometricTest }
    })
  )

  return {
    profile: profile || {},
    preAdmissionRecords: preAdmissionRecords || [],
    preCollegeActivities: preCollegeActivities || [],
    semesterResults: semesterResults || [],
    aptitudeScores: aptitudeScores || [],
    initialQuestionnaire: initialQuestionnaire || null,
    goalsDeclaration: goalsDeclaration || null,
    mentorAssignments: mentorAssignments || [],
    sessions: sessionsWithData,
    portfolioRatings: portfolioRatings || [],
    backlogRecords: backlogRecords || [],
    extracurricularLog: extracurricularLog || [],
    booksReadLog: booksReadLog || [],
    socialWorkLog: socialWorkLog || [],
    tasks: tasks || [],
  }
}
