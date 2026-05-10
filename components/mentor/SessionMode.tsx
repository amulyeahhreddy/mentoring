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

  // Autosave removed as per requirements


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
      <div className="p-8 text-center text-gray-500 font-medium">
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
    <div className="flex flex-col h-full bg-white relative">


      {/* PHASE INDICATOR */}
      <div className="flex items-center justify-center py-6 border-b border-gray-100 mb-6">
        <div className={`flex items-center ${phase === 'student' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${phase === 'student' ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>1</div>
          Student section
        </div>
        <div className="mx-4 text-gray-300">→</div>
        <div className={`flex items-center ${phase === 'mentor' ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${phase === 'mentor' ? 'bg-purple-600 text-white' : 'border border-gray-300'}`}>2</div>
          Mentor section
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-24">
        {phase === 'student' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Soft blue banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-center text-blue-800">
              <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Student section — please hand the device to the student
            </div>

            {/* 1. COURSE RATINGS */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">How well do you understand each course?</h3>
              <div className="space-y-4">
                {(formData.student.course_ratings || []).map((course: any, idx: number) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input 
                        type="text" 
                        placeholder="Course name" 
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={course.name || ''}
                        onChange={(e) => updateStudentArray('course_ratings', idx, 'name', e.target.value)}
                      />
                      <div className="flex items-center space-x-1">
                        {[1,2,3,4,5].map(star => (
                          <button 
                            key={star}
                            onClick={() => updateStudentArray('course_ratings', idx, 'rating', star)}
                            className={`text-2xl transition-colors ${course.rating >= star ? 'text-amber-400' : 'text-gray-300 hover:text-gray-400'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <span className="text-gray-700 font-medium">Any difficulty?</span>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${course.has_difficulty === true ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                          onClick={() => updateStudentArray('course_ratings', idx, 'has_difficulty', true)}
                        >Yes</button>
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${course.has_difficulty === false ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                          onClick={() => updateStudentArray('course_ratings', idx, 'has_difficulty', false)}
                        >No</button>
                      </div>
                    </div>

                    {course.has_difficulty && (
                      <div className="bg-red-50/50 p-4 rounded-lg border border-red-100 space-y-4 animate-in fade-in">
                        <textarea 
                          placeholder="Reason?" 
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
                          value={course.reason || ''}
                          onChange={(e) => updateStudentArray('course_ratings', idx, 'reason', e.target.value)}
                        />
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-700 text-sm">Did you inform teacher?</span>
                          <div className="flex space-x-2">
                            <button 
                              className={`px-3 py-1 text-sm rounded border ${course.informed_teacher === true ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                              onClick={() => updateStudentArray('course_ratings', idx, 'informed_teacher', true)}
                            >Yes</button>
                            <button 
                              className={`px-3 py-1 text-sm rounded border ${course.informed_teacher === false ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                              onClick={() => updateStudentArray('course_ratings', idx, 'informed_teacher', false)}
                            >No</button>
                          </div>
                        </div>
                        <input 
                          type="text" 
                          placeholder="What did faculty do?" 
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
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
                  className="text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors flex items-center"
                >
                  <span className="mr-2">+</span> Add course
                </button>
              </div>
            </section>

            {/* 2. STUDY HABITS */}
            {sessionNumber === 1 && (
              <section className="mb-10">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Your study habits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 border border-gray-200 rounded-xl p-6">
                  {[
                    { label: 'Average study hours per day', key: 'hours' },
                    { label: 'Minutes per day on vocabulary', key: 'vocabulary' },
                    { label: 'Minutes per day on reading comprehension', key: 'reading' },
                    { label: 'Minutes per day on logical reasoning', key: 'reasoning' }
                  ].map((habit) => (
                    <div key={habit.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{habit.label}</label>
                      <input 
                        type="number" 
                        min="0" step="0.5"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.student.study_habits?.[habit.key] || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          setFormData((prev: any) => ({
                            ...prev, 
                            student: { 
                              ...prev.student, 
                              study_habits: { ...prev.student.study_habits, [habit.key]: isNaN(val) ? 0 : val } 
                            }
                          }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. CO-CURRICULAR ACTIVITIES */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Activities this semester</h3>
              <div className="space-y-4">
                {(formData.student.cocurricular_activities || []).map((act: any, idx: number) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <select 
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={act.skill_area || ''}
                        onChange={(e) => updateStudentArray('cocurricular_activities', idx, 'skill_area', e.target.value)}
                      >
                        <option value="">Select skill area</option>
                        <option value="Technical">Technical</option>
                        <option value="Professional Bodies">Professional Bodies</option>
                        <option value="Literary">Literary</option>
                        <option value="Mathematical">Mathematical</option>
                        <option value="Social Service">Social Service</option>
                      </select>
                      <input 
                        type="text" placeholder="Activity name" 
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={act.name || ''}
                        onChange={(e) => updateStudentArray('cocurricular_activities', idx, 'name', e.target.value)}
                      />
                      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${act.role === 'Organized' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                          onClick={() => updateStudentArray('cocurricular_activities', idx, 'role', 'Organized')}
                        >Organized</button>
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${act.role === 'Participated' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                          onClick={() => updateStudentArray('cocurricular_activities', idx, 'role', 'Participated')}
                        >Participated</button>
                      </div>
                    </div>
                    <input 
                      type="text" placeholder="Details" 
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors flex items-center"
                >
                  <span className="mr-2">+</span> Add activity
                </button>
              </div>
            </section>

            {/* 4. FACILITY FEEDBACK */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Feedback on college facilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Canteen', 'College Transport', 'Ragging', 'Sanitation', 'Library', 'Laboratories'].map(category => (
                  <div key={category} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{category}</label>
                    <textarea 
                      placeholder="Your feedback..." 
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[60px]"
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

            {/* 5. GENERAL CHECK-IN */}
            {sessionNumber === 1 && (
              <section className="mb-10">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Quick check-in</h3>
                <div className="space-y-4">
                  {[
                    { key: 'health', label: 'Any health problems?', needsText: true },
                    { key: 'home', label: 'Is your home environment suitable for studying?', needsText: false },
                    { key: 'ragging', label: 'Have you experienced ragging?', needsText: true },
                    { key: 'attendance_aware', label: 'Are you aware of attendance and CGPA regulations?', needsText: false },
                    { key: 'parents_aware', label: 'Have you informed your parents about regulations?', needsText: false },
                  ].map(item => (
                    <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                      <span className="font-medium text-gray-700 mb-3 sm:mb-0">{item.label}</span>
                      <div className="flex items-center space-x-4">
                        <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
                          <button 
                            className={`px-4 py-1.5 text-sm rounded-md transition-all ${formData.student.general_checkin?.[item.key]?.value === true ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                            onClick={() => {
                              setFormData((prev: any) => ({
                                ...prev, student: { ...prev.student, general_checkin: { ...prev.student.general_checkin, [item.key]: { ...prev.student.general_checkin?.[item.key], value: true } } }
                              }))
                            }}
                          >Yes</button>
                          <button 
                            className={`px-4 py-1.5 text-sm rounded-md transition-all ${formData.student.general_checkin?.[item.key]?.value === false ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                            onClick={() => {
                              setFormData((prev: any) => ({
                                ...prev, student: { ...prev.student, general_checkin: { ...prev.student.general_checkin, [item.key]: { ...prev.student.general_checkin?.[item.key], value: false } } }
                              }))
                            }}
                          >No</button>
                        </div>
                      </div>
                      {item.needsText && formData.student.general_checkin?.[item.key]?.value && (
                         <div className="mt-3 sm:mt-0 sm:ml-4 w-full sm:w-64">
                           <input 
                             type="text" placeholder="Please specify details" 
                             className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                             value={formData.student.general_checkin?.[item.key]?.details || ''}
                             onChange={(e) => {
                               setFormData((prev: any) => ({
                                 ...prev, student: { ...prev.student, general_checkin: { ...prev.student.general_checkin, [item.key]: { ...prev.student.general_checkin?.[item.key], details: e.target.value } } }
                               }))
                             }}
                           />
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DONE BUTTON */}
            <button 
              onClick={handleStudentDone}
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-200"
              style={{ height: '48px' }}
            >
              Done — hand to mentor
            </button>
          </div>
        )}

        {phase === 'mentor' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Soft purple banner */}
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-8 flex items-center text-purple-800">
              <svg className="w-5 h-5 mr-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mentor section — student has completed their part
            </div>

            {/* 1. ATTENDANCE */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Attendance & Discipline</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-6">
                
                {/* 90% Toggle */}
                <div>
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="text-gray-700 font-medium">Is attendance above 90%?</span>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button 
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${formData.mentor.attendance?.is_above_90 === true ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
                        onClick={() => updateMentor('attendance', { ...formData.mentor.attendance, is_above_90: true })}
                      >Yes</button>
                      <button 
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${formData.mentor.attendance?.is_above_90 === false ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
                        onClick={() => updateMentor('attendance', { ...formData.mentor.attendance, is_above_90: false })}
                      >No</button>
                    </div>
                  </div>
                  {formData.mentor.attendance?.is_above_90 === false && (
                    <div className="text-amber-600 bg-amber-50 px-4 py-2 rounded-lg text-sm border border-amber-100 animate-in fade-in">
                      Below threshold — parent contact may be required
                    </div>
                  )}
                </div>

                {/* Fortnightly Table */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Fortnightly attendance</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Fortnight #</th>
                          <th className="px-4 py-3">From</th>
                          <th className="px-4 py-3">To</th>
                          <th className="px-4 py-3">%</th>
                          <th className="px-4 py-3">Change</th>
                          <th className="px-4 py-3">Parent informed</th>
                          <th className="px-4 py-3">Date informed</th>
                          <th className="px-4 py-3">Response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.mentor.attendance?.fortnightly_records || []).map((record: any, idx: number) => {
                          // Auto calculate change
                          let change = record.change || '';
                          if (!record.change && idx > 0) {
                            const prev = parseFloat(formData.mentor.attendance.fortnightly_records[idx-1].percentage);
                            const curr = parseFloat(record.percentage);
                            if (!isNaN(prev) && !isNaN(curr)) {
                              const diff = curr - prev;
                              change = diff > 0 ? `+${diff}%` : `${diff}%`;
                            }
                          }

                          return (
                            <tr key={idx} className="bg-white border-b border-gray-100 last:border-0">
                              <td className="px-2 py-2"><input type="text" className="w-full p-1.5 border border-gray-200 rounded" value={record.number || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, number: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }}/></td>
                              <td className="px-2 py-2"><input type="date" className="w-full p-1.5 border border-gray-200 rounded text-xs" value={record.from || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, from: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }}/></td>
                              <td className="px-2 py-2"><input type="date" className="w-full p-1.5 border border-gray-200 rounded text-xs" value={record.to || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, to: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }}/></td>
                              <td className="px-2 py-2"><input type="text" className="w-16 p-1.5 border border-gray-200 rounded" value={record.percentage || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, percentage: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }}/></td>
                              <td className="px-2 py-2"><input type="text" className="w-16 p-1.5 border border-gray-200 rounded bg-gray-50" readOnly value={change}/></td>
                              <td className="px-2 py-2">
                                <select className="w-full p-1.5 border border-gray-200 rounded" value={record.parent_informed || ''} onChange={(e) => {
                                  const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                  newRecords[idx] = { ...record, parent_informed: e.target.value };
                                  updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                                }}>
                                  <option value="">-</option>
                                  <option value="Y">Y</option>
                                  <option value="N">N</option>
                                  <option value="NA">NA</option>
                                </select>
                              </td>
                              <td className="px-2 py-2"><input type="date" className="w-full p-1.5 border border-gray-200 rounded text-xs" value={record.date_informed || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, date_informed: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }}/></td>
                              <td className="px-2 py-2"><input type="text" className="w-full p-1.5 border border-gray-200 rounded" value={record.response || ''} onChange={(e) => {
                                const newRecords = [...formData.mentor.attendance.fortnightly_records];
                                newRecords[idx] = { ...record, response: e.target.value };
                                updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: newRecords });
                              }}/></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    onClick={() => {
                      const current = formData.mentor.attendance?.fortnightly_records || [];
                      updateMentor('attendance', { ...formData.mentor.attendance, fortnightly_records: [...current, {}] });
                    }}
                    className="mt-3 text-purple-600 text-sm font-medium hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Add fortnight
                  </button>
                </div>

                {/* Indiscipline */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-700 font-medium">Any indiscipline?</span>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button 
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${formData.mentor.indiscipline?.has_indiscipline === true ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
                        onClick={() => updateMentor('indiscipline', { ...formData.mentor.indiscipline, has_indiscipline: true })}
                      >Yes</button>
                      <button 
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${formData.mentor.indiscipline?.has_indiscipline === false ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
                        onClick={() => updateMentor('indiscipline', { ...formData.mentor.indiscipline, has_indiscipline: false })}
                      >No</button>
                    </div>
                  </div>
                  {formData.mentor.indiscipline?.has_indiscipline && (
                    <textarea 
                      placeholder="Details of indiscipline..." 
                      className="w-full mt-4 p-3 bg-red-50/30 border border-red-100 rounded-lg outline-none focus:ring-2 focus:ring-red-200 animate-in fade-in resize-y min-h-[80px]"
                      value={formData.mentor.indiscipline.details || ''}
                      onChange={(e) => updateMentor('indiscipline', { ...formData.mentor.indiscipline, details: e.target.value })}
                    />
                  )}
                </div>

              </div>
            </section>

            {/* 2. ATTRIBUTE IMPROVEMENT */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Attribute improvement since last session</h3>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {(formData.mentor.attribute_improvement || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <div className="w-[140px] font-medium text-gray-700 mb-3 md:mb-0 shrink-0">
                      {item.attribute}
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1 shrink-0 mr-4">
                      {['Yes', 'No', 'Insignificant'].map(opt => (
                        <button 
                          key={opt}
                          className={`px-3 py-1.5 text-sm rounded-md transition-all ${item.status === opt ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
                          onClick={() => updateMentorArray('attribute_improvement', idx, 'status', opt)}
                        >{opt}</button>
                      ))}
                    </div>
                    <input 
                      type="text" placeholder="Mentor suggestion" 
                      className="flex-1 min-w-[200px] mt-3 md:mt-0 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Transformation analysis</h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
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
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="text-sm text-gray-700 mb-3 md:mb-0 pr-4 flex-1">
                          {question}
                        </div>
                        <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
                          {['Yes', 'No', 'Insignificant', 'NA'].map(opt => (
                            <button 
                              key={opt}
                              className={`px-3 py-1.5 text-xs rounded-md transition-all ${ans === opt ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
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
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Aptitude & test scores this semester</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 w-24">Test #</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.mentor.aptitude_test_scores || []).map((test: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0 bg-white">
                          <td className="px-3 py-2"><input type="text" className="w-full p-1.5 border border-gray-200 rounded" placeholder="Test 1" value={test.number || ''} onChange={(e) => updateMentorArray('aptitude_test_scores', idx, 'number', e.target.value)}/></td>
                          <td className="px-3 py-2">
                            <select className="w-full p-1.5 border border-gray-200 rounded outline-none" value={test.type || ''} onChange={(e) => updateMentorArray('aptitude_test_scores', idx, 'type', e.target.value)}>
                              <option value="">Select type</option>
                              <option value="Quantitative">Quantitative</option>
                              <option value="Verbal">Verbal</option>
                              <option value="Logical">Logical</option>
                              <option value="Programming">Programming</option>
                            </select>
                          </td>
                          <td className="px-3 py-2"><input type="text" className="w-full p-1.5 border border-gray-200 rounded" placeholder="Score / Percentile" value={test.score || ''} onChange={(e) => updateMentorArray('aptitude_test_scores', idx, 'score', e.target.value)}/></td>
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
                  className="mt-3 text-purple-600 text-sm font-medium hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors inline-block"
                >
                  + Add test score
                </button>
              </div>
            </section>

            {/* 5. MENTOR OBSERVATION */}
            <section className="mb-10">
              <label className="block text-xl font-semibold mb-2 text-gray-800">Observation — attitude, behaviour, academics, career focus</label>
              <textarea 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[120px] shadow-sm text-gray-700"
                placeholder="Write your observations here..."
                value={formData.mentor.mentor_observation || ''}
                onChange={(e) => updateMentor('mentor_observation', e.target.value)}
              />
            </section>

            {/* 6. MENTOR RECOMMENDATION */}
            <section className="mb-10">
              <label className="block text-xl font-semibold mb-2 text-gray-800">Recommendation for this student</label>
              <textarea 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[100px] shadow-sm text-gray-700"
                placeholder="What is your recommendation?"
                value={formData.mentor.mentor_recommendation || ''}
                onChange={(e) => updateMentor('mentor_recommendation', e.target.value)}
              />
              {formData.mentor.mentor_recommendation && formData.mentor.mentor_recommendation.trim().split(/\s+/).length < 10 && (
                <div className="mt-2 text-amber-600 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  This seems short — please give a specific recommendation
                </div>
              )}
            </section>

            {/* 7. SIGNATURES */}
            <section className="mb-10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Signatures</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                {[
                  { key: 'mentee', label: 'Mentee' },
                  { key: 'mentor', label: 'Mentor' },
                  { key: 'coordinator', label: 'Coordinator' }
                ].map(role => {
                  const isSigned = formData.mentor.signatures?.[role.key]?.signed;
                  return (
                    <div key={role.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="font-medium text-gray-700 w-32">{role.label}</span>
                      <div className="flex bg-gray-200 rounded-lg p-1 mx-4">
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${isSigned === true ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
                          onClick={() => {
                            const sigs = { ...formData.mentor.signatures };
                            sigs[role.key] = { signed: true, date: sigs[role.key]?.date || new Date().toISOString().split('T')[0] };
                            updateMentor('signatures', sigs);
                          }}
                        >Signed</button>
                        <button 
                          className={`px-4 py-1.5 text-sm rounded-md transition-all ${isSigned === false || isSigned === undefined ? 'bg-white shadow text-purple-600 font-medium' : 'text-gray-500'}`}
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
                            className="p-1.5 border border-gray-300 rounded text-sm text-gray-600 outline-none w-full"
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
          </div>
        )}
      </div>

      {/* OVERLAY for HANDOFF */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-gray-100 p-6 rounded-full mb-6">
            <i className="ti ti-lock text-gray-700" style={{ fontSize: '48px' }}></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-8 max-w-sm text-center">Thank you. Please hand the device to your mentor.</h2>
          <button 
            onClick={() => {
              setPhase('mentor');
              setShowOverlay(false);
              window.scrollTo(0, 0);
            }}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-purple-200 text-lg"
          >
            I am the mentor — continue
          </button>
        </div>
      )}

      {/* STICKY BOTTOM BAR */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 px-6 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40" 
        style={{ 
          backgroundColor: 'var(--color-background-primary)', 
          borderTop: '0.5px solid var(--color-border-tertiary)' 
        }}
      >
        <div className="text-[11px] text-gray-400">
          Auto-saved
        </div>
        <button 
          onClick={handleMentorComplete}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Continue to Validate'}
        </button>
      </div>
    </div>
  )
}
