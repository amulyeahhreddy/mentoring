import { createAdminClient } from '@/lib/supabase/admin'
import { CAREER_PATHWAYS } from '@/lib/session-utils'

const SKILL_FIELDS: { field: string; label: string }[] = [
  { field: 'skill_problem_solving', label: 'Problem Solving' },
  { field: 'skill_communication', label: 'Communication' },
  { field: 'skill_mathematics', label: 'Mathematics' },
  { field: 'skill_inquisitiveness', label: 'Inquisitiveness' },
  { field: 'skill_learning', label: 'Learning' },
  { field: 'skill_innovation', label: 'Innovation' },
]

const WEAK_SKILL_RATINGS = new Set(['Satisfactory', 'Unable to Judge'])

type BacklogRecord = {
  course_name?: string
  course_code?: string
  year?: number
  semester?: number
  attempt_1_result?: string | null
  attempt_2_result?: string | null
  attempt_3_result?: string | null
  attempt_4_result?: string | null
}

function isActiveBacklog(record: BacklogRecord): boolean {
  const attempts = [
    record.attempt_4_result,
    record.attempt_3_result,
    record.attempt_2_result,
    record.attempt_1_result,
  ]
  const latest = attempts.find((a) => a && a !== '')
  if (!latest) return true
  return latest !== 'Pass'
}

function backlogAttemptInfo(record: BacklogRecord): { count: number; latest: string } {
  const ordered = [
    record.attempt_4_result,
    record.attempt_3_result,
    record.attempt_2_result,
    record.attempt_1_result,
  ]
  const withResults = ordered.filter((a) => a && a !== '') as string[]
  const latest = withResults[0]
  return {
    count: withResults.length,
    latest: latest || 'Not attempted',
  }
}

function formatActiveBacklogsBlock(records: BacklogRecord[]): string | null {
  const active = records.filter(isActiveBacklog)
  if (active.length === 0) return null

  const lines = active.map((r) => {
    const { count, latest } = backlogAttemptInfo(r)
    const name = r.course_name?.trim() || 'Unknown course'
    const code = r.course_code?.trim() || '—'
    const year = r.year ?? '?'
    const sem = r.semester ?? '?'
    return `${name} (${code}) - Year ${year} Sem ${sem} - ${count} attempts so far, latest result: ${latest}`
  })

  return `ACTIVE BACKLOGS:\n${lines.join('\n')}`
}

function pathwayAwareLabel(row: Record<string, unknown>, key: string): string {
  const aware = row[`${key}_aware`]
  if (aware === true) return 'Aware'
  return 'Not discussed'
}

function formatCareerCounsellingBlock(row: Record<string, unknown> | null): string | null {
  if (!row) return null

  const jobDetails =
    (typeof row.job_details === 'string' && row.job_details.trim()) ||
    (typeof row.job_description === 'string' && row.job_description.trim()) ||
    ''
  const jobAware = row.job_aware === true

  const lines = CAREER_PATHWAYS.map((p) => {
    if (p.key === 'job') {
      const jobLine =
        jobAware && jobDetails
          ? `Identified: ${jobDetails}`
          : 'Not identified'
      return `- Job: ${jobLine}`
    }
    return `- ${p.label}: ${pathwayAwareLabel(row, p.key)}`
  })

  return `CAREER COUNSELLING STATUS:\n${lines.join('\n')}`
}

function formatQuestionnaireBlock(q: Record<string, unknown> | null): string | null {
  if (!q || !q.submitted_at) return null

  const flagLines: string[] = []

  if (q.transport_inconvenience === true) {
    flagLines.push('- Transport inconvenience: Yes')
  }

  const health =
    typeof q.health_issues === 'string' ? q.health_issues.trim() : ''
  if (health) {
    flagLines.push(`- Health issues: ${health}`)
  }

  if (q.home_study_environment_ok === false) {
    flagLines.push('- Home study environment concern: Yes')
  }

  if (q.ragging_experienced === true) {
    flagLines.push('- Ragging experienced: Yes')
  }

  const weakSkills = SKILL_FIELDS.filter(({ field }) =>
    WEAK_SKILL_RATINGS.has(String(q[field] ?? ''))
  ).map(({ label }) => label)

  if (weakSkills.length > 0) {
    flagLines.push(`- Self-assessed weak areas: ${weakSkills.join(', ')}`)
  }

  if (flagLines.length === 0) return null

  return `STUDENT BACKGROUND FLAGS:\n${flagLines.join('\n')}`
}

function formatGoalsBlock(goals: Record<string, unknown> | null): string | null {
  if (!goals) return null

  if (goals.mentee_signed === true) {
    const parts = [
      `STUDENT GOALS:`,
      `- Academic: ${String(goals.academic_goal ?? '').trim() || '—'}`,
      `- Personal: ${String(goals.personal_goal ?? '').trim() || '—'}`,
      `- This year's goals: ${[goals.college_year_goal_1, goals.college_year_goal_2]
        .map((g) => String(g ?? '').trim())
        .filter(Boolean)
        .join(', ') || '—'}`,
    ]
    return parts.join('\n')
  }

  return 'Note: Student has not yet signed their goals declaration.'
}

function formatPsychometricBlock(tests: { test_number: number }[]): string | null {
  const completed = new Set(tests.map((t) => t.test_number))
  const pending = [1, 2, 3].filter((n) => !completed.has(n))
  if (pending.length === 0) return null
  return `PSYCHOMETRIC TESTS PENDING: ${pending.map((n) => `Test ${n}`).join(', ')}`
}

/**
 * Fetches Phase 1 student records and returns formatted prompt blocks.
 * Omits any block when data is missing; unsigned goals emit a note only when a record exists.
 */
export async function buildBriefingPhase1Context(
  studentId: string
): Promise<string> {
  const admin = createAdminClient()

  const [
    { data: backlogRows },
    { data: careerRows },
    { data: questionnaire },
    { data: goals },
    { data: psychometricRows },
  ] = await Promise.all([
    admin.from('backlog_records').select('*').eq('student_id', studentId),
    admin
      .from('career_counselling')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1),
    admin
      .from('initial_questionnaire')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle(),
    admin
      .from('goals_declaration')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle(),
    admin
      .from('psychometric_test')
      .select('test_number')
      .eq('student_id', studentId),
  ])

  const blocks: string[] = []

  const backlogsBlock = formatActiveBacklogsBlock((backlogRows || []) as BacklogRecord[])
  if (backlogsBlock) blocks.push(backlogsBlock)

  const careerRow =
    Array.isArray(careerRows) && careerRows.length > 0 ? careerRows[0] : null
  const careerBlock = formatCareerCounsellingBlock(
    careerRow as Record<string, unknown> | null
  )
  if (careerBlock) blocks.push(careerBlock)

  const questionnaireBlock = formatQuestionnaireBlock(
    questionnaire as Record<string, unknown> | null
  )
  if (questionnaireBlock) blocks.push(questionnaireBlock)

  const goalsBlock = formatGoalsBlock(goals as Record<string, unknown> | null)
  if (goalsBlock) blocks.push(goalsBlock)

  const psychometricBlock = formatPsychometricBlock(
    (psychometricRows || []) as { test_number: number }[]
  )
  if (psychometricBlock) blocks.push(psychometricBlock)

  return blocks.join('\n\n')
}
