'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SessionApprovalPanel from '@/components/mentor/SessionApprovalPanel'
import { TOPICS_ADDRESSED_ITEMS } from '@/lib/session-utils'

interface ReviewModeProps {
  selectedStudent: any
  mentorId: string
  activeSessionId: string
  onBack: (savedOutput?: any) => void
  onSubmitComplete: () => void
}

export default function ReviewMode({
  selectedStudent,
  mentorId,
  activeSessionId,
  onBack,
  onSubmitComplete
}: ReviewModeProps) {
  const [session, setSession] = useState<any | null>(null)
  const [editedOutput, setEditedOutput] = useState<any | null>(null)
  const [profileData, setProfileData] = useState<any | null>(null)
  const [courseRatings, setCourseRatings] = useState<any[]>([])
  const [facilityFeedback, setFacilityFeedback] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [profileCollapsed, setProfileCollapsed] = useState(true)
  const [notesCollapsed, setNotesCollapsed] = useState(true)
  const [topicsAddressed, setTopicsAddressed] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const results = await Promise.all([
          supabase.from('sessions').select('*').eq('id', activeSessionId).single(),
          supabase.from('profiles').select('*').eq('id', selectedStudent.id).maybeSingle(),
          fetch(`/api/session/course-ratings?session_id=${activeSessionId}`).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`/api/session/facility-feedback?session_id=${activeSessionId}`).then(r => r.json()).catch(() => ({ data: null }))
        ])

        const sessionResult = results[0] || {}
        const profileResult = results[1] || {}
        const courseRatingsResult = results[2] || {}
        const facilityFeedbackResult = results[3] || {}

        const sessionData = sessionResult?.data
        const profileRes = profileResult?.data
        const courseRatingsRes = courseRatingsResult?.data || []
        const facilityFeedbackRes = facilityFeedbackResult?.data

        if (sessionData) {
          setSession(sessionData)
          setEditedOutput(sessionData.ai_output)
          setTopicsAddressed((sessionData.topics_addressed as Record<string, boolean>) || {})
        }
        setProfileData(profileRes)
        setCourseRatings(courseRatingsRes || [])
        setFacilityFeedback(facilityFeedbackRes)
      } catch (error) {
        console.error('Error fetching review data:', error)
      }
      setLoading(false)
    }

    fetchData()
  }, [activeSessionId, selectedStudent.id])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // 1. Finalize session
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          ai_output: editedOutput,
          session_status: 'mentor_review',
          mentor_signed_off: true,
          mentor_signed_off_at: new Date().toISOString(),
          topics_addressed: topicsAddressed
        })
        .eq('id', activeSessionId)

      if (updateError) throw updateError

      // 2. Upsert action items as tasks
      if (editedOutput?.tasks?.length > 0) {
        const tasks = editedOutput.tasks.map((t: any) => ({
          session_id: activeSessionId,
          student_id: selectedStudent.id,
          mentor_id: mentorId,
          text: t.task,
          assigned_to: t.assigned_to,
          due_by: t.due_by || null,
          status: 'pending'
        }))

        await supabase
          .from('tasks')
          .delete()
          .eq('session_id', activeSessionId)

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasks)
        
        if (tasksError) console.error('Tasks upsert error:', tasksError)
      }

      // 3. Create pre_session_insights for NEXT session
      const carryForward = editedOutput?.carry_forward_questions || []
      const suggestedNext = (editedOutput?.suggested_questions || []).map((q: any) => ({ ...q, checked: false }))

      if (carryForward.length > 0 || suggestedNext.length > 0) {
        await supabase.from('pre_session_insights').insert({
          student_id: selectedStudent.id,
          mentor_id: mentorId,
          insights: {
            questions: [...carryForward, ...suggestedNext]
          },
          model_used: 'groq',
          generated_at: new Date().toISOString()
        })
      }

      setSubmitting(false)
      triggerToast('Session submitted successfully')
      await refreshSession()
      setTimeout(() => onSubmitComplete(), 1500)
    } catch (err) {
      console.error('Final submit error:', err)
      setSubmitting(false)
      triggerToast('Submission failed')
    }
  }

  const handleBack = async () => {
    if (editedOutput) {
      await supabase
        .from('sessions')
        .update({ ai_output: editedOutput, topics_addressed: topicsAddressed })
        .eq('id', activeSessionId)
      onBack(editedOutput)
    } else {
      onBack()
    }
  }

  const refreshSession = async () => {
    const { data } = await supabase.from('sessions').select('*').eq('id', activeSessionId).single()
    if (data) setSession(data)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin w-6 h-6 border-2 border-[rgba(255,255,255,0.10)] border-t-purple-600 rounded-full"></div>
        <p className="text-[#8b8b9e] text-sm">Preparing review...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f4f6] text-[#111116] font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 pb-24">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* SESSION APPROVAL PROGRESS */}
          {session && (
            <SessionApprovalPanel
              sessionId={activeSessionId}
              sessionStatus={session.session_status || 'draft'}
              userRole="mentor"
              showWorkflowProgress={true}
              mentorSignedOffAt={session.mentor_signed_off_at}
              studentAcknowledgedAt={session.student_acknowledged_at}
              onStatusChange={refreshSession}
            />
          )}

          {/* HEADER SECTION */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-[22px] font-black text-[#111116] tracking-tight">Session Finalization</h2>
              <p className="text-[13px] text-[#9090a0]">Review and verify all recorded data before final submission.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-[#ecfdf5] text-[#059669] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Ready to Archive
              </span>
            </div>
          </div>

          {/* SECTION 1: STUDENT PROFILE CARD */}
          <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden transition-all">
            <div 
              className="p-6 border-b border-[#f4f4f6] flex items-center justify-between bg-[#fcfcfd] cursor-pointer group"
              onClick={() => setProfileCollapsed(!profileCollapsed)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-white text-lg font-black shadow-lg shadow-[#4f6ef7]/20">
                  {selectedStudent.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-[#111116] leading-tight">{selectedStudent.name}</h3>
                  <p className="text-[12px] text-[#9090a0] font-medium">{selectedStudent.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest group-hover:text-[#4f6ef7] transition-colors">
                  {profileCollapsed ? 'Show Profile' : 'Hide Profile'}
                </span>
                <i className={`ti ti-chevron-${profileCollapsed ? 'down' : 'up'} text-[#9090a0] group-hover:text-[#4f6ef7] transition-all`}></i>
              </div>
            </div>

            {!profileCollapsed && (
              <div className="p-8 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest">Academic Context</label>
                    <p className="text-[14px] font-bold text-[#111116]">{selectedStudent.year} Year &middot; {selectedStudent.branch}</p>
                  </div>
                  {profileData && Object.entries(profileData).map(([key, val]) => {
                    if (['id', 'student_id', 'created_at'].includes(key) || !val) return null
                    return (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest capitalize">{key.replace(/_/g, ' ')}</label>
                        <p className="text-[14px] font-bold text-[#111116]">{String(val)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: SESSION SUMMARY REPORT */}
          <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden">
            <div 
              className="p-6 border-b border-[#f4f4f6] flex items-center justify-between bg-[#fcfcfd] cursor-pointer group"
              onClick={() => setNotesCollapsed(!notesCollapsed)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f4f4f6] flex items-center justify-center text-[#111116]">
                  <i className="ti ti-file-description text-lg"></i>
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-[#111116] uppercase tracking-widest">Session Summary Report</h4>
                  {!session?.structured_input ? (
                    <p className="text-[11px] text-[#ef4444] font-bold uppercase tracking-wider">No Data Recorded</p>
                  ) : (
                    <p className="text-[11px] text-[#9090a0] font-bold uppercase tracking-wider">
                      {Object.keys(session.structured_input.student || {}).length + Object.keys(session.structured_input.mentor || {}).length} SECTIONS ARCHIVED
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest group-hover:text-[#4f6ef7] transition-colors">
                  {notesCollapsed ? 'Review Full Report' : 'Collapse Report'}
                </span>
                <i className={`ti ti-chevron-${notesCollapsed ? 'down' : 'up'} text-[#9090a0] group-hover:text-[#4f6ef7] transition-all`}></i>
              </div>
            </div>

            {!notesCollapsed && (session?.structured_input || courseRatings.length > 0 || facilityFeedback) && (() => {
              const st = session?.structured_input?.student || {}
              const me = session?.structured_input?.mentor || {}
              const renderBool = (val: any) => {
                if (val === true) return <span className="bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-md font-black">YES</span>
                if (val === false) return <span className="bg-[#fef2f2] text-[#ef4444] px-2 py-0.5 rounded-md font-black">NO</span>
                return <span className="text-[#9090a0]">—</span>
              }

              const sectionHeader = (title: string, icon: string) => (
                <div className="flex items-center gap-2 mb-6 mt-10 first:mt-0 border-b border-[#f4f4f6] pb-3">
                  <i className={`ti ${icon} text-[#4f6ef7] text-lg`}></i>
                  <h5 className="text-[12px] font-black text-[#111116] uppercase tracking-[0.15em]">{title}</h5>
                </div>
              )

              return (
                <div className="p-8 space-y-4 animate-in slide-in-from-top-4 duration-500">

                  {/* Attendance & Discipline */}
                  {me.attendance && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {sectionHeader('Attendance Status', 'ti-calendar-check')}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-[#fcfcfd] p-3 rounded-xl border border-[#f4f4f6]">
                            <span className="text-[13px] font-bold text-[#52525e]">Above 90% Threshold</span>
                            <span className="text-[11px]">{renderBool(me.attendance.is_above_90)}</span>
                          </div>
                          <div className="flex justify-between items-center bg-[#fcfcfd] p-3 rounded-xl border border-[#f4f4f6]">
                            <span className="text-[13px] font-bold text-[#52525e]">Indiscipline Flags</span>
                            <span className="text-[11px]">{renderBool(me.indiscipline?.has_indiscipline)}</span>
                          </div>
                        </div>
                      </div>

                      {me.attendance.fortnightly_records?.length > 0 && (
                        <div className="space-y-4">
                          {sectionHeader('Periodic Records', 'ti-list-check')}
                          <div className="overflow-hidden border border-[#f4f4f6] rounded-xl">
                            <table className="w-full text-[12px]">
                              <thead className="bg-[#fcfcfd] text-[#9090a0] border-b border-[#f4f4f6]">
                                <tr>
                                  <th className="p-2.5 text-left font-black uppercase tracking-wider">Prd</th>
                                  <th className="p-2.5 text-left font-black uppercase tracking-wider">%</th>
                                  <th className="p-2.5 text-left font-black uppercase tracking-wider">Change</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#f4f4f6]">
                                {me.attendance.fortnightly_records.slice(0, 3).map((r: any, i: number) => (
                                  <tr key={i} className="hover:bg-[#fcfcfd]">
                                    <td className="p-2.5 font-bold text-[#111116]">{r.number || i + 1}</td>
                                    <td className="p-2.5 font-bold text-[#4f6ef7]">{r.percentage}%</td>
                                    <td className="p-2.5 font-bold text-[#10b981]">{r.change || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Course Ratings & Academics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Use normalized course_ratings (Phase 2) or fallback to structured_input */}
                    {(courseRatings.length > 0 || st.course_ratings?.filter((c: any) => c.name).length > 0) && (
                      <div>
                        {sectionHeader('Course Feedback', 'ti-book')}
                        <div className="space-y-2">
                          {(courseRatings.length > 0 ? courseRatings : st.course_ratings?.filter((c: any) => c.name) || []).map((c: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-[#fcfcfd] rounded-xl border border-[#f4f4f6]">
                              <div>
                                <div className="text-[13px] font-black text-[#111116] leading-tight">{c.course_name || c.name}</div>
                                {c.teacher_informed && <span className="text-[10px] text-[#ef4444] font-black uppercase tracking-widest mt-1 inline-block">Faculty Informed</span>}
                              </div>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, idx) => (
                                  <i key={idx} className={`ti ti-star-filled text-[14px] ${idx < (c.difficulty_scale || c.rating || 0) ? 'text-amber-400' : 'text-[#f4f4f6]'}`}></i>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {st.study_habits && (
                      <div>
                        {sectionHeader('Daily Commitment', 'ti-clock')}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Self Study', val: `${st.study_habits.hours}h`, icon: 'ti-book-2' },
                            { label: 'Vocabulary', val: `${st.study_habits.vocabulary}m`, icon: 'ti-language' },
                            { label: 'Reading', val: `${st.study_habits.reading}m`, icon: 'ti-vocabulary' },
                            { label: 'Logic/QA', val: `${st.study_habits.reasoning}m`, icon: 'ti-brain' }
                          ].map((h, i) => (
                            <div key={i} className="p-3 bg-[#fcfcfd] rounded-xl border border-[#f4f4f6] flex flex-col gap-1">
                              <span className="text-[10px] font-black text-[#9090a0] uppercase tracking-wider">{h.label}</span>
                              <span className="text-[15px] font-black text-[#4f6ef7]">{h.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mentor Observations */}
                  {(me.mentor_observation || me.mentor_recommendation) && (
                    <div className="space-y-6">
                      {sectionHeader('Clinical Observations', 'ti-notes')}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {me.mentor_observation && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest">Primary Observation</label>
                            <div className="text-[13px] text-[#52525e] bg-[#fcfcfd] p-4 rounded-2xl border border-[#f4f4f6] leading-relaxed italic">
                              "{me.mentor_observation}"
                            </div>
                          </div>
                        )}
                        {me.mentor_recommendation && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#059669] uppercase tracking-widest">Formal Recommendation</label>
                            <div className="text-[13px] text-[#111116] bg-[#ecfdf5]/50 p-4 rounded-2xl border border-[#059669]/10 leading-relaxed font-bold">
                              {me.mentor_recommendation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Signatures */}
                  {me.signatures && (
                    <div className="mt-12 pt-10 border-t border-[#f4f4f6]">
                      <div className="grid grid-cols-3 gap-8">
                        {['mentee', 'mentor', 'coordinator'].map(role => (
                          <div key={role} className="space-y-3 text-center">
                            <div className="h-10 flex items-end justify-center">
                              {me.signatures[role]?.signed ? (
                                <span className="font-serif italic text-lg text-[#111116]/40">{me.signatures[role]?.signed_by || role}</span>
                              ) : (
                                <div className="w-full border-b border-dashed border-[#e4e4e9]"></div>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-black text-[#111116] uppercase tracking-[0.2em]">{role}</span>
                              <span className="text-[9px] text-[#9090a0] font-black uppercase tracking-wider">
                                {me.signatures[role]?.date || 'Awaiting Digital Stamp'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* SECTION 3: AI INSIGHTS & ACTION ITEMS */}
          <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#f4f4f6] bg-[#fcfcfd]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#eef1fe] flex items-center justify-center text-[#4f6ef7]">
                  <i className="ti ti-sparkles text-lg"></i>
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-[#111116] uppercase tracking-widest">Intelligence Verification</h4>
                  <p className="text-[11px] text-[#9090a0] font-bold uppercase tracking-wider">Validate automated findings before commit</p>
                </div>
              </div>
            </div>

            {editedOutput && (
              <div className="p-8 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Panel: Topics Addressed */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest">Topics Addressed This Session</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5 bg-[#fcfcfd] border border-[#e4e4e9] rounded-2xl">
                    {TOPICS_ADDRESSED_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={!!topicsAddressed[item.key]}
                          onChange={() => {
                            setTopicsAddressed(prev => ({ ...prev, [item.key]: !prev[item.key] }))
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-[#d1d1db] text-[#7c3aed] focus:ring-[#7c3aed]"
                        />
                        <span className="text-[13px] text-[#52525e] group-hover:text-[#111116] transition-colors">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Panel: Decisions */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest">Session Narrative & Decisions</label>
                  <textarea 
                    className="w-full text-[14px] bg-[#fcfcfd] border border-[#e4e4e9] rounded-2xl p-5 focus:border-[#4f6ef7] outline-none min-h-[120px] leading-relaxed transition-all font-medium"
                    value={editedOutput.decisions?.narrative || ''}
                    onChange={(e) => setEditedOutput({
                      ...editedOutput,
                      decisions: { ...editedOutput.decisions, narrative: e.target.value }
                    })}
                  />
                </div>

                {/* Panel: Risk Flags */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#ef4444] uppercase tracking-widest">Identified Risks & Safety Flags</label>
                  {(!editedOutput.risk_flags || editedOutput.risk_flags.length === 0) ? (
                    <div className="p-4 bg-[#ecfdf5] border border-[#059669]/10 rounded-xl">
                      <p className="text-[13px] text-[#059669] font-bold">Safe Environment: No behavioral risks detected in session transcript.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {editedOutput.risk_flags.map((flag: any, i: number) => (
                        <div key={i} className="p-5 bg-[#fef2f2] border border-[#fca5a5]/30 rounded-2xl space-y-3 relative overflow-hidden group">
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              flag.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'
                            }`}>
                              {flag.severity}
                            </span>
                            <span className="text-[13px] font-black text-[#111116]">{flag.flag_code}</span>
                          </div>
                          <textarea 
                            className="w-full text-[12px] bg-white/50 border border-red-200 rounded-xl p-3 focus:border-red-400 outline-none leading-relaxed transition-all font-medium"
                            rows={2}
                            value={flag.description}
                            onChange={(e) => {
                              const flags = [...editedOutput.risk_flags]
                              flags[i] = { ...flags[i], description: e.target.value }
                              setEditedOutput({ ...editedOutput, risk_flags: flags })
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel: Action Items Table */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#4f6ef7] uppercase tracking-widest">Task Matrix & Assignments</label>
                  <div className="border border-[#f4f4f6] rounded-2xl overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-[#fcfcfd] text-[#9090a0] border-b border-[#f4f4f6]">
                        <tr>
                          <th className="px-6 py-4 text-left font-black uppercase tracking-wider">Actionable Task</th>
                          <th className="px-6 py-4 text-left font-black uppercase tracking-wider w-32">Assignee</th>
                          <th className="px-6 py-4 text-left font-black uppercase tracking-wider w-32">Deadline</th>
                          <th className="px-6 py-4 text-left font-black uppercase tracking-wider w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f4f4f6]">
                        {editedOutput.tasks?.map((t: any, i: number) => (
                          <tr key={i} className="hover:bg-[#fcfcfd] transition-colors">
                            <td className="px-6 py-4">
                              <input 
                                type="text"
                                className="w-full bg-transparent font-bold text-[#111116] focus:text-[#4f6ef7] outline-none"
                                value={t.task}
                                onChange={(e) => {
                                  const tasks = [...editedOutput.tasks]
                                  tasks[i] = { ...tasks[i], task: e.target.value }
                                  setEditedOutput({ ...editedOutput, tasks: tasks })
                                }}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                className="bg-transparent font-black text-[#4f6ef7] uppercase text-[10px] tracking-widest outline-none cursor-pointer"
                                value={t.assigned_to}
                                onChange={(e) => {
                                  const tasks = [...editedOutput.tasks]
                                  tasks[i] = { ...tasks[i], assigned_to: e.target.value }
                                  setEditedOutput({ ...editedOutput, tasks: tasks })
                                }}
                              >
                                <option value="student">STUDENT</option>
                                <option value="mentor">MENTOR</option>
                                <option value="both">JOINT</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text"
                                className="w-full bg-transparent font-medium text-[#9090a0] focus:text-[#111116] outline-none"
                                value={t.due_by}
                                onChange={(e) => {
                                  const tasks = [...editedOutput.tasks]
                                  tasks[i] = { ...tasks[i], due_by: e.target.value }
                                  setEditedOutput({ ...editedOutput, tasks: tasks })
                                }}
                                placeholder="TBD"
                              />
                            </td>
                            <td className="px-4 py-4 w-10">
                              <button
                                onClick={() => {
                                  const tasks = editedOutput.tasks.filter((_: any, idx: number) => idx !== i)
                                  setEditedOutput({ ...editedOutput, tasks: tasks })
                                }}
                                className="text-[#9090a0] hover:text-[#dc2626] transition-colors p-1 rounded"
                              >
                                <i className="ti ti-x text-[13px]"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => {
                      const tasks = [...(editedOutput.tasks || []), { task: '', assigned_to: 'student', due_by: '' }]
                      setEditedOutput({ ...editedOutput, tasks: tasks })
                    }}
                    className="mt-3 flex items-center gap-2 text-[13px] font-bold text-[#4f6ef7] hover:bg-[#eef1fe] px-4 py-2 rounded-xl transition-all"
                  >
                    <i className="ti ti-plus text-[14px]"></i> Add task
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="bg-white border-t border-[#e4e4e9] px-8 py-5 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)] shrink-0 z-40">
        <div className="flex flex-col items-start">
          <button 
            onClick={handleBack}
            className="px-6 py-3 text-[14px] font-bold text-[#52525e] bg-[#f4f4f6] hover:bg-[#e4e4e9] rounded-xl transition-all"
          >
            Keep Draft
          </button>
          <span className="text-[10px] text-[#9090a0] font-medium block mt-1">Saves everything so far. You can return to submit later.</span>
        </div>
        <div className="flex flex-col items-end">
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-8 py-3 text-[14px] font-black rounded-xl shadow-lg transition-all ${
              submitting 
                ? 'bg-[#f4f4f6] text-[#9090a0] cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:shadow-xl hover:shadow-[#7c3aed]/20 active:scale-[0.98]'
            }`}
          >
            {submitting ? 'Submitting…' : 'Complete & Submit for Student Review'}
          </button>
          <span className="text-[10px] text-[#9090a0] font-medium block mt-1">Student will be asked to acknowledge this session.</span>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4">
          <div className="bg-[#111116] text-white text-[13px] font-bold px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <i className={`ti ${toastMessage.includes('fail') ? 'ti-alert-circle text-red-400' : 'ti-circle-check text-green-400'}`}></i>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  )
}
