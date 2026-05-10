'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
          { data: profileDataResponse }
        ] = await Promise.all([
          supabase.from('sessions').select('id, session_number, session_date, status, structured_input, ai_output, created_at').eq('student_id', studentId).order('session_date', { ascending: false }),
          supabase.from('tests').select('id, text, assigned_to, due_by, status, created_at').eq('student_id', studentId),
          supabase.from('btech_sem_records').select('id, year, semester, sgpa, cgpa, credits_earned, backlogs').eq('student_id', studentId).order('year', { ascending: true }).order('semester', { ascending: true }),
          supabase.from('student_profiles').select('data').eq('student_id', studentId).single()
        ])

        if (!isMounted) return

        setSessions(sessionsData || [])
        setTests(testsData || [])
        setSemRecords(semRecordsData || [])
        setProfileData(profileDataResponse?.data || {})
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
  const fortnightlyRecords = latestSession?.structured_input?.attendance?.fortnightly_records || []
  const latestAttendance = fortnightlyRecords.length > 0 ? fortnightlyRecords[fortnightlyRecords.length - 1]?.percentage : null
  const prevAttendance = fortnightlyRecords.length > 1 ? fortnightlyRecords[fortnightlyRecords.length - 2]?.percentage : null
  
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

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white relative">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-8 space-y-10 max-w-5xl mx-auto w-full">
          
          {/* SECTION 1: IDENTITY ROW */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center font-medium text-lg shrink-0">
                {getInitials(selectedStudent.name)}
              </div>
              <div>
                <div className="text-[16px] font-medium">{selectedStudent.name}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">
                  {selectedStudent.email || selectedStudent.id} &middot; B.Tech &middot; Session {sessions.length}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded transition flex items-center gap-2"
              >
                {exporting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Exporting...
                  </span>
                ) : 'Export diary PDF'}
              </button>
              <button 
                onClick={onNewSession}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                New session
              </button>
            </div>
          </div>

          {/* SECTION 2: METRIC CARDS */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1f2937] rounded p-4 border border-gray-800">
              <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-2">Attendance</div>
              <div className="text-[22px] font-medium mb-1">
                {latestAttendance != null ? `${latestAttendance}%` : '—'}
              </div>
              <div className={`text-[11px] ${attendanceTrend.color}`}>{attendanceTrend.text}</div>
            </div>
            <div className="bg-[#1f2937] rounded p-4 border border-gray-800">
              <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-2">Current CGPA</div>
              <div className="text-[22px] font-medium mb-1">
                {latestCgpa != null ? latestCgpa : '—'}
              </div>
              <div className={`text-[11px] ${cgpaTrend.color}`}>{cgpaTrend.text}</div>
            </div>
            <div className="bg-[#1f2937] rounded p-4 border border-gray-800">
              <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-2">Backlogs</div>
              <div className={`text-[22px] font-medium mb-1 ${backlogsColor}`}>
                {backlogsText}
              </div>
              <div className={`text-[11px] ${backlogsSub.color}`}>{backlogsSub.text}</div>
            </div>
            <div className="bg-[#1f2937] rounded p-4 border border-gray-800">
              <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-2">Open Tasks</div>
              <div className="text-[22px] font-medium mb-1">{openTasksCount}</div>
              <div className={`text-[11px] ${openTasksSub.color}`}>{openTasksSub.text}</div>
            </div>
          </div>

          {/* SECTION 3: RISK FLAGS */}
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="text-amber-500">⚠</span> Active risk flags
            </h3>
            <div className="space-y-2">
              {flags.length === 0 ? (
                <div className="text-sm text-green-500 bg-green-500/10 p-3 rounded">
                  No active risk flags ✓
                </div>
              ) : (
                flags.map((flag, i) => {
                  const bg = flag.severity === 'critical' ? 'bg-red-500' : flag.severity === 'high' ? 'bg-amber-500' : 'bg-gray-500';
                  return (
                    <div key={i} className="flex items-center gap-3 bg-gray-900 p-3 rounded border border-gray-800">
                      <div className={`w-2 h-2 rounded-full ${bg} shrink-0`} />
                      <div className="text-[13px] text-gray-300">{flag.desc}</div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* SECTION 4: OPEN TASKS */}
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-500">☑</span> Open tasks
            </h3>
            {pendingTasks.length === 0 ? (
              <div className="text-[13px] text-gray-500 italic">No open tasks</div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map(task => {
                  const isOverdue = task.due_by && new Date(task.due_by) < new Date()
                  return (
                    <div key={task.id} className="flex items-center gap-4 bg-gray-900 p-3 rounded border border-gray-800">
                      <button 
                        onClick={() => completeTask(task.id)}
                        className="w-4 h-4 rounded border border-gray-500 flex items-center justify-center hover:bg-gray-700 transition shrink-0"
                      />
                      <div className="text-[13px] flex-1">{task.text}</div>
                      <div className="text-[11px] text-gray-500">
                        Due {task.due_by ? new Date(task.due_by).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                      </div>
                      <div className="text-[11px] bg-gray-800 px-2 py-1 rounded-full text-gray-400">
                        {task.assigned_to}
                      </div>
                      <div className={`text-[11px] px-2 py-1 rounded ${isOverdue ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {isOverdue ? 'Overdue' : 'Pending'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SECTION 5: SESSION HISTORY */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Session history</h3>
            {sessions.length === 0 ? (
              <div className="text-[13px] text-gray-500 italic">No sessions yet — start a new session</div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {sessions.map(session => (
                  <div 
                    key={session.id} 
                    onClick={() => session.status === 'draft' ? onSelectSession(session.id) : null}
                    className={`min-w-[140px] bg-gray-900 p-4 rounded border border-gray-800 flex flex-col gap-2 shrink-0 ${session.status === 'draft' ? 'cursor-pointer hover:border-blue-500 transition' : ''}`}
                  >
                    <div className="font-semibold text-sm">Session {session.session_number}</div>
                    <div className="text-[12px] text-gray-400">
                      {session.session_date ? new Date(session.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                    <div className="text-[12px] text-gray-500">I Year I Sem</div>
                    <div className={`text-[11px] w-fit px-2 py-0.5 rounded ${session.status === 'draft' ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                      {session.status === 'draft' ? 'Draft' : 'Submitted'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-gray-800 my-8" />
          <div className="text-center text-[13px] text-gray-500 mb-4">Full diary record — expand sections below</div>

          {/* COLLAPSIBLE SECTIONS */}
          <div className="space-y-2">
            {/* 1. Identity & family details */}
            <div className="border border-gray-800 rounded bg-gray-900 overflow-hidden">
              <button onClick={() => toggleSection('identity')} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition">
                <span className="font-medium text-sm">Identity & family details</span>
                <span className="text-gray-500 text-lg leading-none">{expandedSection === 'identity' ? 'ᐱ' : '⌄'}</span>
              </button>
              {expandedSection === 'identity' && (
                <div className="p-4 pt-0 border-t border-gray-800 mt-2 text-[13px] grid grid-cols-2 gap-4 text-gray-300">
                  <div><span className="text-gray-500 block mb-1">Blood group</span> {profileData?.blood_group || '—'}</div>
                  <div><span className="text-gray-500 block mb-1">Mobile</span> {profileData?.mobile || '—'}</div>
                  <div><span className="text-gray-500 block mb-1">Email</span> {selectedStudent.email || '—'}</div>
                  <div><span className="text-gray-500 block mb-1">Address</span> {profileData?.address || '—'}</div>
                  <div><span className="text-gray-500 block mb-1">Father name & occ.</span> {profileData?.father_name || '—'} ({profileData?.father_occupation || '—'})</div>
                  <div><span className="text-gray-500 block mb-1">Mother name & occ.</span> {profileData?.mother_name || '—'} ({profileData?.mother_occupation || '—'})</div>
                  <div className="col-span-2"><span className="text-gray-500 block mb-1">Admission Info</span> {profileData?.admission_quota || '—'} · {profileData?.admission_category || '—'} · Rank: {profileData?.eamcet_rank || '—'}</div>
                </div>
              )}
            </div>

            {/* 2. Full academic record */}
            <div className="border border-gray-800 rounded bg-gray-900 overflow-hidden">
              <button onClick={() => toggleSection('academic')} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition">
                <span className="font-medium text-sm">Full academic record</span>
                <span className="text-gray-500 text-lg leading-none">{expandedSection === 'academic' ? 'ᐱ' : '⌄'}</span>
              </button>
              {expandedSection === 'academic' && (
                <div className="p-4 pt-0 border-t border-gray-800 mt-2">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="font-normal py-2">Year/Sem</th>
                        <th className="font-normal py-2">SGPA</th>
                        <th className="font-normal py-2">CGPA</th>
                        <th className="font-normal py-2">Credits</th>
                        <th className="font-normal py-2">Backlogs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semRecords.map((r, idx) => {
                        const prevR = idx > 0 ? semRecords[idx - 1] : null
                        const cgpaDrop = prevR?.cgpa != null && r.cgpa != null && r.cgpa - prevR.cgpa < -0.3
                        return (
                          <tr key={r.id} className="border-b border-gray-800/50 last:border-0 text-gray-300">
                            <td className="py-2">{r.year} Year {r.semester} Sem</td>
                            <td className="py-2">{r.sgpa ?? <span className="text-gray-600">—</span>}</td>
                            <td className={`py-2 ${cgpaDrop ? 'text-amber-500' : ''}`}>{r.cgpa ?? <span className="text-gray-600">—</span>}</td>
                            <td className="py-2">{r.credits_earned ?? <span className="text-gray-600">—</span>}</td>
                            <td className={`py-2 ${r.backlogs > 0 ? 'text-red-500' : ''}`}>{r.backlogs ?? <span className="text-gray-600">—</span>}</td>
                          </tr>
                        )
                      })}
                      {semRecords.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-500">No records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Goals & self-assessment */}
            <div className="border border-gray-800 rounded bg-gray-900 overflow-hidden">
              <button onClick={() => toggleSection('goals')} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition">
                <span className="font-medium text-sm">Goals & self-assessment</span>
                <span className="text-gray-500 text-lg leading-none">{expandedSection === 'goals' ? 'ᐱ' : '⌄'}</span>
              </button>
              {expandedSection === 'goals' && (
                <div className="p-4 pt-4 border-t border-gray-800 text-[13px] text-gray-300 space-y-4">
                  {!profileData?.goals && !profileData?.self_assessment ? (
                    <div className="text-gray-500 italic">Not filled yet</div>
                  ) : (
                    <>
                      <div>
                        <div className="text-gray-500 mb-1">Academic Goal</div>
                        <div>{profileData?.goals?.academic || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Personal Goal</div>
                        <div>{profileData?.goals?.personal || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-2">Career Qualities</div>
                        <div className="flex flex-wrap gap-2">
                          {profileData?.self_assessment?.qualities?.map((q: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs">{q}</span>
                          )) || '—'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 4. Psychometric test results */}
            <div className="border border-gray-800 rounded bg-gray-900 overflow-hidden">
              <button onClick={() => toggleSection('psych')} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition">
                <span className="font-medium text-sm">Psychometric test results</span>
                <span className="text-gray-500 text-lg leading-none">{expandedSection === 'psych' ? 'ᐱ' : '⌄'}</span>
              </button>
              {expandedSection === 'psych' && (
                <div className="p-4 pt-4 border-t border-gray-800 text-[13px] text-gray-300">
                  {!profileData?.psychometric_test ? (
                    <div className="text-gray-500 italic">Not completed yet</div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(
                        profileData.psychometric_test.reduce((acc: any, r: any) => {
                          if (!acc[r.aspect_category]) acc[r.aspect_category] = { yes: 0, no: 0 }
                          if (r.response === 'Yes') acc[r.aspect_category].yes++
                          else acc[r.aspect_category].no++
                          return acc
                        }, {})
                      ).map(([category, counts]: any) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="font-medium">{category}</span>
                          <span className="text-gray-500 text-xs">Yes: {counts.yes} / No: {counts.no}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. General counselling responses */}
            <div className="border border-gray-800 rounded bg-gray-900 overflow-hidden">
              <button onClick={() => toggleSection('counselling')} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition">
                <span className="font-medium text-sm">General counselling responses</span>
                <span className="text-gray-500 text-lg leading-none">{expandedSection === 'counselling' ? 'ᐱ' : '⌄'}</span>
              </button>
              {expandedSection === 'counselling' && (
                <div className="p-4 pt-4 border-t border-gray-800 text-[13px] text-gray-300">
                  {!profileData?.general_onboarding_responses ? (
                    <div className="text-gray-500 italic">Not filled yet</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(profileData.general_onboarding_responses).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-gray-500 block mb-1 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Co-curricular & portfolio */}
            <div className="border border-gray-800 rounded bg-gray-900 overflow-hidden">
              <button onClick={() => toggleSection('cocurricular')} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition">
                <span className="font-medium text-sm">Co-curricular & portfolio</span>
                <span className="text-gray-500 text-lg leading-none">{expandedSection === 'cocurricular' ? 'ᐱ' : '⌄'}</span>
              </button>
              {expandedSection === 'cocurricular' && (
                <div className="p-4 pt-4 border-t border-gray-800 text-[13px] text-gray-300 space-y-4">
                  {(() => {
                    const activities = sessions.flatMap(s => s.structured_input?.cocurricular_activities_this_session || [])
                    if (activities.length === 0) {
                      return <div className="text-amber-500 italic">No activity recorded this semester</div>
                    }
                    return (
                      <ul className="list-disc pl-4 space-y-1">
                        {activities.map((act: string, i: number) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EXPORT FOOTER */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 flex items-center justify-between px-8 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="text-[13px] text-gray-400">
          Export generates a full 4-year PDF of the mentoring diary
        </div>
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white rounded transition flex items-center gap-2 border border-gray-700"
        >
          {exporting ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Exporting...
            </>
          ) : `Export full diary — ${selectedStudent.name}`}
        </button>
      </div>
    </div>
  )
}
