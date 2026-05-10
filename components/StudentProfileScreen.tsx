'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudentProfileScreenProps {
  student: any
  onSessionSelect?: (sessionId: string) => void
}

interface Task {
  id: string
  text: string
  due_by: string
  status: string
  created_at: string
}

interface Session {
  id: string
  session_number: number
  date: string
  status: 'submitted' | 'draft'
}

interface AcademicRecord {
  id: string
  year: number
  sem: number
  sgpa: number
  cgpa: number
  credits: number
  backlogs: number
}

interface StudentProfileData {
  identity: any
  family: any
  pre_engineering_record: any
  admission: any
  goals: any
  psychometric: any
  counselling: any
}

interface ExtracurricularActivity {
  id: string
  activity_type: string
  description: string
  date: string
  semester: string
}

interface PortfolioArtifact {
  id: string
  title: string
  description: string
  date: string
  semester: string
}

interface BookRead {
  id: string
  title: string
  author: string
  date_read: string
}

export default function StudentProfileScreen({ student, onSessionSelect }: StudentProfileScreenProps) {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null)
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([])
  const [extracurriculars, setExtracurriculars] = useState<ExtracurricularActivity[]>([])
  const [portfolioArtifacts, setPortfolioArtifacts] = useState<PortfolioArtifact[]>([])
  const [booksRead, setBooksRead] = useState<BookRead[]>([])
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const supabase = createClient()

  useEffect(() => {
    if (student?.id) {
      fetchData()
    }
  }, [student?.id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        tasksRes,
        sessionsRes,
        profileRes,
        academicRes,
        extracurricularsRes,
        portfolioRes,
        booksRes
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('student_id', student.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('sessions')
          .select('*')
          .eq('student_id', student.id)
          .order('session_number', { ascending: false }),
        
        supabase
          .from('student_profiles')
          .select('*')
          .eq('student_id', student.id)
          .maybeSingle(),
        
        supabase
          .from('btech_sem_records')
          .select('*')
          .eq('student_id', student.id)
          .order('year', { ascending: true }),
        
        supabase
          .from('extracurricular_log')
          .select('*')
          .eq('student_id', student.id)
          .order('event_date', { ascending: false }),
        
        supabase
          .from('portfolio_artifacts')
          .select('*')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('books_read_log')
          .select('*')
          .eq('student_id', student.id)
          .order('date_read', { ascending: false })
      ])

      if (tasksRes.data) setTasks(tasksRes.data)
      if (sessionsRes.data) setSessions(sessionsRes.data)
      if (profileRes.data) setProfileData(profileRes.data.data)
      if (academicRes.data) setAcademicRecords(academicRes.data)
      if (extracurricularsRes.data) setExtracurriculars(extracurricularsRes.data)
      if (portfolioRes.data) setPortfolioArtifacts(portfolioRes.data)
      if (booksRes.data) setBooksRead(booksRes.data)
    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCard = (cardId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId)
    } else {
      newExpanded.add(cardId)
    }
    setExpandedCards(newExpanded)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/students/${student.id}/export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${student.name}_mentoring_diary.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting diary:', error)
    } finally {
      setExporting(false)
    }
  }

  const isOverdue = (dueBy: string) => {
    return new Date(dueBy) < new Date()
  }

  const getCgpaChange = (current: number, previous: number | null) => {
    if (previous === null) return 0
    return current - previous
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* SECTION 1 - QUICK SUMMARY */}
      <div className="grid grid-cols-3 gap-6">
        {/* CARD 1 - Open Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">{tasks.length}</div>
          <div className="text-sm font-medium text-gray-600 mb-4">Open Tasks</div>
          <div className="space-y-2">
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className="text-sm">
                <div className={`truncate ${isOverdue(task.due_by) ? 'text-red-600' : 'text-gray-900'}`}>
                  {task.text}
                </div>
                <div className={`text-xs ${isOverdue(task.due_by) ? 'text-red-500' : 'text-gray-500'}`}>
                  Due: {new Date(task.due_by).toLocaleDateString()}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-sm text-gray-500">No pending tasks</div>
            )}
            {tasks.length > 3 && (
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all ({tasks.length})
              </button>
            )}
          </div>
        </div>

        {/* CARD 2 - Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">{sessions.length}</div>
          <div className="text-sm font-medium text-gray-600 mb-4">Sessions</div>
          <div className="space-y-2">
            {sessions.slice(0, 3).map(session => (
              <div
                key={session.id}
                className={`text-sm cursor-pointer hover:bg-gray-50 p-1 rounded ${
                  session.status === 'draft' ? 'opacity-75' : ''
                }`}
                onClick={() => session.status === 'draft' && onSessionSelect?.(session.id)}
              >
                <div className="text-gray-900">
                  Session {session.session_number}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(session.date).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    session.status === 'submitted' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-sm text-gray-500">No sessions yet</div>
            )}
          </div>
        </div>

        {/* CARD 3 - Latest Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Latest Insights</div>
          {student.pre_session_insights && student.pre_session_insights.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                {new Date(student.pre_session_insights[0].generated_at).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-900 line-clamp-3">
                {typeof student.pre_session_insights[0].insights === 'string' 
                  ? student.pre_session_insights[0].insights
                  : student.pre_session_insights[0].insights?.one_line_summary || 
                    JSON.stringify(student.pre_session_insights[0].insights)
                }
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No insights yet</div>
          )}
        </div>
      </div>

      {/* SECTION 2 - FULL DIARY */}
      <div className="space-y-4">
        {/* CARD A - Identity & Family Details */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('identity')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Identity & Family Details</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('identity') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('identity') && (
            <div className="px-6 pb-6">
              {profileData?.identity || profileData?.family ? (
                <div className="grid grid-cols-2 gap-4">
                  {profileData?.identity && Object.entries(profileData.identity).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">{key}:</span>
                      <span className="text-sm text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                  {profileData?.family && Object.entries(profileData.family).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">{key}:</span>
                      <span className="text-sm text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not filled yet</div>
              )}
            </div>
          )}
        </div>

        {/* CARD B - Full Academic Record */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('academic')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Full Academic Record</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('academic') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('academic') && (
            <div className="px-6 pb-6">
              {academicRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sem</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SGPA</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CGPA</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Backlogs</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {academicRecords.map((record, index) => {
                        const prevCgpa = index > 0 ? academicRecords[index - 1].cgpa : null
                        const cgpaChange = getCgpaChange(record.cgpa, prevCgpa)
                        const isCgpaDrop = cgpaChange < -0.3
                        
                        return (
                          <tr key={record.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.year}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.sem}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.sgpa}</td>
                            <td className={`px-4 py-2 text-sm ${isCgpaDrop ? 'text-amber-600' : 'text-gray-900'}`}>
                              {record.cgpa}
                              {isCgpaDrop && <span className="ml-1 text-xs">↓</span>}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.credits}</td>
                            <td className={`px-4 py-2 text-sm ${record.backlogs > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {record.backlogs}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No academic records yet</div>
              )}
            </div>
          )}
        </div>

        {/* CARD C - Pre-engineering Record */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('preengineering')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Pre-engineering Record</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('preengineering') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('preengineering') && (
            <div className="px-6 pb-6">
              {profileData?.pre_engineering_record ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Board</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score/Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(profileData.pre_engineering_record).map(([level, data]: [string, any]) => (
                        <tr key={level}>
                          <td className="px-4 py-2 text-sm text-gray-900">{level}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{data.board}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{data.year}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{data.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not filled yet</div>
              )}
            </div>
          )}
        </div>

        {/* CARD D - Admission Details */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('admission')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Admission Details</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('admission') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('admission') && (
            <div className="px-6 pb-6">
              {profileData?.admission ? (
                <div className="space-y-2">
                  {Object.entries(profileData.admission).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b">
                      <span className="text-sm font-medium text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-sm text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not filled yet</div>
              )}
            </div>
          )}
        </div>

        {/* CARD E - Goals & Self-assessment */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('goals')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Goals & Self-assessment</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('goals') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('goals') && (
            <div className="px-6 pb-6">
              {profileData?.goals ? (
                <div className="space-y-4">
                  {profileData.goals.academic_goal && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Academic Goal</h4>
                      <p className="text-sm text-gray-900">{profileData.goals.academic_goal}</p>
                    </div>
                  )}
                  {profileData.goals.personal_goal && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Personal Goal</h4>
                      <p className="text-sm text-gray-900">{profileData.goals.personal_goal}</p>
                    </div>
                  )}
                  {profileData.goals.career_qualities && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Career Qualities</h4>
                      <div className="flex flex-wrap gap-2">
                        {profileData.goals.career_qualities.map((quality: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {quality}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not filled yet</div>
              )}
            </div>
          )}
        </div>

        {/* CARD F - Psychometric Results */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('psychometric')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Psychometric Results</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('psychometric') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('psychometric') && (
            <div className="px-6 pb-6">
              {profileData?.psychometric ? (
                <div className="space-y-4">
                  {Object.entries(profileData.psychometric).map(([category, tests]: [string, any]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-600 mb-2 capitalize">{category}</h4>
                      <div className="space-y-2">
                        {Object.entries(tests).map(([testName, result]: [string, any]) => (
                          <div key={testName} className="flex justify-between py-1 border-b">
                            <span className="text-sm text-gray-900">{testName}</span>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">{result.score}</span>
                              {result.interpretation && (
                                <span className="ml-2 text-xs">({result.interpretation})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not filled yet</div>
              )}
            </div>
          )}
        </div>

        {/* CARD G - General Counselling Responses */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('counselling')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">General Counselling Responses</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('counselling') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('counselling') && (
            <div className="px-6 pb-6">
              {profileData?.counselling ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(profileData.counselling).map(([question, answer]) => (
                    <div key={question} className="space-y-1">
                      <div className="text-sm font-medium text-gray-600">{question}</div>
                      <div className="text-sm text-gray-900">{String(answer)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not filled yet</div>
              )}
            </div>
          )}
        </div>

        {/* CARD H - Co-curricular & Portfolio */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('extracurricular')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Co-curricular & Portfolio</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('extracurricular') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('extracurricular') && (
            <div className="px-6 pb-6">
              {(extracurriculars.length > 0 || portfolioArtifacts.length > 0) ? (
                <div className="space-y-6">
                  {extracurriculars.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Extracurricular Activities</h4>
                      <div className="space-y-2">
                        {extracurriculars.map(activity => (
                          <div key={activity.id} className="border-l-4 border-blue-500 pl-4 py-2">
                            <div className="text-sm font-medium text-gray-900">{activity.activity_type}</div>
                            <div className="text-sm text-gray-600">{activity.description}</div>
                            <div className="text-xs text-gray-500">
                              {activity.semester} - {new Date(activity.date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {portfolioArtifacts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Portfolio Artifacts</h4>
                      <div className="space-y-2">
                        {portfolioArtifacts.map(artifact => (
                          <div key={artifact.id} className="border-l-4 border-green-500 pl-4 py-2">
                            <div className="text-sm font-medium text-gray-900">{artifact.title}</div>
                            <div className="text-sm text-gray-600">{artifact.description}</div>
                            <div className="text-xs text-gray-500">
                              {artifact.semester} - {new Date(artifact.date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="text-sm text-amber-800">
                    No co-curricular activities recorded this semester
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD I - Books Read */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCard('books')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-900">Books Read</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                expandedCards.has('books') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedCards.has('books') && (
            <div className="px-6 pb-6">
              {booksRead.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Read</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {booksRead.map(book => (
                        <tr key={book.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{book.title}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{book.author}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(book.date_read).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No books recorded yet</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EXPORT FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Export generates a full 4-year PDF matching the physical mentoring diary layout
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Export full diary — {student.name}
          </button>
        </div>
      </div>
    </div>
  )
}
