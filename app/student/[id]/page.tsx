'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

interface Profile {
  id: string
  email: string
  role: string
  created_at: string
}

interface Session {
  id: string
  student_id: string
  mentor_id: string
  created_at: string
  notes?: string
}

interface Task {
  id: string
  student_id: string
  text: string
  status: string
  created_at: string
}

export default function StudentProfilePage() {
  const params = useParams()
  const id = params.id as string
  const [student, setStudent] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: studentData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: true })

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false })

      setStudent(studentData)
      setSessions(sessionsData || [])
      setTasks(tasksData || [])
      setLoading(false)
    }

    if (id) {
      fetchData()
    }
  }, [id])

  if (loading) {
    return <p>Loading...</p>
  }

  const totalSessions = sessions.length
  const totalTasks = tasks.length
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const lastSessionDate = sessions[0]?.created_at

  return (
    <div>
      <h1>{student?.email}</h1>
      
      <div>
        <p>Total Sessions: {totalSessions}</p>
        <p>Total Tasks: {totalTasks}</p>
        <p>Pending Tasks: {pendingTasks}</p>
        <p>
          Last Session: {lastSessionDate
            ? new Date(lastSessionDate).toLocaleDateString()
            : 'N/A'}
        </p>
      </div>

      <div>
        <h2>Session History</h2>
        {sessions.map(session => (
          <div key={session.id}>
            <p>{new Date(session.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      <div>
        <h2>Tasks Overview</h2>
        {tasks.map(task => {
          let text = task.text

          try {
            const parsed = JSON.parse(task.text)
            text = parsed.text || task.text
          } catch {}

          return (
            <div key={task.id}>
              <span>{text}</span>
              <span>({task.status})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
