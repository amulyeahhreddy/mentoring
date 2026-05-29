'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { detectClaims } from '@/lib/utils/detectClaims'
import { InsightContext } from '@/lib/types/insightContext'
import { getSessionStatusBadge } from '@/lib/session-utils'

interface BriefingModeProps {
  selectedStudent: any;
  mentorId: string;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export default function BriefingMode({ selectedStudent, mentorId, onNewSession, onSelectSession }: BriefingModeProps) {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [tests, setTests] = useState<any[]>([])
  const [semRecords, setSemRecords] = useState<any[]>([])
  const [profileData, setProfileData] = useState<any>(null)
  const [exporting, setExporting] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [phase1Context, setPhase1Context] = useState('')
  const [aiBriefingLoading, setAiBriefingLoading] = useState(false)
  const [presessionRedFlags, setPresessionRedFlags] = useState<any[]>([])
  const [presessionQuestions, setPresessionQuestions] = useState<any[]>([])
  const [fortnightlyAttendance, setFortnightlyAttendance] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const studentId = selectedStudent?.id
        if (!studentId) return

        const [
          { data: sessionsData },
          { data: testsData },
          { data: semRecordsData },
          { data: profileDataResponse },
          { data: fortnightlyData }
        ] = await Promise.all([
          supabase.from('sessions').select('id, session_number, session_date, status, session_status, structured_input, ai_output, created_at').eq('student_id', studentId).order('session_date', { ascending: false }),
          supabase.from('tests').select('id, text, assigned_to, due_by, status, created_at').eq('student_id', studentId),
          supabase.from('btech_sem_records').select('id, year, semester, sgpa, cgpa, credits_earned, backlogs').eq('student_id', studentId).order('year', { ascending: true }).order('semester', { ascending: true }),
          supabase.from('student_profiles').select('data').eq('student_id', studentId).single(),
          supabase.from('fortnightly_attendance').select('attendance_percentage, fortnight_number').eq('student_id', studentId).order('fortnight_number', { ascending: false }).limit(8)
        ])

        if (!isMounted) return

        const sessionsList = sessionsData || []
        const testsList = testsData || []
        const semList = semRecordsData || []
        const profilePayload = profileDataResponse?.data || {}

        setSessions(sessionsList)
        setTests(testsList)
        setSemRecords(semList)
        setProfileData(profilePayload)
        setFortnightlyAttendance(fortnightlyData || [])

        const phase1Res = await fetch(`/api/students/${studentId}/briefing-context`)
        if (phase1Res.ok) {
          const { context } = await phase1Res.json()
          if (isMounted) setPhase1Context(typeof context === 'string' ? context : '')
        }

        if (isMounted) setAiBriefingLoading(true)
        try {
          const pendingTasks = testsList.filter((t: { status?: string }) => t.status !== 'completed')
          const overallAttendance =
            fortnightlyAttendance.length > 0
              ? fortnightlyAttendance[0]?.attendance_percentage
              : null

          const response = await fetch('/api/session/pre-session-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_id: studentId,
              profile: { data: profilePayload, goals: profilePayload?.goals },
              sem_records: semList,
              pending_tasks: pendingTasks,
              prev_suggested: [],
              carry_forward: [],
              sessions: sessionsList,
              tone_history: sessionsList
                .slice(0, 4)
                .map((s: { ai_output?: { emotional_behavioral?: { overall_tone?: string } } }) =>
                  s.ai_output?.emotional_behavioral?.overall_tone
                )
                .filter(Boolean)
                .reverse(),
              engagement_history: sessionsList
                .slice(0, 4)
                .map((s: { ai_output?: { emotional_behavioral?: { engagement_level?: string } } }) =>
                  s.ai_output?.emotional_behavioral?.engagement_level
                )
                .filter(Boolean)
                .reverse(),
              overall_attendance: overallAttendance,
            }),
          })

          if (response.ok && isMounted) {
            const data = await response.json()
            const questionsList = data.questions || (Array.isArray(data) ? data : [])
            setPresessionRedFlags(data.red_flags || [])
            setPresessionQuestions(
              questionsList.map((q: { text?: string; reason?: string }, i: number) => ({
                ...q,
                id: `briefing-q-${i}`,
              }))
            )
          }
        } catch (briefingErr) {
          console.warn('AI briefing generation unavailable:', briefingErr)
        } finally {
          if (isMounted) setAiBriefingLoading(false)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => { isMounted = false }
  }, [selectedStudent])

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? null : id)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}/export`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Diary_${selectedStudent.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      alert('Export failed — try again')
    } finally {
      setExporting(false)
    }
  }

  const completeTask = async (taskId: string) => {
    setTests(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t))
    await supabase.from('tests').update({ status: 'completed' }).eq('id', taskId)
  }

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-800"></div>
          <div className="space-y-2">
            <div className="w-48 h-5 bg-gray-800 rounded"></div>
            <div className="w-32 h-4 bg-gray-800 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-gray-800 rounded"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
        </div>
        <div className="h-40 bg-gray-800 rounded"></div>
      </div>
    )
  }

  // --- DERIVE METRICS ---
  const latestSession = sessions[0] || {}
  const latestAttendance = fortnightlyAttendance.length > 0 ? fortnightlyAttendance[0]?.attendance_percentage : null
  const prevAttendance = fortnightlyAttendance.length > 1 ? fortnightlyAttendance[1]?.attendance_percentage : null
  
  let attendanceTrend = { text: '— Stable', color: 'text-gray-500' }
  if (latestAttendance != null && prevAttendance != null) {
    const diff = latestAttendance - prevAttendance
    if (diff < -3) attendanceTrend = { text: `↓ Down ${Math.abs(diff).toFixed(1)}% this fortnight`, color: 'text-red-500' }
    else if (diff > 3) attendanceTrend = { text: `↑ Up ${diff.toFixed(1)}% this fortnight`, color: 'text-green-500' }
  }

  const recordsWithCgpa = semRecords.filter(r => r.cgpa != null)
  const latestCgpaRecord = recordsWithCgpa.length > 0 ? recordsWithCgpa[recordsWithCgpa.length - 1] : null
  const prevCgpaRecord = recordsWithCgpa.length > 1 ? recordsWithCgpa[recordsWithCgpa.length - 2] : null
  const latestCgpa = latestCgpaRecord?.cgpa
  const prevCgpa = prevCgpaRecord?.cgpa

  let cgpaTrend = { text: prevCgpa ? `Was ${prevCgpa} last sem` : '—', color: 'text-gray-500' }
  if (latestCgpa != null && prevCgpa != null) {
    if (latestCgpa - prevCgpa < -0.3) cgpaTrend = { text: `Was ${prevCgpa} last sem`, color: 'text-amber-500' }
  }

  const latestRecord = semRecords.length > 0 ? semRecords[semRecords.length - 1] : null
  const backlogs = latestRecord?.backlogs
  let backlogsText = '—'
  let backlogsColor = 'text-white'
  let backlogsSub = { text: 'No data', color: 'text-gray-500' }
  if (backlogs != null) {
    backlogsText = backlogs.toString()
    if (backlogs > 0) {
      backlogsColor = 'text-red-500'
      backlogsSub = { text: `${backlogs} active`, color: 'text-red-500' }
    } else {
      backlogsColor = 'text-green-500'
      backlogsSub = { text: 'None', color: 'text-green-500' }
    }
  }

  const pendingTasks = tests.filter(t => t.status !== 'completed')
  const overdueTasks = pendingTasks.filter(t => t.due_by && new Date(t.due_by) < new Date())
  const openTasksCount = pendingTasks.length
  let openTasksSub = { text: 'All on track', color: 'text-green-500' }
  if (overdueTasks.length > 0) {
    openTasksSub = { text: `${overdueTasks.length} overdue`, color: 'text-red-500' }
  }

  const flags = []
  if (latestAttendance != null && latestAttendance < 75) {
    flags.push({ severity: 'critical', desc: 'Attendance below minimum threshold — parent contact required' })
  }
  if (latestCgpa != null && prevCgpa != null && (latestCgpa - prevCgpa < -0.3)) {
    flags.push({ severity: 'high', desc: `Declining CGPA — dropped ${(prevCgpa - latestCgpa).toFixed(2)} points since last semester` })
  }
  if (backlogs != null && backlogs > 0) {
    flags.push({ severity: 'high', desc: `Active backlogs — ${backlogs} subject(s) not cleared` })
  }
  if (overdueTasks.length > 0) {
    flags.push({ severity: 'medium', desc: `${overdueTasks.length} overdue task(s) — follow up required` })
  }

  const getInitials = (name: string) => {
    if (!name) return '??'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return (name[0] + (name[1] || '')).toUpperCase()
  }

  const ctx: InsightContext = {
    subject_stats: [],
    sgpa_history: semRecords.map(r => ({ semester: r.semester, sgpa: r.sgpa })),
    active_backlogs: latestRecord?.backlogs > 0 
      ? [{ subject: `${latestRecord.backlogs} Active backlogs`, semester: latestRecord.semester }] 
      : [],
    cleared_backlogs: [],
    overall_attendance: latestAttendance,
    attendance_trend: attendanceTrend.text.includes('Down') ? 'declining' : attendanceTrend.text.includes('Up') ? 'improving' : 'stable',
    last_month_attendance: fortnightlyAttendance.length > 0 
      ? fortnightlyAttendance[fortnightlyAttendance.length - 1]?.attendance_percentage 
      : null,
    low_attendance_subjects: [],
    overdue_tasks: overdueTasks.map(t => ({ task: t.text, due_by: t.due_by })),
    task_completion_history: [
      tests.length > 0 ? (tests.filter(t => t.status === 'completed').length / tests.length) * 100 : 0
    ],
    total_tasks_assigned: tests.length,
    total_tasks_completed: tests.filter(t => t.status === 'completed').length,
    tone_history: sessions.slice(0, 4).map(s => s.ai_output?.emotional_behavioral?.overall_tone).filter(Boolean).reverse(),
    engagement_history: sessions.slice(0, 4).map(s => s.ai_output?.emotional_behavioral?.engagement_level).filter(Boolean).reverse(),
    goals: [
      profileData?.goals?.academic ? { title: `Academic: ${profileData.goals.academic}`, related_subjects: [], prerequisite_gaps: [] } : null,
      profileData?.goals?.personal ? { title: `Personal: ${profileData.goals.personal}`, related_subjects: [], prerequisite_gaps: [] } : null
    ].filter(Boolean) as any[],
    recurring_risk_flags: flags.map(f => ({
      flag_code: 'RISK',
      description: f.desc,
      severity: f.severity,
      occurrence_count: 1,
      first_seen: '',
      resolved: false
    }))
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f4f6] text-[#111116] relative font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* IDENTITY HEADER */}
        <div className="bg-white border-b border-[#e4e4e9] px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-white font-semibold text-[15px] shrink-0">
              {getInitials(selectedStudent.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[17px] font-semibold text-[#111116]">{selectedStudent.name}</h2>
                <span className="bg-[#eef1fe] text-[#3548c9] text-[11px] font-medium px-2 py-0.5 rounded-full">
                  Session {sessions.length}
                </span>
              </div>
              <p className="text-[13px] text-[#52525e]">
                {selectedStudent.email} &middot; B.Tech
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExport}
              disabled={exporting}
              className="bg-white border border-[#d1d1db] hover:bg-[#f8f8fb] text-[#111116] rounded-lg px-4 py-2 text-[13px] font-medium transition-all flex items-center gap-2"
            >
              {exporting ? 'Exporting...' : 'Export diary'}
            </button>
            <button 
              onClick={onNewSession}
              className="bg-[#4f6ef7] hover:bg-[#3d5ce8] text-white rounded-lg px-4 py-2 text-[13px] font-medium transition-all"
            >
              New session +
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8 max-w-6xl mx-auto">
          {/* METRIC CARDS */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Attendance', value: latestAttendance != null ? `${latestAttendance}%` : '—', trend: attendanceTrend, color: latestAttendance != null && latestAttendance < 75 ? 'text-[#dc2626]' : 'text-[#059669]' },
              { label: 'Current CGPA', value: latestCgpa != null ? latestCgpa : '—', trend: cgpaTrend, color: 'text-[#111116]' },
              { label: 'Backlogs', value: backlogsText, trend: backlogsSub, color: backlogs > 0 ? 'text-[#dc2626]' : 'text-[#059669]' },
              { label: 'Open Tasks', value: openTasksCount, trend: openTasksSub, color: overdueTasks.length > 0 ? 'text-[#dc2626]' : 'text-[#111116]' }
            ].map((m, i) => (
              <div key={i} className="bg-white border border-[#e4e4e9] rounded-xl shadow-sm p-5">
                <div className="text-[11px] uppercase tracking-widest text-[#9090a0] font-medium mb-3">{m.label}</div>
                <div className={`text-[26px] font-semibold tabular-nums mb-1 ${m.color}`}>{m.value}</div>
                <div className={`text-[12px] font-medium ${m.trend.color.includes('red') ? 'text-[#dc2626]' : m.trend.color.includes('green') ? 'text-[#059669]' : 'text-[#9090a0]'}`}>
                  {m.trend.text}
                </div>
              </div>
            ))}
          </div>

          {/* AI BRIEFING (Phase 1 context + Ollama pre-session questions) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] uppercase tracking-widest text-[#9090a0] font-medium">AI briefing</h3>
              {aiBriefingLoading && (
                <span className="text-[11px] text-[#4f6ef7] animate-pulse">Generating…</span>
              )}
            </div>
            {phase1Context ? (
              <details className="bg-white border border-[#e4e4e9] rounded-xl shadow-sm">
                <summary className="px-4 py-3 text-[13px] font-medium cursor-pointer text-[#52525e]">
                  Phase 1 student context (included in AI prompt)
                </summary>
                <pre className="px-4 pb-4 text-[11px] text-[#52525e] whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                  {phase1Context}
                </pre>
              </details>
            ) : null}
            {!aiBriefingLoading && presessionQuestions.length > 0 && (
              <div className="bg-white border border-[#e4e4e9] rounded-xl shadow-sm p-4 space-y-3">
                {presessionRedFlags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase text-[#9090a0]">AI red flags</p>
                    {presessionRedFlags.map((flag: { severity?: string; finding?: string }, i: number) => (
                      <p key={i} className="text-[13px] text-[#111116]">
                        <span className="font-semibold text-[#dc2626]">{flag.severity}: </span>
                        {flag.finding}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-[11px] font-bold uppercase text-[#9090a0]">Suggested questions</p>
                <ul className="space-y-2">
                  {presessionQuestions.slice(0, 6).map((q: { id?: string; text?: string; reason?: string }) => (
                    <li key={q.id} className="text-[13px] text-[#52525e]">
                      <span className="font-medium text-[#111116]">{q.text}</span>
                      {q.reason ? <span className="block text-[12px] text-[#9090a0] mt-0.5">{q.reason}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* RISK FLAGS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] uppercase tracking-widest text-[#9090a0] font-medium">Risk flags</h3>
              <span className="bg-[#fef2f2] text-[#dc2626] text-[11px] font-medium px-2 py-0.5 rounded-full">{flags.length}</span>
            </div>
            <div className="grid gap-3">
              {flags.length === 0 ? (
                <div className="bg-white border border-[#e4e4e9] p-4 rounded-xl shadow-sm flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#059669]" />
                  <span className="text-[13px] text-[#059669] font-medium">No active risk flags</span>
                </div>
              ) : (
                flags.map((flag, i) => (
                  <div key={i} className={`bg-white border border-[#e4e4e9] rounded-xl shadow-sm p-4 border-l-[3px] flex items-center gap-4 ${
                    flag.severity === 'critical' ? 'border-l-[#dc2626]' : flag.severity === 'high' ? 'border-l-[#dc2626]' : 'border-l-[#d97706]'
                  }`}>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      flag.severity === 'critical' || flag.severity === 'high' ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-[#fffbeb] text-[#92400e]'
                    }`}>
                      {flag.severity}
                    </span>
                    <p className="text-[13px] text-[#111116] font-medium">{flag.desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* OPEN TASKS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] uppercase tracking-widest text-[#9090a0] font-medium">Open tasks</h3>
              <span className="bg-[#f8f8fb] text-[#52525e] text-[11px] font-medium px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
            </div>
            <div className="space-y-2">
              {tests.length === 0 ? (
                <p className="text-[13px] text-[#9090a0] italic">No tasks assigned</p>
              ) : (
                tests.map(task => {
                  const isCompleted = task.status === 'completed';
                  const isOverdue = !isCompleted && task.due_by && new Date(task.due_by) < new Date();
                  return (
                    <div key={task.id} className="bg-white border border-[#e4e4e9] rounded-xl shadow-sm p-4 flex items-center gap-4 group">
                      <button 
                        onClick={() => !isCompleted && completeTask(task.id)}
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          isCompleted ? 'bg-[#059669] border-[#059669]' : 'border-[#d1d1db] hover:border-[#4f6ef7]'
                        }`}
                      >
                        {isCompleted && <span className="text-white text-[10px]">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium truncate ${isCompleted ? 'text-[#9090a0] line-through' : 'text-[#111116]'}`}>
                          {task.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-[#9090a0]">
                          Due {task.due_by ? new Date(task.due_by).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </span>
                        <span className="bg-[#f8f8fb] text-[#52525e] text-[11px] font-medium px-2 py-0.5 rounded-full">
                          {task.assigned_to}
                        </span>
                        {isOverdue && !isCompleted && (
                          <span className="bg-[#fef2f2] text-[#dc2626] text-[11px] font-medium px-2 py-0.5 rounded-full">Overdue</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SESSION HISTORY */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-widest text-[#9090a0] font-medium">Session history</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(session => {
                const isExpanded = expandedSession === session.id;
                const duration = session.structured_input?.session_info?.duration_minutes;
                const category = session.structured_input?.session_info?.session_category;
                const summary = session.ai_output?.summary || '';
                const displaySummary = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
                const academicConcerns = (session.structured_input?.discussion?.academic_concerns || []).slice(0, 2);
                const personalConcerns = (session.structured_input?.discussion?.personal_concerns || []).slice(0, 1);
                const allConcerns = [...academicConcerns, ...personalConcerns];
                const sentiment = session.ai_output?.student_state?.sentiment?.toLowerCase();
                const taskCount = tests.filter(t => t.session_id === session.id).length;
                const statusBadge = getSessionStatusBadge(session);
                const isDraft = (session.session_status || session.status) === 'draft';

                return (
                  <div 
                    key={session.id} 
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    className={`bg-white border border-[#e4e4e9] rounded-xl p-5 shadow-sm transition-all flex flex-col gap-3 cursor-pointer hover:border-[#4f6ef7] ${
                      isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-3' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[14px] font-bold text-[#111116]">Session {session.session_number}</span>
                          {sentiment && (
                            <div className={`w-2 h-2 rounded-full ${sentiment.includes('pos') ? 'bg-[#059669]' : sentiment.includes('neg') ? 'bg-[#dc2626]' : 'bg-[#d97706]'}`} title={`Sentiment: ${sentiment}`} />
                          )}
                        </div>
                        <div className="text-[12px] text-[#9090a0]">
                          {session.session_date ? new Date(session.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                      </div>
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 pt-4 border-t border-[#e4e4e9] space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-6">
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#9090a0] font-bold block mb-1">Duration</span>
                            <span className="text-[13px] text-[#111116] font-medium">{duration ? `${duration} min` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#9090a0] font-bold block mb-1">Category</span>
                            <span className="text-[13px] text-[#111116] font-medium capitalize">{category || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#9090a0] font-bold block mb-1">Tasks Assigned</span>
                            <span className="text-[13px] text-[#111116] font-medium">{taskCount}</span>
                          </div>
                        </div>

                        {displaySummary && (
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#9090a0] font-bold block mb-1">Summary</span>
                            <p className="text-[13px] text-[#52525e] leading-relaxed">{displaySummary}</p>
                          </div>
                        )}

                        {allConcerns.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#9090a0] font-bold block mb-2">Key Concerns</span>
                            <ul className="list-disc list-inside text-[13px] text-[#52525e] space-y-1">
                              {allConcerns.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-2 flex flex-wrap gap-4">
                          {isDraft && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSession(session.id);
                              }}
                              className="text-[13px] font-bold text-[#4f6ef7] hover:underline flex items-center gap-1"
                            >
                              Resume session &rarr;
                            </button>
                          )}
                          <Link
                            href={`/session/${session.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[13px] font-bold text-[#52525e] hover:underline"
                          >
                            View session &rarr;
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* COLLAPSIBLE SECTIONS */}
          <div className="space-y-3">
            {[
              { id: 'identity', label: 'Identity & family details', content: (
                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                  {[
                    { label: 'Blood group', value: profileData?.blood_group },
                    { label: 'Mobile', value: profileData?.mobile },
                    { label: 'Email', value: selectedStudent.email },
                    { label: 'Address', value: profileData?.address },
                    { label: 'Father name & occ.', value: `${profileData?.father_name || '—'} (${profileData?.father_occupation || '—'})` },
                    { label: 'Mother name & occ.', value: `${profileData?.mother_name || '—'} (${profileData?.mother_occupation || '—'})` },
                  ].map((item, i) => (
                    <div key={i}>
                      <span className="text-[11px] text-[#9090a0] uppercase tracking-wider block mb-1">{item.label}</span>
                      <span className="text-[13px] text-[#111116] font-medium">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>
              )},
              { id: 'academic', label: 'Full academic record', content: (
                <div className="overflow-hidden border border-[#e4e4e9] rounded-lg">
                  <table className="w-full text-[13px] text-left">
                    <thead className="bg-[#f8f8fb] text-[#52525e] border-b border-[#e4e4e9]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Year/Sem</th>
                        <th className="px-4 py-3 font-semibold">SGPA</th>
                        <th className="px-4 py-3 font-semibold">CGPA</th>
                        <th className="px-4 py-3 font-semibold">Credits</th>
                        <th className="px-4 py-3 font-semibold">Backlogs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e9]">
                      {semRecords.map((r, idx) => (
                        <tr key={idx} className="hover:bg-[#f8f8fb] transition-colors">
                          <td className="px-4 py-3 font-medium">{r.year} Year {r.semester} Sem</td>
                          <td className="px-4 py-3">{r.sgpa ?? '—'}</td>
                          <td className="px-4 py-3 font-semibold">{r.cgpa ?? '—'}</td>
                          <td className="px-4 py-3">{r.credits_earned ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={r.backlogs > 0 ? 'text-[#dc2626] font-semibold' : 'text-[#059669]'}>
                              {r.backlogs ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )},
              { id: 'goals', label: 'Goals & self-assessment', content: (
                <div className="space-y-6">
                  <div>
                    <span className="text-[11px] text-[#9090a0] uppercase tracking-wider block mb-2">Academic Goal</span>
                    <p className="text-[13px] text-[#111116] bg-[#f8f8fb] p-3 rounded-lg border border-[#e4e4e9] leading-relaxed">
                      {profileData?.goals?.academic ? detectClaims(profileData.goals.academic, ctx) : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#9090a0] uppercase tracking-wider block mb-2">Personal Goal</span>
                    <p className="text-[13px] text-[#111116] bg-[#f8f8fb] p-3 rounded-lg border border-[#e4e4e9] leading-relaxed">
                      {profileData?.goals?.personal ? detectClaims(profileData.goals.personal, ctx) : 'Not specified'}
                    </p>
                  </div>
                </div>
              )}
            ].map(section => (
              <div key={section.id} className="bg-white border border-[#e4e4e9] rounded-xl shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-[#f8f8fb] transition-all"
                >
                  <span className="text-[14px] font-semibold text-[#111116]">{section.label}</span>
                  <span className={`text-[#9090a0] transition-transform ${expandedSection === section.id ? 'rotate-180' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 10 13 14 9"></polyline></svg>
                  </span>
                </button>
                {expandedSection === section.id && (
                  <div className="p-6 border-t border-[#e4e4e9] bg-white animate-in slide-in-from-top-1 duration-200">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="bg-white border-t border-[#e4e4e9] p-4 flex items-center justify-between px-8 shadow-[0_-1px_3px_rgba(0,0,0,0.06)] shrink-0">
        <p className="text-[13px] text-[#52525e]">Mentoring Diary Record &middot; Full History</p>
        <button 
          onClick={handleExport}
          className="bg-white border border-[#d1d1db] hover:bg-[#f8f8fb] text-[#111116] rounded-lg px-4 py-2 text-[13px] font-medium transition-all"
        >
          {exporting ? 'Generating PDF...' : 'Download Full Record'}
        </button>
      </div>
    </div>
  )
}
