'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  student: any
  sessionId: string
  mentorId: string
  onSubmitComplete: () => void
}

export default function SessionFormScreen({ student, sessionId, mentorId, onSubmitComplete }: Props) {
  const [phase, setPhase] = useState<'student' | 'mentor'>('student')
  const [formData, setFormData] = useState<any>({})
  const [sessionNumber, setSessionNumber] = useState<number>(1)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showHandoff, setShowHandoff] = useState(false)
  const [marks, setMarks] = useState<any[]>([])
  const [testScores, setTestScores] = useState<any[]>([])

  // Data fetching on mount
  useEffect(() => {
    const fetchSessionData = async () => {
      const supabase = createClient()
      
      // Load existing session data
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (session) {
        setSessionNumber(session.session_number)
        if (session.structured_input) {
          setFormData(session.structured_input)
          if (session.structured_input.phase === 'mentor') {
            setPhase('mentor')
          }
        }
      }

      // Load student marks
      const { data: studentMarks } = await supabase
        .from('subject_marks')
        .select('*')
        .eq('student_id', student.id)
        .order('year', { ascending: false })
        .limit(10)
      
      setMarks(studentMarks || [])

      // Load test scores
      const { data: aptitudeScores } = await supabase
        .from('aptitude_test_scores')
        .select('*')
        .eq('student_id', student.id)
        .order('year', { ascending: false })
      
      setTestScores(aptitudeScores || [])
    }

    fetchSessionData()
  }, [sessionId, student.id])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(formData).length > 0) {
        saveSession()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [formData])

  const saveSession = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('sessions')
      .update({ 
        structured_input: { ...formData, phase },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
    setLastSaved(new Date())
    setSaving(false)
  }

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.')
      const newData = { ...prev }
      let current = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full overflow-y-auto pb-24 relative">
      {/* Save status indicator */}
      <div className="absolute top-4 right-4 text-xs text-gray-500">
        {saving ? "Saving..." : lastSaved ? `Saved ${formatTime(lastSaved)}` : ""}
      </div>

      {/* Student Phase */}
      {phase === 'student' && (
        <div className="p-6">
          {/* Student banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                <span className="text-white text-xs">i</span>
              </div>
              <span className="text-blue-800">Student section — please fill this in together with the student</span>
            </div>
          </div>

          {/* Course ratings */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Course Ratings</h3>
            {marks.map((mark) => (
              <div key={mark.id} className="border rounded-lg p-4 mb-4">
                <div className="font-medium mb-2">{mark.course_name}</div>
                <div className="flex items-center mb-2">
                  <span className="mr-2">Rating:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateFormData(`courses.${mark.course_code}.rating`, star)}
                      className={`text-2xl ${formData.courses?.[mark.course_code]?.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="mb-2">
                  <span className="mr-2">Any difficulty?</span>
                  <button
                    onClick={() => updateFormData(`courses.${mark.course_code}.difficulty.hasDifficulty`, true)}
                    className={`px-3 py-1 rounded mr-2 ${formData.courses?.[mark.course_code]?.difficulty?.hasDifficulty ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateFormData(`courses.${mark.course_code}.difficulty.hasDifficulty`, false)}
                    className={`px-3 py-1 rounded ${!formData.courses?.[mark.course_code]?.difficulty?.hasDifficulty ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    No
                  </button>
                </div>
                {formData.courses?.[mark.course_code]?.difficulty?.hasDifficulty && (
                  <div className="ml-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Reason for difficulty"
                      className="w-full p-2 border rounded"
                      value={formData.courses?.[mark.course_code]?.difficulty?.reason || ''}
                      onChange={(e) => updateFormData(`courses.${mark.course_code}.difficulty.reason`, e.target.value)}
                    />
                    <div>
                      <span className="mr-2">Informed teacher?</span>
                      <button
                        onClick={() => updateFormData(`courses.${mark.course_code}.difficulty.informedTeacher`, true)}
                        className={`px-3 py-1 rounded mr-2 ${formData.courses?.[mark.course_code]?.difficulty?.informedTeacher ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => updateFormData(`courses.${mark.course_code}.difficulty.informedTeacher`, false)}
                        className={`px-3 py-1 rounded ${!formData.courses?.[mark.course_code]?.difficulty?.informedTeacher ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      >
                        No
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Faculty response"
                      className="w-full p-2 border rounded"
                      value={formData.courses?.[mark.course_code]?.difficulty?.facultyResponse || ''}
                      onChange={(e) => updateFormData(`courses.${mark.course_code}.difficulty.facultyResponse`, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Study habits (only session 1) */}
          {sessionNumber === 1 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Study Habits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Daily study hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-full p-2 border rounded"
                    value={formData.study_habits?.dailyHours || ''}
                    onChange={(e) => updateFormData('study_habits.dailyHours', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vocabulary practice (minutes/day)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-full p-2 border rounded"
                    value={formData.study_habits?.vocabulary || ''}
                    onChange={(e) => updateFormData('study_habits.vocabulary', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reading comprehension (minutes/day)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-full p-2 border rounded"
                    value={formData.study_habits?.reading || ''}
                    onChange={(e) => updateFormData('study_habits.reading', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logical reasoning (minutes/day)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-full p-2 border rounded"
                    value={formData.study_habits?.reasoning || ''}
                    onChange={(e) => updateFormData('study_habits.reasoning', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Co-curricular activities */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Co-curricular Activities This Session</h3>
            {(formData.cocurricular || []).map((activity: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-4 gap-4">
                  <select
                    className="p-2 border rounded"
                    value={activity.skillArea || ''}
                    onChange={(e) => updateFormData(`cocurricular.${index}.skillArea`, e.target.value)}
                  >
                    <option value="">Select skill area</option>
                    <option value="Sports">Sports</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Technical">Technical</option>
                    <option value="Social">Social</option>
                    <option value="Literary">Literary</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Activity name"
                    className="p-2 border rounded"
                    value={activity.name || ''}
                    onChange={(e) => updateFormData(`cocurricular.${index}.name`, e.target.value)}
                  />
                  <div>
                    <span className="mr-2">Role:</span>
                    <button
                      onClick={() => updateFormData(`cocurricular.${index}.role`, 'Organized')}
                      className={`px-3 py-1 rounded mr-2 ${activity.role === 'Organized' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                      Organized
                    </button>
                    <button
                      onClick={() => updateFormData(`cocurricular.${index}.role`, 'Participated')}
                      className={`px-3 py-1 rounded ${activity.role === 'Participated' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                      Participated
                    </button>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="Details"
                      className="flex-1 p-2 border rounded mr-2"
                      value={activity.details || ''}
                      onChange={(e) => updateFormData(`cocurricular.${index}.details`, e.target.value)}
                    />
                    <button
                      onClick={() => {
                        const newActivities = [...(formData.cocurricular || [])]
                        newActivities.splice(index, 1)
                        setFormData(prev => ({ ...prev, cocurricular: newActivities }))
                      }}
                      className="text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newActivities = [...(formData.cocurricular || []), {}]
                setFormData(prev => ({ ...prev, cocurricular: newActivities }))
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              + Add activity
            </button>
          </div>

          {/* Facility feedback */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Facility Feedback</h3>
            <div className="grid grid-cols-2 gap-4">
              {['Canteen', 'College Transport', 'Ragging', 'Sanitation', 'Library', 'Laboratories'].map((facility) => (
                <div key={facility}>
                  <label className="block text-sm font-medium mb-1">{facility}</label>
                  <textarea
                    rows={2}
                    placeholder="Your feedback (optional)..."
                    className="w-full p-2 border rounded"
                    value={formData.facility_feedback?.[facility] || ''}
                    onChange={(e) => updateFormData(`facility_feedback.${facility}`, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* General check-in (only session 1) */}
          {sessionNumber === 1 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">General Check-in</h3>
              <div className="space-y-4">
                <div>
                  <span className="mr-2">Any health problems?</span>
                  <button
                    onClick={() => updateFormData('checkin.healthProblems', true)}
                    className={`px-3 py-1 rounded mr-2 ${formData.checkin?.healthProblems ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateFormData('checkin.healthProblems', false)}
                    className={`px-3 py-1 rounded ${!formData.checkin?.healthProblems ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    No
                  </button>
                  {formData.checkin?.healthProblems && (
                    <input
                      type="text"
                      placeholder="Please describe"
                      className="ml-2 p-2 border rounded"
                      value={formData.checkin?.healthDescription || ''}
                      onChange={(e) => updateFormData('checkin.healthDescription', e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <span className="mr-2">Is home atmosphere suitable for studies?</span>
                  <button
                    onClick={() => updateFormData('checkin.homeAtmosphere', true)}
                    className={`px-3 py-1 rounded mr-2 ${formData.checkin?.homeAtmosphere ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateFormData('checkin.homeAtmosphere', false)}
                    className={`px-3 py-1 rounded ${!formData.checkin?.homeAtmosphere ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    No
                  </button>
                </div>
                <div>
                  <span className="mr-2">Have you experienced ragging?</span>
                  <button
                    onClick={() => updateFormData('checkin.ragging', true)}
                    className={`px-3 py-1 rounded mr-2 ${formData.checkin?.ragging ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateFormData('checkin.ragging', false)}
                    className={`px-3 py-1 rounded ${!formData.checkin?.ragging ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    No
                  </button>
                  {formData.checkin?.ragging && (
                    <input
                      type="text"
                      placeholder="Please provide details"
                      className="ml-2 p-2 border rounded"
                      value={formData.checkin?.raggingDetails || ''}
                      onChange={(e) => updateFormData('checkin.raggingDetails', e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <span className="mr-2">Are you aware of academic regulations?</span>
                  <button
                    onClick={() => updateFormData('checkin.academicRegulations', true)}
                    className={`px-3 py-1 rounded mr-2 ${formData.checkin?.academicRegulations ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateFormData('checkin.academicRegulations', false)}
                    className={`px-3 py-1 rounded ${!formData.checkin?.academicRegulations ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student handoff button */}
          <div className="mt-12">
            <button
              onClick={async () => {
                await saveSession()
                setShowHandoff(true)
              }}
              className="w-full py-4 bg-green-500 text-white rounded-lg text-lg font-semibold"
            >
              Done — hand device to mentor →
            </button>
          </div>
        </div>
      )}

      {/* Mentor Phase */}
      {phase === 'mentor' && (
        <div className="p-6">
          {/* Mentor banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                <span className="text-white text-xs">i</span>
              </div>
              <span className="text-purple-800">Mentor section — student has completed their part</span>
            </div>
          </div>

          {/* Attendance */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Attendance</h3>
            <div className="mb-4">
              <span className="mr-2">Is attendance above 90%?</span>
              <button
                onClick={() => updateFormData('attendance.above90', true)}
                className={`px-3 py-1 rounded mr-2 ${formData.attendance?.above90 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Yes
              </button>
              <button
                onClick={() => updateFormData('attendance.above90', false)}
                className={`px-3 py-1 rounded ${!formData.attendance?.above90 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                No
              </button>
              {formData.attendance?.above90 === false && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                  Attendance below threshold
                </div>
              )}
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Fortnightly Attendance</h4>
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2">Fortnight #</th>
                    <th className="border p-2">Date range</th>
                    <th className="border p-2">%</th>
                    <th className="border p-2">Change</th>
                    <th className="border p-2">Parent informed</th>
                    <th className="border p-2">Date informed</th>
                    <th className="border p-2">Parent response</th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.attendance?.fortnights || []).map((fortnight: any, index: number) => (
                    <tr key={index}>
                      <td className="border p-2">
                        <input
                          type="text"
                          className="w-full p-1 border"
                          value={fortnight.number || ''}
                          onChange={(e) => updateFormData(`attendance.fortnights.${index}.number`, e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          className="w-full p-1 border"
                          value={fortnight.dateRange || ''}
                          onChange={(e) => updateFormData(`attendance.fortnights.${index}.dateRange`, e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          className="w-full p-1 border"
                          value={fortnight.percentage || ''}
                          onChange={(e) => updateFormData(`attendance.fortnights.${index}.percentage`, e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          className="w-full p-1 border"
                          value={fortnight.change || ''}
                          onChange={(e) => updateFormData(`attendance.fortnights.${index}.change`, e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <select
                          className="w-full p-1 border"
                          value={fortnight.parentInformed || ''}
                          onChange={(e) => updateFormData(`attendance.fortnights.${index}.parentInformed`, e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                          <option value="NA">NA</option>
                        </select>
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          className="w-full p-1 border"
                          value={fortnight.dateInformed || ''}
                          onChange={(e) => updateFormData(`attendance.fortnights.${index}.dateInformed`, e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          className="w-full p-1 border"
                          value={fortnight.parentResponse || ''}
                          onChange={(e) => updateFormData(`attendance.fortnights.${index}.parentResponse`, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => {
                  const newFortnights = [...(formData.attendance?.fortnights || []), {}]
                  updateFormData('attendance.fortnights', newFortnights)
                }}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
              >
                + Add fortnight
              </button>
            </div>

            <div>
              <span className="mr-2">Any indiscipline?</span>
              <button
                onClick={() => updateFormData('attendance.indiscipline', true)}
                className={`px-3 py-1 rounded mr-2 ${formData.attendance?.indiscipline ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Yes
              </button>
              <button
                onClick={() => updateFormData('attendance.indiscipline', false)}
                className={`px-3 py-1 rounded ${!formData.attendance?.indiscipline ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                No
              </button>
              {formData.attendance?.indiscipline && (
                <textarea
                  placeholder="Details about indiscipline..."
                  className="mt-2 w-full p-2 border rounded"
                  rows={3}
                  value={formData.attendance?.indisciplineDetails || ''}
                  onChange={(e) => updateFormData('attendance.indisciplineDetails', e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Attribute improvement */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Attribute Improvement Review</h3>
            <div className="space-y-4">
              {[
                'Problem solving',
                'Communication',
                'Mathematical ability',
                'Inquisitiveness',
                'Learning ability',
                'Leadership skills',
                'Innovation skills'
              ].map((attribute) => (
                <div key={attribute} className="border rounded p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{attribute}</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-2">
                        {['Yes', 'No', 'Insignificant'].map((option) => (
                          <button
                            key={option}
                            onClick={() => updateFormData(`attributes.${attribute}.improvement`, option)}
                            className={`px-3 py-1 rounded ${formData.attributes?.[attribute]?.improvement === option ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Mentor suggestion"
                        className="w-48 p-2 border rounded"
                        value={formData.attributes?.[attribute]?.suggestion || ''}
                        onChange={(e) => updateFormData(`attributes.${attribute}.suggestion`, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transformation analysis (session >= 2) */}
          {sessionNumber >= 2 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Transformation Analysis</h3>
              <div className="space-y-4">
                {[
                  'Q28. Is there any improvement in marks scored?',
                  'Q29. Did you observe improvement in attendance percentage?',
                  'Q30. Did the mentee understand relevance of course work?',
                  'Q31. Did the mentee understand importance of classroom activities?',
                  'Q32. Did the mentee understand importance of Lab exercises?',
                  'Q33. Did the mentee understand importance of self-motivation?',
                  'Q34. Did you notice any perceptible change in attitude?',
                  'Q34b. Is the mentee sensitive to constructive criticism?',
                  'Q35. Did you observe change in motivation and confidence level?'
                ].map((question, index) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{question}</span>
                      <div className="flex space-x-2">
                        {['Yes', 'No', 'Insignificant', 'NA'].map((option) => (
                          <button
                            key={option}
                            onClick={() => updateFormData(`transformation.${index}`, option)}
                            className={`px-3 py-1 rounded text-sm ${formData.transformation?.[index] === option ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aptitude & test scores */}
          {testScores.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Aptitude & Test Scores</h3>
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2">Test #</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {testScores.map((score, index) => (
                    <tr key={score.id}>
                      <td className="border p-2">{index + 1}</td>
                      <td className="border p-2">{score.test_type}</td>
                      <td className="border p-2">
                        <input
                          type="text"
                          className="w-full p-1 border"
                          value={formData.test_scores?.[score.id] || score.score || ''}
                          onChange={(e) => updateFormData(`test_scores.${score.id}`, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mentor observation */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Mentor Observation</h3>
            <textarea
              placeholder="Attitude, behaviour, academics, career focus..."
              className="w-full p-2 border rounded"
              style={{ minHeight: '100px' }}
              value={formData.mentor_observation || ''}
              onChange={(e) => updateFormData('mentor_observation', e.target.value)}
            />
          </div>

          {/* Mentor recommendation */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Mentor Recommendation</h3>
            <textarea
              placeholder="Specific, actionable recommendation..."
              className="w-full p-2 border rounded"
              style={{ minHeight: '80px' }}
              value={formData.mentor_recommendation || ''}
              onChange={(e) => updateFormData('mentor_recommendation', e.target.value)}
              onBlur={() => {
                const wordCount = (formData.mentor_recommendation || '').split(' ').filter(w => w).length
                if (wordCount < 10) {
                  // Show warning - this would be managed by state in a real implementation
                }
              }}
            />
            {(formData.mentor_recommendation || '').split(' ').filter(w => w).length < 10 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                Recommendation seems short — please be more specific
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Signatures</h3>
            <div className="space-y-4">
              {[
                { key: 'mentee', label: 'Mentee signed' },
                { key: 'mentor', label: 'Mentor signed' },
                { key: 'coordinator', label: 'Coordinator signed' }
              ].map((sig) => (
                <div key={sig.key} className="flex items-center justify-between border rounded p-4">
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer mr-4">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.signatures?.[sig.key]?.signed || false}
                        onChange={(e) => updateFormData(`signatures.${sig.key}.signed`, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span>{sig.label}</span>
                  </div>
                  {formData.signatures?.[sig.key]?.signed && (
                    <input
                      type="date"
                      className="p-2 border rounded"
                      value={formData.signatures?.[sig.key]?.date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => updateFormData(`signatures.${sig.key}.date`, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Handoff overlay */}
      {showHandoff && (
        <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
            <p className="text-gray-600 mb-6">Please hand the device to your mentor.</p>
            <button
              onClick={() => {
                setShowHandoff(false)
                setPhase('mentor')
              }}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold"
            >
              Continue as mentor →
            </button>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-4">
        <div className="flex justify-between">
          <button
            onClick={saveSession}
            className="px-4 py-2 border border-gray-300 rounded"
          >
            Save draft
          </button>
          <button
            onClick={async () => {
              await saveSession()
              onSubmitComplete()
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded font-semibold"
          >
            Continue to Validate & Submit →
          </button>
        </div>
      </div>
    </div>
  )
}
