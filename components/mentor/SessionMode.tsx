'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ImpactAssessmentForm from '@/components/mentor/ImpactAssessmentForm'
import FortnightlyAttendanceForm from '@/components/mentor/FortnightlyAttendanceForm'
import CareerCounsellingForm from '@/components/mentor/CareerCounsellingForm'

import {
  TOPICS_ADDRESSED_ITEMS,
  showCareerCounselling,
} from '@/lib/session-utils'

interface SessionModeProps {
  selectedStudent: any
  mentorId: string
  activeSessionId: string | null
  onComplete: () => void
  viewMode?: boolean
  userRole?: string
}

export default function SessionMode({
  selectedStudent,
  mentorId,
  activeSessionId,
  onComplete,
  viewMode = false,
  userRole = 'mentor',
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
  const [semester, setSemester] = useState<number | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [topicsAddressed, setTopicsAddressed] = useState<Record<string, boolean>>({})
  const [indisciplinaryActivity, setIndisciplinaryActivity] = useState(false)
  const [indisciplinaryDetails, setIndisciplinaryDetails] = useState('')


  const supabase = createClient()

  const saveSessionColumns = async () => {
    if (!activeSessionId) return
    await supabase
      .from('sessions')
      .update({
        topics_addressed: topicsAddressed,
        indisciplinary_activity: indisciplinaryActivity,
        indisciplinary_details: indisciplinaryDetails,
      })
      .eq('id', activeSessionId)
  }

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
        setSemester(data.semester ?? null)

        setTopicsAddressed((data.topics_addressed as Record<string, boolean>) || {})
        setIndisciplinaryActivity(!!data.indisciplinary_activity)
        setIndisciplinaryDetails(data.indisciplinary_details || '')

        // Fetch course ratings and facility feedback from normalized tables (Phase 2)
        let course_ratings: any[] = [{}]
        let facility_feedback: any = {}

        try {
          const [ratingsRes, facilityRes] = await Promise.all([
            fetch(`/api/session/course-ratings?session_id=${activeSessionId}`),
            fetch(`/api/session/facility-feedback?session_id=${activeSessionId}`)
          ])

          if (ratingsRes.ok) {
            const ratingsJson = await ratingsRes.json()
            if (ratingsJson.data && ratingsJson.data.length > 0) {
              course_ratings = ratingsJson.data.map((cr: any) => ({
                course_code: cr.course_code || '',
                name: cr.course_name || '',
                rating: cr.difficulty_scale || 0,
                informed_teacher: cr.teacher_informed || false,
                faculty_action: cr.faculty_response || ''
              }))
            }
          }

          if (facilityRes.ok) {
            const facilityJson = await facilityRes.json()
            if (facilityJson.data) {
              const dbFeedback = facilityJson.data
              facility_feedback = {
                'Canteen': dbFeedback.canteen_remarks || '',
                'Transport': dbFeedback.transport_remarks || '',
                'Ragging': dbFeedback.ragging_remarks || '',
                'Sanitation': dbFeedback.sanitation_remarks || '',
                'Library': dbFeedback.library_remarks || '',
                'Laboratories': dbFeedback.lab_remarks || ''
              }
            }
          }
        } catch (fetchErr) {
          console.error('Error fetching normalized session data:', fetchErr)
        }

        if (data.structured_input) {
          setFormData((prev: any) => {
            const merged = { ...prev, ...data.structured_input }
            if (!merged.student) merged.student = { ...prev.student }
            
            // Merge the fetched normalized values
            merged.student.course_ratings = course_ratings
            merged.student.facility_feedback = facility_feedback

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
        // Save course_ratings to normalized table (Phase 2)
        if (formData.student?.course_ratings) {
          await fetch('/api/session/course-ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: activeSessionId,
              student_id: selectedStudent.id,
              course_ratings: formData.student.course_ratings
            })
          })
        }

        // Save facility_feedback to normalized table (Phase 2)
        if (formData.student?.facility_feedback) {
          await fetch('/api/session/facility-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: activeSessionId,
              student_id: selectedStudent.id,
              facility_feedback: formData.student.facility_feedback
            })
          })
        }

        // Prepare structured_input without course_ratings and facility_feedback
        // (they are now saved to normalized tables as of Phase 2)
        const structuredInputWithoutNormalized = {
          ...formData,
          student: {
            ...formData.student,
            course_ratings: undefined,
            facility_feedback: undefined
          }
        }

        const res = await fetch('/api/session/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: activeSessionId,
            structured_input: structuredInputWithoutNormalized
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
  }, [activeSessionId, formData, selectedStudent.id])


  const saveImmediate = async () => {
    if (!activeSessionId) return
    setSaving(true)

    try {
      // Save course_ratings to normalized table (Phase 2)
      if (formData.student?.course_ratings) {
        await fetch('/api/session/course-ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: activeSessionId,
            student_id: selectedStudent.id,
            course_ratings: formData.student.course_ratings
          })
        })
      }

      // Save facility_feedback to normalized table (Phase 2)
      if (formData.student?.facility_feedback) {
        await fetch('/api/session/facility-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: activeSessionId,
            student_id: selectedStudent.id,
            facility_feedback: formData.student.facility_feedback
          })
        })
      }

      // Prepare structured_input without course_ratings and facility_feedback
      // (they are now saved to normalized tables as of Phase 2)
      const structuredInputWithoutNormalized = {
        ...formData,
        student: {
          ...formData.student,
          course_ratings: undefined,
          facility_feedback: undefined
        }
      }

      const { error } = await supabase
        .from('sessions')
        .update({
          structured_input: structuredInputWithoutNormalized,
          topics_addressed: topicsAddressed,
          indisciplinary_activity: indisciplinaryActivity,
          indisciplinary_details: indisciplinaryDetails,
        })
        .eq('id', activeSessionId)

      if (!error) {
        setLastSaved(new Date())
      }
    } catch (err) {
      console.error('Save error:', err)
    }

    setSaving(false)
  }

  const toggleTopic = (key: string) => {
    setTopicsAddressed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleStudentDone = async () => {
    await saveImmediate()
    setShowOverlay(true)
  }

  const handleMentorSave = async () => {
    await saveImmediate()
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


                {sessionNumber > 1 && activeSessionId && (
                  <ImpactAssessmentForm
                    studentId={selectedStudent.id}
                    sessionId={activeSessionId}
                    readOnly={viewMode}
                  />
                )}

                {activeSessionId && (
                  <FortnightlyAttendanceForm
                    studentId={selectedStudent.id}
                    sessionId={activeSessionId}
                    readOnly={viewMode}
                  />
                )}

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

              {/* Topics Addressed + Indisciplinary Activity */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
                  <span className="text-[11px] font-black text-[#7c3aed] uppercase tracking-wider">SEC IIb</span>
                  <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">
                    Topics Addressed This Session
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-3 p-5 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl">
                  {TOPICS_ADDRESSED_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        disabled={viewMode}
                        checked={!!topicsAddressed[item.key]}
                        onChange={() => {
                          toggleTopic(item.key)
                          if (!viewMode) saveSessionColumns()
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-[#d1d1db] text-[#7c3aed] focus:ring-[#7c3aed]"
                      />
                      <span className="text-[13px] text-[#52525e] group-hover:text-[#111116] transition-colors">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="space-y-4 p-5 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#111116]">
                      Indisciplinary Activity Observed
                    </span>
                    <button
                      type="button"
                      disabled={viewMode}
                      onClick={() => {
                        setIndisciplinaryActivity((v) => !v)
                        if (!viewMode) saveSessionColumns()
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        indisciplinaryActivity ? 'bg-[#dc2626]' : 'bg-[#d1d1db]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          indisciplinaryActivity ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  {indisciplinaryActivity && (
                    <>
                      <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-4 py-3 text-[13px] text-[#dc2626] font-medium">
                        This session will be flagged for coordinator review.
                      </div>
                      <textarea
                        disabled={viewMode}
                        placeholder="Describe the indisciplinary activity…"
                        value={indisciplinaryDetails}
                        onChange={(e) => setIndisciplinaryDetails(e.target.value)}
                        onBlur={() => !viewMode && saveSessionColumns()}
                        className="w-full p-3 bg-white border border-[#e4e4e9] rounded-lg text-[13px] min-h-[100px] outline-none focus:border-[#dc2626]"
                      />
                    </>
                  )}
                </div>
              </section>

              {showCareerCounselling(sessionNumber, semester) && activeSessionId && (
                <CareerCounsellingForm
                  studentId={selectedStudent.id}
                  sessionId={activeSessionId}
                  readOnly={viewMode}
                />
              )}


            <button
              onClick={async () => {
                await saveImmediate()
                onComplete()
              }}
              disabled={saving}
              className="w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold rounded-xl shadow-lg transition-all text-[15px]"
            >
              {saving ? 'Saving…' : 'Save & Review AI Insights →'}
            </button>


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


    </div>
  )
}
