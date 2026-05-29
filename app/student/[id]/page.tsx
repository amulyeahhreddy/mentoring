'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText, 
  Target, 
  BookOpen, 
  History, 
  Activity,
  AlertCircle
} from 'lucide-react'
import ExtendedProfileForm from '@/components/mentee/ExtendedProfileForm'
import PreCollegeActivities from '@/components/mentee/PreCollegeActivities'

interface Profile {
  id: string
  email: string
  role: string
  created_at: string
  full_name?: string
  roll_number?: string
  [key: string]: any
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
  const supabase = createClient()

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
  }, [id, supabase])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const QUICK_LINKS = [
    { label: 'Pre-Admission History', href: `/mentee/${id}/pre-admission`, icon: History, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Initial Questionnaire', href: `/mentee/${id}/questionnaire`, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Goals & Sign-off', href: `/mentee/${id}/goals`, icon: Target, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Portfolio (Current Sem)', href: `/mentee/${id}/portfolio/I%20Year%20I%20Sem`, icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Psychometric Test', href: `/mentee/${id}/psychometric/1`, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Backlogs Tracking', href: `/mentee/${id}/backlogs`, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' }
  ]

  const totalSessions = sessions.length
  const totalTasks = tasks.length
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const lastSessionDate = sessions[0]?.created_at

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold uppercase shadow-sm">
          {student?.full_name?.charAt(0) || student?.email?.charAt(0) || 'S'}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{student?.full_name || 'Student Profile'}</h1>
          <p className="text-muted-foreground mt-1">
            {student?.email} {student?.roll_number ? `• ${student.roll_number}` : ''}
          </p>
        </div>
      </div>
      
      {/* Quick Links Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map(link => (
            <Link 
              key={link.href} 
              href={link.href}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm group"
            >
              <div className={`p-3 rounded-lg ${link.bg} ${link.color} group-hover:scale-110 transition-transform`}>
                <link.icon className="w-5 h-5" />
              </div>
              <span className="font-semibold">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Extended Profile Edit Form */}
      <section>
        <ExtendedProfileForm studentId={id} initialData={student} />
      </section>

      {/* Pre-College Activities */}
      <PreCollegeActivities studentId={id} />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Sessions</p>
          <p className="text-2xl font-bold">{totalSessions}</p>
        </div>
        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Tasks</p>
          <p className="text-2xl font-bold">{totalTasks}</p>
        </div>
        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Pending Tasks</p>
          <p className="text-2xl font-bold text-amber-600">{pendingTasks}</p>
        </div>
        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Last Session</p>
          <p className="text-lg font-bold">
            {lastSessionDate ? new Date(lastSessionDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Session History</h2>
          <div className="bg-card border rounded-xl shadow-sm divide-y">
            {sessions.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">No sessions recorded yet.</p>
            ) : (
              sessions.map(session => (
                <div key={session.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                  <div>
                    <p className="font-medium">Session on {new Date(session.created_at).toLocaleDateString()}</p>
                    {session.notes && <p className="text-sm text-muted-foreground truncate max-w-sm mt-1">{session.notes}</p>}
                  </div>
                  <Link href={`/session/${session.id}`} className="text-sm font-medium text-primary hover:underline">
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Tasks Overview</h2>
          <div className="bg-card border rounded-xl shadow-sm divide-y">
            {tasks.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">No tasks recorded yet.</p>
            ) : (
              tasks.map(task => {
                let text = task.text
                try {
                  const parsed = JSON.parse(task.text)
                  text = parsed.text || task.text
                } catch {}

                return (
                  <div key={task.id} className="p-4 flex items-start justify-between hover:bg-muted/30 gap-4">
                    <span className="text-sm font-medium leading-tight">{text}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {task.status}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
