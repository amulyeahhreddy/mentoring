'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SessionModeProps {
  selectedStudent: any
  mentorId: string
  activeSessionId: string | null
  onComplete: () => void
}

export default function SessionMode({
  selectedStudent,
  mentorId,
  activeSessionId,
  onComplete
}: SessionModeProps) {
  const [phase, setPhase] = useState<'student' | 'mentor'>('student')
  const [formData, setFormData] = useState<any>({
    student: {
      course_ratings: [{}],
      study_habits: { hours: 0, vocabulary: 0, reading: 0, reasoning: 0 },
      cocurricular_activities: [{}],
      facility_feedback: {},
      general_checkin: {}
    },
    mentor: {
      attendance: { is_above_90: true, fortnightly_records: [{}] },
      indiscipline: { has_indiscipline: false, details: '' },
      attribute_improvement: [
        { attribute: 'Problem solving' },
        { attribute: 'Communication' },
        { attribute: 'Mathematical ability' },
        { attribute: 'Inquisitiveness' },
        { attribute: 'Learning ability' },
        { attribute: 'Leadership skills' },
        { attribute: 'Innovation skills' }
      ],
      transformation_analysis: [],
      aptitude_test_scores: [],
      mentor_observation: '',
      mentor_recommendation: '',
      signatures: { mentee: {}, mentor: {}, coordinator: {} }
    }
  })
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [sessionNumber, setSessionNumber] = useState<number>(1)
  const [showOverlay, setShowOverlay] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (!activeSessionId) return

    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', activeSessionId)
        .single()

      if (data) {
        setSessionNumber(data.session_number || 1)
        if (data.structured_input) {
          setFormData((prev: any) => {
            const merged = { ...prev, ...data.structured_input }
            if (!merged.student) merged.student = prev.student
            if (!merged.mentor) merged.mentor = prev.mentor
            if (!merged.mentor.attribute_improvement || merged.mentor.attribute_improvement.length === 0) {
                merged.mentor.attribute_improvement = prev.mentor.attribute_improvement
            }
            return merged
          })
        }
      }
    }
    fetchSession()
  }, [activeSessionId, supabase])

  useEffect(() => {
    if (!activeSessionId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/session/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: activeSessionId,
            structured_input: formData
          })
        })
        if (!res.ok) {
          console.error('Autosave failed with status:', res.status)
        }
      } catch (err) {
        console.error('Autosave network error:', err)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [activeSessionId, formData])
  const saveImmediate = async () => {
    if (!activeSessionId) return
    setSaving(true)
    const { error } = await supabase
      .from('sessions')
      .update({ structured_input: formData })
      .eq('id', activeSessionId)
    if (!error) {
      setLastSaved(new Date())
    }
    setSaving(false)
  }

  const handleStudentDone = async () => {
    await saveImmediate()
    setShowOverlay(true)
  }

  const handleMentorComplete = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('sessions')
      .update({ structured_input: formData })
      .eq('id', activeSessionId)
    
    setSaving(false)
    if (!error) {
      onComplete()
    }
  }

  if (!activeSessionId) {
    return (
      <div className="p-8 text-center text-[#8b8b9e] font-medium">
        Creating session...
      </div>
    )
  }

  const updateStudent = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, student: { ...prev.student, [field]: value } }))
  }

  const updateMentor = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, mentor: { ...prev.mentor, [field]: value } }))
  }

  const updateStudentArray = (field: string, index: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const arr = [...(prev.student[field] || [])]
      if (!arr[index]) arr[index] = {}
      arr[index] = { ...arr[index], [key]: value }
      return { ...prev, student: { ...prev.student, [field]: arr } }
    })
  }

  const updateMentorArray = (field: string, index: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const arr = [...(prev.mentor[field] || [])]
      if (!arr[index]) arr[index] = {}
      arr[index] = { ...arr[index], [key]: value }
      return { ...prev, mentor: { ...prev.mentor, [field]: arr } }
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f4f6] text-[#111116] font-sans overflow-hidden">
      {/* PHASE INDICATOR / HEADER */}
      <div className="bg-white border-b border-[#e4e4e9] px-8 py-4 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${phase === 'student' ? 'bg-[#4f6ef7] text-white' : 'bg-[#eef1fe] text-[#3548c9]'}`}>1</div>
            <span className={`text-[13px] font-semibold ${phase === 'student' ? 'text-[#111116]' : 'text-[#9090a0]'}`}>Student Section</span>
          </div>
          <div className="w-8 h-[1px] bg-[#e4e4e9]" />
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${phase === 'mentor' ? 'bg-[#7c3aed] text-white' : 'bg-[#f4f4f6] text-[#9090a0]'}`}>2</div>
            <span className={`text-[13px] font-semibold ${phase === 'mentor' ? 'text-[#111116]' : 'text-[#9090a0]'}`}>Mentor Section</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[13px] font-bold text-[#111116]">{selectedStudent.name}</div>
            <div className="text-[11px] text-[#9090a0]">Session {sessionNumber} &middot; {phase === 'student' ? 'Student Entry' : 'Mentor Review'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-12 px-6">
        <div className="max-w-[760px] mx-auto bg-white border border-[#e4e4e9] rounded-2xl shadow-xl overflow-hidden min-h-[1000px] flex flex-col relative">
          
          {/* WATERMARK-STYLE HEADER */}
          <div className="p-8 border-b-2 border-[#f4f4f6] flex justify-between items-end bg-gradient-to-r from-[#4f6ef7]/5 to-transparent">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#9090a0] font-bold mb-1">Academic Year 2023-24</div>
              <h1 className="text-[24px] font-black text-[#111116] tracking-tight">MENTORING DIARY</h1>
            </div>
            <div className="text-right">
              <div className="text-[14px] font-bold text-[#111116]">PART A</div>
              <div className="text-[10px] uppercase text-[#9090a0] font-bold">Student Self-Record</div>
            </div>
          </div>

          <div className="p-10 space-y-12 flex-1">
            {phase === 'student' ? (
              <>
                {/* 1. COURSE RATINGS */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
                    <span className="text-[11px] font-black text-[#4f6ef7] uppercase tracking-wider">SEC I</span>
                    <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">Course Understanding</h4>
                  </div>
                  
                  <div className="space-y-4">
                    {(formData.student.course_ratings || []).map((course: any, idx: number) => (
                      <div key={idx} className="p-5 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl space-y-4 group transition-all hover:border-[#4f6ef7]/30 hover:shadow-sm">
                        <div className="flex gap-4">
                          <input 
                            type="text" 
                            placeholder="Course Name (e.g. Data Structures)" 
                            className="flex-1 bg-white border border-[#e4e4e9] rounded-lg px-4 py-2 text-[13px] focus:border-[#4f6ef7] outline-none transition-all"
                            value={course.name || ''}
                            onChange={(e) => updateStudentArray('course_ratings', idx, 'name', e.target.value)}
                          />
                          <div className="flex items-center px-3 bg-white border border-[#e4e4e9] rounded-lg">
                            {[1,2,3,4,5].map(star => (
                              <button 
                                key={star}
                                onClick={() => updateStudentArray('course_ratings', idx, 'rating', star)}
                                className={`text-xl transition-all ${course.rating >= star ? 'text-[#f59e0b] scale-110' : 'text-[#d1d1db] hover:text-[#9090a0]'}`}
                              >★</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-[12px] font-medium text-[#52525e]">Difficulty?</span>
                            <div className="flex bg-[#f4f4f6] rounded-md p-0.5">
                              <button 
                                className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${course.has_difficulty === true ? 'bg-white shadow text-[#4f6ef7]' : 'text-[#9090a0]'}`}
                                onClick={() => updateStudentArray('course_ratings', idx, 'has_difficulty', true)}
                              >YES</button>
                              <button 
                                className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${course.has_difficulty === false ? 'bg-white shadow text-[#4f6ef7]' : 'text-[#9090a0]'}`}
                                onClick={() => updateStudentArray('course_ratings', idx, 'has_difficulty', false)}
                              >NO</button>
                            </div>
                          </div>
                        </div>

                        {course.has_difficulty && (
                          <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
                            <textarea 
                              placeholder="Reason for difficulty..." 
                              className="w-full p-3 bg-white border border-[#fca5a5]/30 rounded-lg text-[13px] outline-none focus:border-[#ef4444] transition-all min-h-[80px]"
                              value={course.reason || ''}
                              onChange={(e) => updateStudentArray('course_ratings', idx, 'reason', e.target.value)}
                            />
                            <div className="flex items-center gap-4">
                              <span className="text-[12px] text-[#52525e]">Informed Faculty?</span>
                              <div className="flex gap-2">
                                <button 
                                  className={`px-4 py-1 text-[11px] font-bold rounded border transition-all ${course.informed_teacher === true ? 'bg-[#ef4444] border-[#ef4444] text-white' : 'border-[#e4e4e9] text-[#9090a0] hover:bg-white'}`}
                                  onClick={() => updateStudentArray('course_ratings', idx, 'informed_teacher', true)}
                                >YES</button>
                                <button 
                                  className={`px-4 py-1 text-[11px] font-bold rounded border transition-all ${course.informed_teacher === false ? 'bg-[#ef4444] border-[#ef4444] text-white' : 'border-[#e4e4e9] text-[#9090a0] hover:bg-white'}`}
                                  onClick={() => updateStudentArray('course_ratings', idx, 'informed_teacher', false)}
                                >NO</button>
                              </div>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Faculty Action / Suggestion" 
                              className="w-full p-3 bg-white border border-[#e4e4e9] rounded-lg text-[13px] outline-none focus:border-[#4f6ef7]"
                              value={course.faculty_action || ''}
                              onChange={(e) => updateStudentArray('course_ratings', idx, 'faculty_action', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => setFormData((prev: any) => ({
                        ...prev, 
                        student: { ...prev.student, course_ratings: [...prev.student.course_ratings, {}] }
                      }))}
                      className="w-full py-3 border-2 border-dashed border-[#e4e4e9] rounded-xl text-[#4f6ef7] text-[13px] font-bold hover:bg-[#4f6ef7]/5 hover:border-[#4f6ef7]/30 transition-all"
                    >+ Add Another Course</button>
                  </div>
                </section>
                {/* 2. STUDY HABITS */}
                {sessionNumber === 1 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
                      <span className="text-[11px] font-black text-[#4f6ef7] uppercase tracking-wider">SEC II</span>
                      <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">Study Habits</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      {[
                        { label: 'Avg study hours / day', key: 'hours', suffix: 'hrs' },
                        { label: 'Vocab building / day', key: 'vocabulary', suffix: 'min' },
                        { label: 'Reading comp / day', key: 'reading', suffix: 'min' },
                        { label: 'Logical reasoning / day', key: 'reasoning', suffix: 'min' }
                      ].map((habit) => (
                        <div key={habit.key} className="space-y-2">
                          <label className="text-[12px] font-medium text-[#52525e]">{habit.label}</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg px-4 py-2 text-[13px] focus:border-[#4f6ef7] outline-none transition-all"
                              value={formData.student.study_habits?.[habit.key] || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateStudent('study_habits', { ...formData.student.study_habits, [habit.key]: val });
                              }}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#9090a0]">{habit.suffix}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. CO-CURRICULAR */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
                    <span className="text-[11px] font-black text-[#4f6ef7] uppercase tracking-wider">SEC III</span>
                    <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">Co-Curricular Activities</h4>
                  </div>
                  <div className="space-y-4">
                    {(formData.student.cocurricular_activities || []).map((act: any, idx: number) => (
                      <div key={idx} className="p-5 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl space-y-4">
                        <div className="flex gap-4">
                          <input 
                            type="text" placeholder="Activity Title (e.g. Hackathon)" 
                            className="flex-1 bg-white border border-[#e4e4e9] rounded-lg px-4 py-2 text-[13px] focus:border-[#4f6ef7] outline-none transition-all"
                            value={act.name || ''}
                            onChange={(e) => updateStudentArray('cocurricular_activities', idx, 'name', e.target.value)}
                          />
                          <div className="flex bg-[#f4f4f6] rounded-md p-0.5">
                            {['Member', 'Participated'].map(role => (
                              <button 
                                key={role}
                                className={`px-4 py-1 text-[11px] font-bold rounded transition-all ${act.role === role ? 'bg-white shadow text-[#4f6ef7]' : 'text-[#9090a0]'}`}
                                onClick={() => updateStudentArray('cocurricular_activities', idx, 'role', role)}
                              >{role}</button>
                            ))}
                          </div>
                        </div>
                        <input 
                          type="text" placeholder="Achievement / Participation Details" 
                          className="w-full bg-white border border-[#e4e4e9] rounded-lg px-4 py-2 text-[13px] focus:border-[#4f6ef7] outline-none transition-all"
                          value={act.details || ''}
                          onChange={(e) => updateStudentArray('cocurricular_activities', idx, 'details', e.target.value)}
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => setFormData((prev: any) => ({
                        ...prev, 
                        student: { ...prev.student, cocurricular_activities: [...prev.student.cocurricular_activities, {}] }
                      }))}
                      className="text-[#4f6ef7] text-[12px] font-bold hover:underline transition-all"
                    >+ Add Another Activity Record</button>
                  </div>
                </section>


                {/* 4. FACILITY FEEDBACK */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
                    <span className="text-[11px] font-black text-[#4f6ef7] uppercase tracking-wider">SEC IV</span>
                    <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">Facility Feedback</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['Canteen', 'Transport', 'Sanitation', 'Library', 'Laboratories'].map(category => (
                      <div key={category} className="space-y-2">
                        <label className="text-[11px] font-bold text-[#9090a0] uppercase tracking-wider">{category}</label>
                        <textarea 
                          placeholder={`Feedback on ${category}...`} 
                          className="w-full p-3 bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg text-[13px] outline-none focus:border-[#4f6ef7] min-h-[60px] transition-all"
                          value={formData.student.facility_feedback?.[category] || ''}
                          onChange={(e) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              student: { ...prev.student, facility_feedback: { ...prev.student.facility_feedback, [category]: e.target.value } }
                            }))
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <button 
                  onClick={handleStudentDone}
                  className="w-full py-4 bg-[#4f6ef7] hover:bg-[#3d5ce8] text-white font-bold rounded-xl shadow-lg shadow-[#4f6ef7]/20 transition-all active:scale-[0.98] text-[15px] mt-8"
                >Hand to Mentor for Review &rarr;</button>
              </>
            ) : (
              <>
                {/* MENTOR SECTION PART B */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
                    <span className="text-[11px] font-black text-[#7c3aed] uppercase tracking-wider">SEC I</span>
                    <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">Attendance & Discipline</h4>
                  </div>
                                {/* 1. ATTENDANCE & DISCIPLINE CONTENT */}
                <div className="p-6 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#111116]">Is attendance above 90%?</span>
                    <div className="flex bg-[#f4f4f6] rounded-md p-1">
                      <button 
                        className={`px-4 py-1 text-[11px] font-bold rounded transition-all ${formData.mentor.attendance?.is_above_90 === true ? 'bg-white shadow text-[#7c3aed]' : 'text-[#9090a0]'}`}
                        onClick={() => updateMentor('attendance', { ...formData.mentor.attendance, is_above_90: true })}
                      >YES</button>
                      <button 
                        className={`px-4 py-1 text-[11px] font-bold rounded transition-all ${formData.mentor.attendance?.is_above_90 === false ? 'bg-white shadow text-[#7c3aed]' : 'text-[#9090a0]'}`}
                        onClick={() => updateMentor('attendance', { ...formData.mentor.attendance, is_above_90: false })}
                      >NO</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[11px] font-bold uppercase text-[#9090a0] tracking-wider">Fortnightly Records</h5>
                    <div className="overflow-x-auto rounded-lg border border-[#e4e4e9]">
                      <table className="w-full text-[12px] text-left">
                        <thead className="bg-[#f8f8fb] border-b border-[#e4e4e9]">
                          <tr>
                            <th className="px-3 py-2 font-bold text-[#52525e]">#</th>
                            <th className="px-3 py-2 font-bold text-[#52525e]">From</th>
                            <th className="px-3 py-2 font-bold text-[#52525e]">To</th>
                            <th className="px-3 py-2 font-bold text-[#52525e]">%</th>
                            <th className="px-3 py-2 font-bold text-[#52525e]">Parent Informed?</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e4e4e9]">
                          {(formData.mentor.attendance?.fortnightly_records || []).map((record: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-2 py-2"><input type="text" className="w-8 bg-transparent outline-none" value={record.number || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, number: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }} /></td>
                              <td className="px-2 py-2"><input type="date" className="bg-transparent outline-none" value={record.from || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, from: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }} /></td>
                              <td className="px-2 py-2"><input type="date" className="bg-transparent outline-none" value={record.to || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, to: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }} /></td>
                              <td className="px-2 py-2"><input type="text" className="w-10 font-bold text-[#7c3aed] outline-none" value={record.percentage || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, percentage: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }} /></td>
                              <td className="px-2 py-2">
                                <select className="bg-transparent outline-none" value={record.parent_informed || ''} onChange={(e) => {
                                  const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                  newRecords[idx] = { ...record, parent_informed: e.target.value };
                                  updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                                }}>
                                  <option value="N">NO</option>
                                  <option value="Y">YES</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button 
                      onClick={() => {
                        const current = formData.mentor.attendance?.fortnightly_records || [];
                        updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: [...current, {}] });
                      }}
                      className="text-[#7c3aed] text-[11px] font-bold hover:underline"
                    >+ Add Fortnight</button>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
                  <span className="text-[11px] font-black text-[#7c3aed] uppercase tracking-wider">SEC II</span>
                  <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">Mentor Assessment</h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#52525e] uppercase tracking-wider">Overall Observation</label>
                    <textarea 
                      className="w-full p-4 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl text-[13px] outline-none focus:border-[#7c3aed] min-h-[120px] leading-relaxed"
                      placeholder="Attitude, behavior, academic focus..."
                      value={formData.mentor.mentor_observation || ''}
                      onChange={(e) => updateMentor('mentor_observation', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#52525e] uppercase tracking-wider">Specific Recommendation</label>
                    <textarea 
                      className="w-full p-4 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl text-[13px] outline-none focus:border-[#7c3aed] min-h-[100px] leading-relaxed"
                      placeholder="Actions required by student or faculty..."
                      value={formData.mentor.mentor_recommendation || ''}
                      onChange={(e) => updateMentor('mentor_recommendation', e.target.value)}
                    />
                  </div>
                </div>
              </section>

            {/* 2. ATTRIBUTE IMPROVEMENT */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-[#f0f0f5]">Attribute improvement since last session</h3>
              <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-sm">
                {(formData.mentor.attribute_improvement || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center p-4 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[#0d0d14] transition-colors">
                    <div className="w-[140px] font-medium text-[#f0f0f5] mb-3 md:mb-0 shrink-0">
                      {item.attribute}
                    </div>
                    <div className="flex bg-[#16161f] rounded-lg p-1 shrink-0 mr-4">
                      {['Yes', 'No', 'Insignificant'].map(opt => (
                        <button 
                          key={opt}
                          className={`px-3 py-1.5 text-sm rounded-md transition-all ${item.status === opt ? 'bg-[#111118] shadow text-[#7c3aed] font-medium' : 'text-[#8b8b9e]'}`}
                          onClick={() => updateMentorArray('attribute_improvement', idx, 'status', opt)}
                        >{opt}</button>
                      ))}
                    </div>
                    <input 
                      type="text" placeholder="Mentor suggestion" 
                      className="flex-1 min-w-[200px] mt-3 md:mt-0 p-2 text-sm border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-[rgba(124,58,237,0.15)] focus:border-[#7c3aed] outline-none"
                      value={item.suggestion || ''}
                      onChange={(e) => updateMentorArray('attribute_improvement', idx, 'suggestion', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 3. TRANSFORMATION ANALYSIS */}
            {sessionNumber >= 2 && (
              <section className="mb-10">
                <h3 className="text-xl font-semibold mb-4 text-[#f0f0f5]">Transformation analysis</h3>
                <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-sm">
                  {[
                    "Q28. Is there any improvement in marks scored?",
                    "Q29. Did you observe improvement in attendance percentage?",
                    "Q30. Did the mentee understand the relevance of course work?",
                    "Q31. Did the mentee understand the importance of classroom activities?",
                    "Q32. Did the mentee understand the importance of Lab exercises?",
                    "Q33. Did the mentee understand the importance of self-motivation?",
                    "Q34. Did you notice any perceptible change in attitude?",
                    "Q34b. Is the mentee sensitive to constructive criticism?",
                    "Q35. Did you observe change in motivation and confidence level?"
                  ].map((question, idx) => {
                    const ans = formData.mentor.transformation_analysis?.[idx]?.answer;
                    return (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[#0d0d14] transition-colors">
                        <div className="text-sm text-[#f0f0f5] mb-3 md:mb-0 pr-4 flex-1">
                          {question}
                        </div>
                        <div className="flex bg-[#16161f] rounded-lg p-1 shrink-0">
                          {['Yes', 'No', 'Insignificant', 'NA'].map(opt => (
                            <button 
                              key={opt}
                              className={`px-3 py-1.5 text-xs rounded-md transition-all ${ans === opt ? 'bg-[#111118] shadow text-[#7c3aed] font-medium' : 'text-[#8b8b9e]'}`}
                              onClick={() => {
                                const arr = [...(formData.mentor.transformation_analysis || [])];
                                arr[idx] = { question, answer: opt };
                                updateMentor('transformation_analysis', arr);
                              }}
                            >{opt}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 4. TEST SCORES */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-[#f0f0f5]">Aptitude & test scores this semester</h3>
              <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 shadow-sm">
                <div className="overflow-hidden rounded-lg border border-[rgba(255,255,255,0.06)]">
                  <table className="w-full text-sm text-left text-[#8b8b9e]">
                    <thead className="text-xs text-[#f0f0f5] bg-[#0d0d14] border-b border-[rgba(255,255,255,0.06)]">
                      <tr>
                        <th className="px-4 py-3 w-24">Test #</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.mentor.aptitude_test_scores || []).map((test: any, idx: number) => (
                        <tr key={idx} className="border-b border-[rgba(255,255,255,0.06)] last:border-0 bg-[#111118]">
                          <td className="px-3 py-2"><input type="text" className="w-full p-1.5 border border-[rgba(255,255,255,0.06)] rounded" placeholder="Test 1" value={test.number || ''} onChange={(e) => updateMentorArray('aptitude_test_scores', idx, 'number', e.target.value)}/></td>
                          <td className="px-3 py-2">
                            <select className="w-full p-1.5 border border-[rgba(255,255,255,0.06)] rounded outline-none" value={test.type || ''} onChange={(e) => updateMentorArray('aptitude_test_scores', idx, 'type', e.target.value)}>
                              <option value="">Select type</option>
                              <option value="Quantitative">Quantitative</option>
                              <option value="Verbal">Verbal</option>
                              <option value="Logical">Logical</option>
                              <option value="Programming">Programming</option>
                            </select>
                          </td>
                          <td className="px-3 py-2"><input type="text" className="w-full p-1.5 border border-[rgba(255,255,255,0.06)] rounded" placeholder="Score / Percentile" value={test.score || ''} onChange={(e) => updateMentorArray('aptitude_test_scores', idx, 'score', e.target.value)}/></td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => {
                              const arr = [...formData.mentor.aptitude_test_scores];
                              arr.splice(idx, 1);
                              updateMentor('aptitude_test_scores', arr);
                            }} className="text-red-400 hover:text-red-600 font-bold">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  onClick={() => {
                    const arr = formData.mentor.aptitude_test_scores || [];
                    updateMentor('aptitude_test_scores', [...arr, {}]);
                  }}
                  className="mt-3 text-[#7c3aed] text-sm font-medium hover:bg-[rgba(124,58,237,0.08)] px-3 py-1.5 rounded-lg transition-colors inline-block"
                >
                  + Add score
                </button>
              </div>
            </section>
            <button 
              onClick={handleMentorComplete}
              className="w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold rounded-xl shadow-lg shadow-[#7c3aed]/20 transition-all active:scale-[0.98] text-[15px]"
            >Finalize Session Entry &rarr;</button>

            {/* 7. SIGNATURES */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-[#f0f0f5]">Signatures</h3>
              <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 shadow-sm space-y-4">
                {[
                  { key: 'mentee', label: 'Mentee' },
                  { key: 'mentor', label: 'Mentor' },
                  { key: 'coordinator', label: 'Coordinator' }
                ].map(role => {
                  const isSigned = formData.mentor.signatures?.[role.key]?.signed;
                  return (
                    <div key={role.key} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-[rgba(255,255,255,0.06)]">
                      <span className="font-medium text-[#f0f0f5] w-32">{role.label}</span>
                      <div className="flex bg-gray-200 rounded-lg p-1 mx-4">
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${isSigned === true ? 'bg-[#111118] shadow text-[#7c3aed] font-medium' : 'text-[#8b8b9e]'}`}
                          onClick={() => {
                            const sigs = { ...formData.mentor.signatures };
                            sigs[role.key] = { signed: true, date: sigs[role.key]?.date || new Date().toISOString().split('T')[0] };
                            updateMentor('signatures', sigs);
                          }}
                        >Signed</button>
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${isSigned === false || isSigned === undefined ? 'bg-[#111118] shadow text-[#7c3aed] font-medium' : 'text-[#8b8b9e]'}`}
                          onClick={() => {
                            const sigs = { ...formData.mentor.signatures };
                            sigs[role.key] = { signed: false };
                            updateMentor('signatures', sigs);
                          }}
                        >Not signed</button>
                      </div>
                      <div className="w-40 flex justify-end">
                        {isSigned && (
                          <input 
                            type="date" 
                            className="p-1.5 border border-[rgba(255,255,255,0.10)] rounded text-sm text-[#8b8b9e] outline-none w-full"
                            value={formData.mentor.signatures?.[role.key]?.date || ''}
                            onChange={(e) => {
                              const sigs = { ...formData.mentor.signatures };
                              sigs[role.key] = { ...sigs[role.key], date: e.target.value };
                              updateMentor('signatures', sigs);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            </>
          )}
          </div>
        </div>
      </div>

      {/* OVERLAY for HANDOFF */}
      {showOverlay && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-12 text-center animate-in fade-in duration-300">
          <div className="max-w-xs space-y-6">
            <div className="w-20 h-20 bg-[#ecfdf5] text-[#059669] rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm">✓</div>
            <div>
              <h3 className="text-[18px] font-bold text-[#111116] mb-2">Section A Complete</h3>
              <p className="text-[13px] text-[#52525e] leading-relaxed">Student records have been saved. Please hand the device back to the mentor to complete Part B.</p>
            </div>
            <button 
              onClick={() => {
                setPhase('mentor');
                setShowOverlay(false);
              }}
              className="w-full py-3 bg-[#111116] text-white font-bold rounded-xl text-[13px]"
            >I am the Mentor</button>
          </div>
        </div>
      )}

      {/* STICKY BOTTOM ACTIONS */}
      <div className="bg-white border-t border-[#e4e4e9] px-8 py-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)] shrink-0 z-40">
        <button 
          onClick={onComplete}
          className="text-[13px] font-semibold text-[#52525e] hover:bg-[#f4f4f6] px-4 py-2 rounded-lg transition-all"
        >Discard & Exit</button>
        <div className="flex items-center gap-3">
          {saving ? (
            <span className="text-[12px] text-[#9090a0] animate-pulse">Saving changes...</span>
          ) : (
            <button 
              onClick={saveImmediate}
              className="text-[13px] font-bold text-[#4f6ef7] hover:bg-[#4f6ef7]/5 px-4 py-2 rounded-lg transition-all underline underline-offset-4"
            >Save Progress</button>
          )}
        </div>
      </div>
    </div>
  )
}
