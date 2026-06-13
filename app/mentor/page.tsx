'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StudentList from '@/components/mentor/StudentList'
import BriefingMode from '@/components/mentor/BriefingMode'
import SessionMode from '@/components/mentor/SessionMode'
import RecordMode from '@/components/mentor/RecordMode'
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

  const handleNewSession = useCallback(async () => {
    if (!selectedStudent?.id || !mentorId) {
      console.error('Cannot create session: missing student or mentor')
      return
    }

    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          mentor_id: mentorId,
          session_date: new Date().toISOString().split('T')[0],
          academic_year: '2025-26'
        })
      })
      
      const data = await res.json()
      
      if (data.success && data.session_id) {
        setActiveSessionId(data.session_id)
        setAiOutput(null)
        setMode('session')
      } else {
        console.error('Failed to create session via API:', data.error)
      }
    } catch (error) {
      console.error('Network error creating session:', error)
    }
  }, [selectedStudent, mentorId])

  return (
    <div className="flex h-screen bg-[#f4f4f6] text-[#111116] overflow-hidden font-sans">
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
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#e4e4e9] shrink-0 transition-all duration-150 ease-out">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-[2px] bg-[#4f6ef7]" />
            <span className="text-[14px] font-semibold text-[#111116]">MentorOS</span>
          </div>
          <div className="flex items-center gap-1">
            {(['briefing', 'session', 'validate', 'review'] as const).map((m, idx, arr) => {
              const activeIdx = arr.indexOf(mode)
              const isCompleted = idx < activeIdx
              const isActive = mode === m
              return (
                <div key={m} className="flex items-center">
                  <div className="flex items-center gap-2 px-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-[#4f6ef7] ring-4 ring-[#4f6ef7]/15' : isCompleted ? 'bg-[#059669]' : 'border border-[#d1d1db] bg-white'}`} />
                    <span className={`text-[11px] font-medium capitalize tracking-wide transition-colors ${isActive ? 'text-[#4f6ef7]' : isCompleted ? 'text-[#9090a0] line-through' : 'text-[#9090a0]'}`}>
                      {m === 'briefing' ? 'Overview' : m === 'validate' ? 'Record' : m}
                    </span>
                  </div>
                  {idx < arr.length - 1 && <div className="w-8 h-[1px] bg-[#e4e4e9]" />}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-[#52525e]">{mentorName || 'Mentor'}</span>
            <div className="w-[1px] h-4 bg-[#e4e4e9]" />
            <button 
              onClick={handleLogout} 
              className="text-[13px] text-[#52525e] hover:bg-[#f4f4f6] px-3 py-1.5 rounded-lg transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {!selectedStudent ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-[#e4e4e9] flex items-center justify-center text-3xl">
                  🎓
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#111116] mb-1">Select a student</h3>
                  <p className="text-[#9090a0] text-[13px] mb-4">Choose a student from the sidebar to begin or resume a mentoring session.</p>
                  <div className="flex gap-3 justify-center">
                    <button className="px-4 py-2 bg-[#4f6ef7] text-white rounded-lg text-[13px] font-medium hover:bg-[#3f5ce5] transition-colors shadow-sm">Add Student</button>
                    <button className="px-4 py-2 bg-white border border-[#d1d1db] text-[#111116] rounded-lg text-[13px] font-medium hover:bg-[#f4f4f6] transition-colors shadow-sm">Join Class</button>
                  </div>
                </div>
              </div>
            </div>
          ) : mode === 'briefing' ? (
            <BriefingMode
              selectedStudent={selectedStudent}
              mentorId={mentorId}
              onNewSession={handleNewSession}
              onSelectSession={(sessionId: string) => {
                setActiveSessionId(sessionId)
                setMode('session')
              }}
            />
          ) : mode === 'session' ? (
            <SessionMode
              selectedStudent={selectedStudent}
              mentorId={mentorId}
              activeSessionId={activeSessionId!}
              onComplete={() => setMode('validate')}
            />
          ) : mode === 'validate' ? (
            <RecordMode
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
              mentorId={mentorId}
              activeSessionId={activeSessionId!}
              onBack={(savedOutput?: any) => {
                if (savedOutput) setAiOutput(savedOutput)
                setMode('validate')
              }}
              onSubmitComplete={async () => {
                await refreshStudents()
                setMode('briefing')
                setActiveSessionId(null)
                setFormData({})
                setAiOutput(null)
                setTranscript('')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}