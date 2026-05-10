'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReviewModeProps {
  selectedStudent: any
  mentorId: string
  activeSessionId: string
  onBack: () => void
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [profileCollapsed, setProfileCollapsed] = useState(true)
  const [notesCollapsed, setNotesCollapsed] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [
        { data: sessionData },
        { data: profileRes }
      ] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', activeSessionId).single(),
        supabase.from('student_profiles').select('*').eq('student_id', selectedStudent.id).maybeSingle()
      ])

      if (sessionData) {
        setSession(sessionData)
        setEditedOutput(sessionData.ai_output)
      }
      setProfileData(profileRes)
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
          status: 'completed'
        })
        .eq('id', activeSessionId)

      if (updateError) throw updateError

      // 2. Upsert action items as tests
      if (editedOutput?.tasks_assigned?.length > 0) {
        const tasks = editedOutput.tasks_assigned.map((t: any) => ({
          session_id: activeSessionId,
          student_id: selectedStudent.id,
          mentor_id: mentorId,
          text: t.task,
          assigned_to: t.assigned_to,
          due_by: t.due_by || null,
          status: 'pending'
        }))

        const { error: tasksError } = await supabase
          .from('tests')
          .upsert(tasks, { onConflict: 'session_id,text' })
        
        if (tasksError) console.error('Tasks upsert error:', tasksError)
      }

      setSubmitting(false)
      triggerToast('Session submitted successfully')
      setTimeout(() => onSubmitComplete(), 1500)
    } catch (err) {
      console.error('Final submit error:', err)
      setSubmitting(false)
      triggerToast('Submission failed')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full"></div>
        <p className="text-gray-500 text-sm">Preparing review...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* SECTION 1: STUDENT PROFILE */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase text-gray-500 tracking-wider">Student profile</span>
              <button onClick={() => setProfileCollapsed(!profileCollapsed)}>
                <i className={`ti ti-chevron-${profileCollapsed ? 'down' : 'up'} text-gray-400`}></i>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                {selectedStudent.name?.charAt(0)}
              </div>
              <div>
                <div className="text-[14px] font-bold text-gray-800">{selectedStudent.name}</div>
                <div className="text-[12px] text-gray-500">{selectedStudent.email}</div>
              </div>
            </div>
            {!profileCollapsed && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 animate-in fade-in">
                <div>
                  <div className="text-[11px] text-gray-400">Year / Branch</div>
                  <div className="text-[13px] text-gray-700">{selectedStudent.year} Year, {selectedStudent.branch}</div>
                </div>
                {profileData && Object.entries(profileData).map(([key, val]) => {
                  if (['id', 'student_id', 'created_at'].includes(key) || !val) return null
                  return (
                    <div key={key}>
                      <div className="text-[11px] text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
                      <div className="text-[13px] text-gray-700">{String(val)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: SESSION NOTES */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase text-gray-500 tracking-wider">Session notes</span>
              <button onClick={() => setNotesCollapsed(!notesCollapsed)}>
                <i className={`ti ti-chevron-${notesCollapsed ? 'down' : 'up'} text-gray-400`}></i>
              </button>
            </div>
            {(!session?.structured_input) ? (
              <p className="text-[13px] text-gray-400 italic">No session notes recorded</p>
            ) : (
              <div className="text-[13px] text-gray-700">
                Summary available in expanded view
              </div>
            )}
            {!notesCollapsed && session?.structured_input && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in fade-in">
                {/* Simplified view of structured input */}
                {session.structured_input.student && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase">Student Input</div>
                    <div className="space-y-2">
                      {session.structured_input.student.course_ratings?.map((c: any, i: number) => (
                        <div key={i} className="flex justify-between text-[12px] bg-gray-50 p-2 rounded">
                          <span>{c.name}</span>
                          <span className="font-medium text-amber-600">{'★'.repeat(c.rating || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {session.structured_input.mentor && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase">Mentor Observations</div>
                    <div className="text-[13px] whitespace-pre-wrap text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {session.structured_input.mentor.mentor_observation || 'No observations written.'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: FINAL INSIGHTS REVIEW */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-1">Session insights</div>
              <div className="text-[13px] font-medium text-gray-800">Final review before submitting</div>
              <div className="text-[11px] text-gray-400">Last chance to edit before submission</div>
            </div>

            {editedOutput && (
              <div className="space-y-6">
                {/* Panel: Decisions */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-[11px] text-gray-400 mb-2">DECISIONS & NARRATIVE</div>
                  <textarea 
                    className="w-full text-[13px] border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                    value={editedOutput.decisions?.narrative || ''}
                    onChange={(e) => setEditedOutput({
                      ...editedOutput,
                      decisions: { ...editedOutput.decisions, narrative: e.target.value }
                    })}
                  />
                  <div className="mt-3 space-y-2">
                    {editedOutput.decisions?.commitments?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[12px] bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          c.assigned_to === 'student' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'
                        }`}>{c.assigned_to}</span>
                        <span className="flex-1 truncate">{c.task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel: Emotional & Behavioral */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-[11px] text-gray-400 mb-2">EMOTIONAL & BEHAVIORAL</div>
                  <div className="flex gap-2 mb-3">
                    {[editedOutput.emotional_behavioral?.overall_tone, editedOutput.emotional_behavioral?.engagement_level, editedOutput.emotional_behavioral?.confidence_level].map((v, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 text-[11px] px-2 py-0.5 rounded-full">{v}</span>
                    ))}
                  </div>
                  <textarea 
                    className="w-full text-[13px] border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                    value={editedOutput.emotional_behavioral?.observations || ''}
                    onChange={(e) => setEditedOutput({
                      ...editedOutput,
                      emotional_behavioral: { ...editedOutput.emotional_behavioral, observations: e.target.value }
                    })}
                  />
                </div>

                {/* Panel: Risk Flags */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-[11px] text-gray-400 mb-2">RISK FLAGS</div>
                  {(!editedOutput.risk_flags || editedOutput.risk_flags.length === 0) ? (
                    <p className="text-[12px] text-green-600">No flags identified.</p>
                  ) : (
                    <div className="space-y-4">
                      {editedOutput.risk_flags.map((flag: any, i: number) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{flag.severity}</span>
                            <span className="text-[13px] font-medium">{flag.flag_code}</span>
                          </div>
                          <textarea 
                            className="w-full text-[12px] border border-gray-200 rounded p-2 focus:outline-none"
                            value={flag.description}
                            onChange={(e) => {
                              const flags = [...editedOutput.risk_flags]
                              flags[i].description = e.target.value
                              setEditedOutput({ ...editedOutput, risk_flags: flags })
                            }}
                          />
                          <input 
                            type="text"
                            className="w-full text-[12px] border border-gray-200 rounded px-2 py-1 focus:outline-none"
                            value={flag.recommended_action}
                            onChange={(e) => {
                              const flags = [...editedOutput.risk_flags]
                              flags[i].recommended_action = e.target.value
                              setEditedOutput({ ...editedOutput, risk_flags: flags })
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel: Action Items */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-[11px] text-gray-400 mb-2">ACTION ITEMS</div>
                  <table className="w-full text-[12px]">
                    <thead className="text-gray-400 border-b border-gray-100">
                      <tr>
                        <th className="text-left font-normal pb-2">Task</th>
                        <th className="text-left font-normal pb-2">By</th>
                        <th className="text-left font-normal pb-2">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {editedOutput.tasks_assigned?.map((t: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2 pr-2">
                            <input 
                              type="text"
                              className="w-full border-b border-transparent focus:border-blue-500 outline-none"
                              value={t.task}
                              onChange={(e) => {
                                const tasks = [...editedOutput.tasks_assigned]
                                tasks[i].task = e.target.value
                                setEditedOutput({ ...editedOutput, tasks_assigned: tasks })
                              }}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <select 
                              className="bg-transparent focus:outline-none"
                              value={t.assigned_to}
                              onChange={(e) => {
                                const tasks = [...editedOutput.tasks_assigned]
                                tasks[i].assigned_to = e.target.value
                                setEditedOutput({ ...editedOutput, tasks_assigned: tasks })
                              }}
                            >
                              <option value="student">Student</option>
                              <option value="mentor">Mentor</option>
                              <option value="both">Both</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <input 
                              type="text"
                              className="w-full bg-transparent focus:outline-none"
                              value={t.due_by}
                              onChange={(e) => {
                                const tasks = [...editedOutput.tasks_assigned]
                                tasks[i].due_by = e.target.value
                                setEditedOutput({ ...editedOutput, tasks_assigned: tasks })
                              }}
                              placeholder="Due date"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 px-6 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40"
        style={{ backgroundColor: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}
      >
        <div className="text-[12px] text-gray-400">
          Submitting will finalise this session
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onBack}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Back
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit session'}
          </button>
        </div>
      </div>

      {/* TOAST */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4">
          <span className="text-[14px] font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
