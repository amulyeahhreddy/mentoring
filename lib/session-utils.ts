export type SessionWorkflowStatus =
  | 'draft'
  | 'mentor_review'
  | 'student_acknowledged'
  | 'coordinator_approved'
  | 'completed'

export const SESSION_WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'mentor_review', label: 'Mentor Review' },
  { key: 'student_acknowledged', label: 'Student Acknowledged' },
  { key: 'coordinator_approved', label: 'Coordinator Approved' },
] as const

export function getSessionStatusBadge(session: {
  session_status?: string | null
  status?: string | null
}): { label: string; className: string } {
  const ss = (session.session_status || session.status || 'draft') as string
  switch (ss) {
    case 'draft':
      return { label: 'Draft', className: 'bg-[#f4f4f6] text-[#52525e]' }
    case 'mentor_review':
      return { label: 'Pending Student', className: 'bg-[#eef1fe] text-[#3548c9]' }
    case 'student_acknowledged':
    case 'completed':
      return { label: 'Complete', className: 'bg-[#ecfdf5] text-[#065f46]' }
    default:
      return { label: 'Draft', className: 'bg-[#f4f4f6] text-[#52525e]' }
  }
}

export function workflowStepIndex(status: string): number {
  const idx = SESSION_WORKFLOW_STEPS.findIndex((s) => s.key === status)
  if (status === 'completed') return SESSION_WORKFLOW_STEPS.length
  return idx >= 0 ? idx : 0
}

export function showCareerCounselling(sessionNumber: number, semester: number | null | undefined): boolean {
  const sem = semester ?? 1
  if (sem === 1 && sessionNumber >= 3) return true
  if (sem > 1) return true
  return false
}

export const TOPICS_ADDRESSED_ITEMS = [
  { key: 'attendance_importance', label: 'Importance of Attendance and exam implications' },
  { key: 'mid_exam_importance', label: 'Importance of Mid Examinations and First Class/Distinction risk' },
  { key: 'assignment_importance', label: 'Importance of Assignment submission' },
  { key: 'lab_importance', label: 'Importance of Laboratory exercises' },
  { key: 'classroom_participation', label: 'Importance of participation in classroom activities' },
  { key: 'engineering_degree_importance', label: 'Importance of Engineering Degree and higher education pathways' },
  { key: 'career_skills_importance', label: 'Importance of Career Skills (Verbal, Writing, Programming, Logical Reasoning)' },
  { key: 'self_motivation_importance', label: 'Importance of Self-Motivation' },
] as const

export const IMPACT_SKILLS = [
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'communication', label: 'Communication' },
  { key: 'mathematics', label: 'Mathematics' },
  { key: 'inquisitiveness', label: 'Inquisitiveness' },
  { key: 'learning', label: 'Learning' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'innovation', label: 'Innovation' },
] as const

export const TRANSFORMATION_QUESTIONS = [
  { key: 'marks_improvement', label: 'Is there any improvement in marks scored?' },
  { key: 'attendance_improvement', label: 'Improvement in attendance percentage?' },
  { key: 'coursework_relevance', label: 'Did the mentee understand relevance of coursework?' },
  { key: 'classroom_participation', label: 'Understand importance of classroom participation?' },
  { key: 'lab_relevance', label: 'Understand relevance of laboratory exercises?' },
  { key: 'self_motivation', label: 'Understand importance of Self-Motivation?' },
  { key: 'attitude_change', label: 'Perceptible change in attitude?' },
  { key: 'criticism_sensitivity', label: 'Is the mentee sensitive to constructive criticism?' },
  { key: 'motivation_confidence', label: 'Change in motivation and confidence level?' },
] as const

export const RADIO_OPTIONS = ['Yes', 'No', 'Insignificant'] as const

export const CAREER_PATHWAYS = [
  { key: 'ms_usa', label: 'MS USA' },
  { key: 'ms_other', label: 'MS Other Countries' },
  { key: 'higher_studies_india', label: 'Higher Studies India' },
  { key: 'mtech', label: 'MTech' },
  { key: 'mba', label: 'MBA' },
  { key: 'job', label: 'Job' },
] as const
