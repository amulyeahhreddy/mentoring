'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import StudentList from '@/components/mentor/StudentList'
import BriefingMode from '@/components/mentor/BriefingMode'
import SessionMode from '@/components/mentor/SessionMode'
import ValidateMode from '@/components/mentor/ValidateMode'
import ReviewMode from '@/components/mentor/ReviewMode'

export default function MentorPage() {
  const [mentorId, setMentorId] = useState('')
  const [mentorName, setMentorName] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [mode, setMode] = useState<'briefing'|'session'|'validate'|'review'>('briefing')
  const [activeSessionId, setActiveSessionId] = useState<string|null>(null)
  const [formData, setFormData] = useState<any>({})
  const [aiOutput, setAiOutput] = useState<any>(null)
  const [transcript, setTranscript] = useState('')
  const [sessionNumber, setSessionNumber] = useState(1)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMentorId(user.id)
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      if (profile) setMentorName(profile.name || '')
      const res = await fetch('/api/mentor/students')
      const data = await res.json()
      if (data.students) setStudents(data.students)
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const refreshStudents = async () => {
    const res = await fetch('/api/mentor/students')
    const data = await res.json()
    if (data.students) setStudents(data.students)
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <StudentList
        students={students}
        selectedStudent={selectedStudent}
        onSelect={(student: any) => {
          setSelectedStudent(student)
          setMode('briefing')
          setActiveSessionId(null)
          setFormData({})
          setAiOutput(null)
          setTranscript('')
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-gray-950 border-b border-gray-800 shrink-0">
          <span className="font-semibold">{mentorName || 'Mentor'}</span>
          <div className="flex gap-1 text-sm">
            {(['briefing','session','validate','review'] as const).map(m => (
              <span key={m} className={`px-3 py-1 rounded capitalize ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                {m}
              </span>
            ))}
          </div>
          <button onClick={handleLogout} className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded">
            Logout
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {!selectedStudent ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-xl">Select a student to get started</p>
            </div>
          ) : mode === 'briefing' ? (
            <BriefingMode
              selectedStudent={selectedStudent}
              mentorId={mentorId}
              onStartSession={(sessionId: string, num: number) => {
                setActiveSessionId(sessionId)
                setSessionNumber(num)
                setMode('session')
              }}
              onAudioProcessed={(t: string, ai: any) => {
                setTranscript(t)
                setAiOutput(ai)
              }}
            />
          ) : mode === 'session' ? (
            <SessionMode
              selectedStudent={selectedStudent}
              mentorId={mentorId}
              activeSessionId={activeSessionId!}
              sessionNumber={sessionNumber}
              formData={formData}
              setFormData={setFormData}
              aiOutput={aiOutput}
              transcript={transcript}
              onAudioProcessed={(t: string, ai: any) => {
                setTranscript(t)
                setAiOutput(ai)
              }}
              onNext={() => setMode('validate')}
            />
          ) : mode === 'validate' ? (
            <ValidateMode
              selectedStudent={selectedStudent}
              mentorId={mentorId}
              activeSessionId={activeSessionId!}
              aiOutput={aiOutput}
              setAiOutput={setAiOutput}
              onNext={() => setMode('review')}
              onBack={() => setMode('session')}
            />
          ) : (
            <ReviewMode
              selectedStudent={selectedStudent}
              activeSessionId={activeSessionId!}
              formData={formData}
              aiOutput={aiOutput}
              onFinalize={async () => {
                await refreshStudents()
                setMode('briefing')
                setActiveSessionId(null)
                setFormData({})
                setAiOutput(null)
                setTranscript('')
              }}
              onBack={() => setMode('validate')}
            />
          )}
        </div>
      </div>
    </div>
  )
}