"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MentoringSession } from '@/lib/types'

interface EnrolledClass {
  id: string
  name: string
  class_code: string
  mentor_id: string
  created_at: string
}

interface Session {
  id: string
  student_id: string
  mentor_id: string
  transcript: string
  structured_json: MentoringSession
  created_at: string
}

export default function MenteePage() {
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const fetchEnrolledClasses = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          class_id,
          classes!inner(id, name, class_code, mentor_id, created_at)
        `)
        .eq('student_id', userData.user.id)

      if (enrollments) {
        const classes = enrollments.map(e => (e as any).classes)
        setEnrolledClasses(classes)
      }
    } catch (error) {
      console.error('Error fetching enrolled classes:', error)
    }
  }

  const fetchSessions = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (sessionsData) {
        setSessions(sessionsData)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const joinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classCode.trim()) return

    setLoading(true)
    setMessage('')

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setMessage('User not authenticated')
        return
      }

      const classCodeUpper = classCode.trim().toUpperCase()

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', classCodeUpper)
        .single()

      if (classError || !classData) {
        setMessage('Class not found. Please check the class code.')
        return
      }

      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', userData.user.id)
        .eq('class_id', classData.id)
        .single()

      if (existingEnrollment) {
        setMessage('You are already enrolled in this class.')
        return
      }

      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          student_id: userData.user.id,
          class_id: classData.id
        })

      if (enrollmentError) {
        setMessage('Error joining class: ' + enrollmentError.message)
      } else {
        setMessage('Successfully joined the class!')
        setClassCode('')
        fetchEnrolledClasses()
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnrolledClasses()
    fetchSessions()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Dashboard</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Join a Class</h2>
          <form onSubmit={joinClass} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Enter class code"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Class'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-md ${message.includes('Error') || message.includes('not found') || message.includes('already') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Classes</h2>
          {enrolledClasses.length === 0 ? (
            <p className="text-gray-500">No classes joined yet</p>
          ) : (
            <div className="space-y-4">
              {enrolledClasses.map((classItem) => (
                <div key={classItem.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{classItem.name}</h3>
                      <p className="text-sm text-gray-500">Class Code: {classItem.class_code}</p>
                      <p className="text-sm text-gray-500">Mentor ID: {classItem.mentor_id}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      Joined {new Date(classItem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500">No sessions yet. Your mentor will create sessions for you.</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-medium">Session</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      {expandedSession === session.id ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 font-medium">Summary:</p>
                    <p className="text-sm text-gray-600">{session.structured_json.summary || 'No summary available'}</p>
                  </div>

                  {expandedSession === session.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Category:</span> {session.structured_json.session_info.session_category}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {session.structured_json.session_info.duration_minutes || 'N/A'} minutes
                        </div>
                        <div>
                          <span className="font-medium">Sentiment:</span> {session.structured_json.student_state.sentiment}
                        </div>
                        <div>
                          <span className="font-medium">Confidence:</span> {session.structured_json.student_state.confidence_level}
                        </div>
                      </div>

                      {session.structured_json.discussion.issues_discussed.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Issues Discussed:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {session.structured_json.discussion.issues_discussed.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {session.structured_json.mentor_actions.suggestions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Mentor Suggestions:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {session.structured_json.mentor_actions.suggestions.map((suggestion, idx) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {session.structured_json.mentor_actions.tasks_assigned.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Tasks Assigned:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {session.structured_json.mentor_actions.tasks_assigned.map((task, idx) => (
                              <li key={idx}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {session.structured_json.follow_up.required && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Follow-up Required:</p>
                          <p className="text-sm text-gray-600">{session.structured_json.follow_up.details}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
