export interface InsightContext {
  // Academic
  subject_stats: {
    subject: string
    current_score: number | null
    previous_score: number | null
    grade: string | null
    attendance_percentage: number | null
    is_goal_related: boolean
    is_prerequisite_for: string[]
  }[]

  // SGPA
  sgpa_history: {
    semester: number
    sgpa: number
  }[]
  active_backlogs: { subject: string; semester: number }[]
  cleared_backlogs: { subject: string; semester: number }[]

  // Attendance
  overall_attendance: number | null
  attendance_trend: 'improving' | 'stable' | 'declining' | null
  last_month_attendance: number | null
  low_attendance_subjects: string[]

  // Tasks
  overdue_tasks: { task: string; due_by: string }[]
  task_completion_history: number[]  // percentage per recent session, oldest first
  total_tasks_assigned: number
  total_tasks_completed: number

  // Behavioral
  tone_history: string[]   // e.g. ['anxious','anxious','neutral','anxious'] oldest first
  engagement_history: string[]  // e.g. ['low','low','medium','high'] oldest first

  // Goals
  goals: {
    title: string
    related_subjects: string[]
    prerequisite_gaps: { subject: string; required_for: string; target_semester: number }[]
  }[]

  // Risk flags
  recurring_risk_flags: {
    flag_code: string
    description: string
    severity: string
    occurrence_count: number
    first_seen: string
    resolved: boolean
  }[]
}
