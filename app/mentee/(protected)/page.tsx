'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  Target, 
  LogOut, 
  LayoutDashboard, 
  ChevronRight, 
  ChevronDown,
  GraduationCap,
  Clock,
  CheckSquare,
  History,
  AlertCircle,
  Edit2,
  X,
  Save,
  FileText,
  BookOpen,
  Activity,
} from 'lucide-react'
import { getSessionStatusBadge } from '@/lib/session-utils'

const QUICK_LINKS = [
  { label: 'Pre-Admission History', href: (id: string) => `/mentee/${id}/pre-admission`, icon: History, color: 'text-[#4f6ef7]', bg: 'bg-[#eef1fe]' },
  { label: 'Initial Questionnaire', href: (id: string) => `/mentee/${id}/questionnaire`, icon: FileText, color: 'text-[#7c3aed]', bg: 'bg-[#f3e8ff]' },
  { label: 'Goals Declaration', href: (id: string) => `/mentee/${id}/goals`, icon: Target, color: 'text-[#059669]', bg: 'bg-[#ecfdf5]' },
  { label: 'Backlogs', href: (id: string) => `/mentee/${id}/backlogs`, icon: AlertCircle, color: 'text-[#dc2626]', bg: 'bg-[#fef2f2]' },
  { label: 'Portfolio', href: (id: string) => `/mentee/${id}/portfolio/${encodeURIComponent('I Year I Sem')}`, icon: BookOpen, color: 'text-[#d97706]', bg: 'bg-[#fffbeb]' },
  { label: 'Psychometric Tests', href: (id: string) => `/mentee/${id}/psychometric/1`, icon: Activity, color: 'text-[#e11d48]', bg: 'bg-[#fff1f2]' },
] as const

// Types
interface DashboardData {
  latest_cgpa: number | null
  pending_task_count: number
  completed_session_count: number
  last_session: any | null
}

interface Task {
  id: string
  text: string
  due_by: string | null
  assigned_to: string
  status: string
  created_at: string
  session_id?: string | null
}

interface Session {
  id: string
  session_date: string
  session_label: string
  session_number: number
  session_status?: string
  status?: string
  structured_input: any
  ai_output: any
}

interface ProfileData {
  data: {
    goals?: {
      academic?: {
        statement: string
        activities: string
        success_criteria: string
      }
      personal?: {
        statement: string
        activities: string
        success_criteria: string
      }
      college_year?: string[]
    }
    [key: string]: any
  }
}

export default function MenteeDashboard() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'progress' | 'goals'>('tasks')
  const [loading, setLoading] = useState(true)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [isEditingGoals, setIsEditingGoals] = useState(false)
  const [editedGoals, setEditedGoals] = useState<any>(null)
  const [cgpaRecords, setCgpaRecords] = useState<any[]>([])
  const [subjectMarks, setSubjectMarks] = useState<any[]>([])

  const fetchData = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const [dashRes, tasksRes, sessionsRes, profileRes, cgpaRes, marksRes] = await Promise.all([
        fetch(`/api/student/dashboard?student_id=${uid}`).then(res => res.json()),
        fetch(`/api/tasks/pending?student_id=${uid}`).then(res => res.json()),
        fetch(`/api/student/sessions?student_id=${uid}`).then(res => res.json()),
        supabase.from('student_profiles').select('data').eq('student_id', uid).maybeSingle(),
        supabase.from('btech_sem_records').select('year, semester, cgpa').eq('student_id', uid).order('year').order('semester'),
        supabase.from('subject_marks').select('*').eq('student_id', uid).order('year').order('semester')
      ])

      setDashboardData(dashRes)
      setTasks(tasksRes.tasks || [])
      setSessions(sessionsRes.sessions || [])
      setProfileData(profileRes.data)
      setEditedGoals(profileRes.data?.data?.goals || {})
      setCgpaRecords(cgpaRes.data || [])
      setSubjectMarks(marksRes.data || [])

      const { data: profileName } = await supabase.from('profiles').select('name').eq('id', uid).single()
      setUserName(profileName?.name || 'Student')

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        fetchData(user.id)
      }
    }
    init()
  }, [supabase, fetchData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const markTaskComplete = async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, student_id: userId })
      })
      if (res.ok) {
        // Refresh tasks and dashboard count
        const tasksRes = await fetch(`/api/tasks/pending?student_id=${userId}`).then(res => res.json())
        setTasks(tasksRes.tasks || [])
        const dashRes = await fetch(`/api/student/dashboard?student_id=${userId}`).then(res => res.json())
        setDashboardData(dashRes)
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const toggleSession = (id: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpandedSessions(newExpanded)
  }

  const saveGoals = async () => {
    try {
      const res = await fetch('/api/student/update-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: userId, goals: editedGoals })
      })
      if (res.ok) {
        setProfileData(prev => prev ? { ...prev, data: { ...prev.data, goals: editedGoals } } : null)
        setIsEditingGoals(false)
      }
    } catch (error) {
      console.error('Error saving goals:', error)
    }
  }

  // --- Charts Logic ---
  const renderCgpaChart = () => {
    if (cgpaRecords.length === 0) return <p className="text-[#9090a0] text-center py-8">No academic records yet</p>

    const width = 500
    const height = 150
    const padding = 30
    const maxCgpa = 10
    const points = cgpaRecords.map((r, i) => {
      const x = padding + (i * (width - 2 * padding) / (cgpaRecords.length > 1 ? cgpaRecords.length - 1 : 1))
      const y = height - padding - (r.cgpa * (height - 2 * padding) / maxCgpa)
      return { x, y, label: `Y${r.year}S${r.semester}` }
    })

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]">
          {/* Grid lines */}
          {[0, 2.5, 5, 7.5, 10].map((val) => {
            const y = height - padding - (val * (height - 2 * padding) / maxCgpa)
            return (
              <line key={val} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e4e4e9" strokeDasharray="4" />
            )
          })}
          {/* Path */}
          <path d={pathD} fill="none" stroke="#4f6ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#4f6ef7" />
              <text x={p.x} y={height - 5} textAnchor="middle" fontSize="10" fill="#9090a0">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  const renderAttendanceChart = () => {
    const attendanceData = sessions
      .map(s => s.structured_input?.mentor?.attendance?.fortnightly_records 
        || s.structured_input?.attendance?.fortnightly_records
        || s.structured_input?.fortnightly_records)
      .filter(Boolean)
      .flat()
      .sort((a: any, b: any) => (a.fortnight_number || 0) - (b.fortnight_number || 0))

    if (attendanceData.length === 0) return <p className="text-[#9090a0] text-center py-8">No attendance records yet</p>

    const width = 500
    const height = 150
    const padding = 30
    const maxAtt = 100
    const points = attendanceData.map((r, i) => {
      const x = padding + (i * (width - 2 * padding) / (attendanceData.length > 1 ? attendanceData.length - 1 : 1))
      const y = height - padding - (r.percentage * (height - 2 * padding) / maxAtt)
      return { x, y, label: `F${r.fortnight_number}` }
    })

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]">
          {[0, 25, 50, 75, 100].map((val) => {
            const y = height - padding - (val * (height - 2 * padding) / maxAtt)
            return (
              <line key={val} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e4e4e9" strokeDasharray="4" />
            )
          })}
          <path d={pathD} fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#059669" />
              <text x={p.x} y={height - 5} textAnchor="middle" fontSize="10" fill="#9090a0">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4f6ef7] border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f4f4f6]">
      {/* LEFT SIDEBAR */}
      <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#1e1e2e] flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-[#e8e8f0] font-semibold text-sm line-clamp-1">{userName}</div>
              <div className="text-[#52525e] text-xs">Student</div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: tasks.length },
              { id: 'history', label: 'Session History', icon: History },
              { id: 'progress', label: 'Progress', icon: TrendingUp },
              { id: 'goals', label: 'Goals', icon: Target },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                  activeTab === item.id 
                    ? 'bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]' 
                    : 'text-[#e8e8f0] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="bg-[#4f6ef7] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#52525e] hover:text-[#e8e8f0] text-sm transition-colors w-full"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT */}
      <main className="flex-1 ml-[260px]">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#e4e4e9] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-[#111116] font-bold text-xl">Student Dashboard</h1>
          <div className="text-[#52525e] text-sm flex items-center gap-2">
            <span>Welcome,</span>
            <span className="font-semibold text-[#111116]">{userName}</span>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#9090a0] text-xs font-medium uppercase tracking-wider">Current CGPA</span>
                <GraduationCap className="text-[#4f6ef7]" size={20} />
              </div>
              <div className="text-2xl font-bold text-[#111116]">{dashboardData?.latest_cgpa?.toFixed(2) || '—'}</div>
            </div>
            <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#9090a0] text-xs font-medium uppercase tracking-wider">Pending Tasks</span>
                <CheckSquare className="text-[#f59e0b]" size={20} />
              </div>
              <div className={`text-2xl font-bold ${tasks.length > 0 ? 'text-[#dc2626]' : 'text-[#111116]'}`}>
                {tasks.length}
              </div>
            </div>
            <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#9090a0] text-xs font-medium uppercase tracking-wider">Sessions</span>
                <Clock className="text-[#059669]" size={20} />
              </div>
              <div className="text-2xl font-bold text-[#111116]">{dashboardData?.completed_session_count || 0}</div>
            </div>
          </div>

          {/* Quick Links */}
          {userId && (
            <section className="mb-6">
              <h2 className="text-[#111116] font-bold text-lg mb-4">Quick Links</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {QUICK_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href(userId)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-[#e4e4e9] bg-white hover:bg-[#fcfcfd] transition-colors shadow-sm group"
                  >
                    <div className={`p-3 rounded-lg ${link.bg} ${link.color} group-hover:scale-105 transition-transform`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-[#111116] text-sm">{link.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Last Session Detail Card */}
          {dashboardData?.last_session && (
            <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-[#4f6ef7] rounded-full"></div>
                <h2 className="font-bold text-[#111116]">Last Session Feedback</h2>
                <span className="text-xs text-[#9090a0] ml-auto">
                  {dashboardData.last_session.session_label || `Session ${dashboardData.last_session.session_number}`}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-2">Mentor Observation</h3>
                  <p className="text-[#52525e] text-sm leading-relaxed">
                    {dashboardData.last_session.structured_input?.mentor_observation || 'No observations recorded.'}
                  </p>
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-2">Mentor Recommendation</h3>
                  <p className="text-[#52525e] text-sm leading-relaxed">
                    {dashboardData.last_session.structured_input?.mentor_recommendation || 'No recommendations recorded.'}
                  </p>
                </div>
              </div>
              {dashboardData.last_session.ai_output?.summary && (
                <div className="mt-4 pt-4 border-t border-[#e4e4e9]">
                  <h3 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-2">AI Summary</h3>
                  <p className="text-[#9090a0] text-sm italic">
                    {dashboardData.last_session.ai_output.summary}
                  </p>
                </div>
              )}
            </div>
          )}



          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'tasks' && (
              <div>
                <h2 className="text-[#111116] font-bold text-lg mb-4">Your Tasks</h2>
                {tasks.length === 0 ? (
                  <div className="bg-white border border-[#e4e4e9] rounded-xl p-12 text-center shadow-sm">
                    <div className="bg-[#ecfdf5] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-[#059669]" />
                    </div>
                    <p className="text-[#9090a0]">No pending tasks — great work!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="bg-white border border-[#e4e4e9] rounded-xl p-4 shadow-sm flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-[#111116] text-sm font-medium">{task.text}</p>
                          <div className="flex items-center gap-3">
                            {task.due_by && (
                              <span className={`text-xs ${new Date(task.due_by) < new Date() && task.status !== 'completed' ? 'text-[#dc2626]' : 'text-[#9090a0]'}`}>
                                Due: {new Date(task.due_by).toLocaleDateString()}
                              </span>
                            )}
                            {task.due_by && new Date(task.due_by) < new Date() && task.status !== 'completed' && (
                              <span className="bg-[#fef2f2] text-[#dc2626] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                                Overdue
                              </span>
                            )}
                            {task.assigned_to !== 'student' && (
                              <span className="bg-[#eef1fe] text-[#4f6ef7] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                                Assigned to: {task.assigned_to}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => markTaskComplete(task.id)}
                          className="bg-[#ecfdf5] text-[#059669] text-xs px-3 py-1.5 rounded-lg hover:bg-[#d1fae5] transition-colors font-semibold"
                        >
                          Mark Complete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h2 className="text-[#111116] font-bold text-lg mb-4">Session History</h2>
                {sessions.some((s) => (s.session_status || s.status) === 'mentor_review') && (
                  <div className="bg-[#eef1fe] border border-[#c7d2fe] rounded-xl p-4 mb-4 text-[13px] text-[#3548c9]">
                    You have session(s) waiting for your review and acknowledgement. Open a session below to acknowledge.
                  </div>
                )}
                {sessions.length === 0 ? (
                  <div className="bg-white border border-[#e4e4e9] rounded-xl p-12 text-center shadow-sm text-[#9090a0]">
                    No sessions yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => {
                      const statusBadge = getSessionStatusBadge(session)
                      const needsAck = (session.session_status || session.status) === 'mentor_review'
                      return (
                      <div key={session.id} className="bg-white border border-[#e4e4e9] rounded-xl overflow-hidden shadow-sm">
                        <button
                          onClick={() => toggleSession(session.id)}
                          className="w-full px-4 py-4 flex items-center justify-between hover:bg-[#fcfcfd] transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-bold text-[#111116] text-sm">
                              {session.session_label || `Session ${session.session_number}`}
                            </span>
                            <span className="text-[#9090a0] text-xs">
                              {new Date(session.session_date).toLocaleDateString()}
                            </span>
                            <span className="bg-[#f8f8fb] text-[#9090a0] text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest">
                              #{session.session_number}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          {expandedSessions.has(session.id) ? <ChevronDown size={18} className="text-[#9090a0]" /> : <ChevronRight size={18} className="text-[#9090a0]" />}
                        </button>

                        {expandedSessions.has(session.id) && (
                          <div className="px-4 pb-4 border-t border-[#e4e4e9] pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-1">Mentor Observation</h4>
                                <p className="text-[#52525e] text-sm">{session.structured_input?.mentor_observation || 'N/A'}</p>
                              </div>
                              <div>
                                <h4 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-1">Mentor Recommendation</h4>
                                <p className="text-[#52525e] text-sm">{session.structured_input?.mentor_recommendation || 'N/A'}</p>
                              </div>
                            </div>
                            {session.ai_output?.summary && (
                              <div>
                                <h4 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-1">AI Summary</h4>
                                <p className="text-[#9090a0] text-sm italic">{session.ai_output.summary}</p>
                              </div>
                            )}
                            {/* Tasks from this session */}
                            {tasks.filter(t => t.session_id === session.id).length > 0 && (
                              <div>
                                <h4 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-1">Tasks Assigned</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {tasks.filter(t => t.session_id === session.id).map(t => (
                                    <li key={t.id} className="text-sm text-[#52525e]">{t.text}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <Link
                              href={`/session/${session.id}`}
                              className={`inline-flex text-[13px] font-bold hover:underline ${
                                needsAck ? 'text-[#059669]' : 'text-[#4f6ef7]'
                              }`}
                            >
                              {needsAck ? 'Review & acknowledge session →' : 'View full session →'}
                            </Link>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#111116] mb-4">CGPA Trend</h3>
                  {renderCgpaChart()}
                </div>

                <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#111116] mb-4">Attendance Trend</h3>
                  {renderAttendanceChart()}
                </div>

                <div className="bg-white border border-[#e4e4e9] rounded-xl overflow-hidden shadow-sm">
                  <div className="p-6">
                    <h3 className="font-bold text-[#111116] mb-4">Subject Marks</h3>
                    {subjectMarks.length === 0 ? (
                      <p className="text-[#9090a0] text-center py-4">No subject marks recorded yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-[#f8f8fb]">
                              <th className="px-4 py-3 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Course</th>
                              <th className="px-4 py-3 text-center text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Mid 1</th>
                              <th className="px-4 py-3 text-center text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Mid 2</th>
                              <th className="px-4 py-3 text-center text-[11px] font-black text-[#9090a0] uppercase tracking-widest">End Sem</th>
                              <th className="px-4 py-3 text-center text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e4e4e9]">
                            {subjectMarks.map((mark, i) => (
                              <tr key={i} className="hover:bg-[#fcfcfd] transition-colors">
                                <td className="px-4 py-3 text-sm text-[#111116] font-medium">{mark.course_name}</td>
                                <td className="px-4 py-3 text-sm text-center text-[#52525e]">{mark.mid1}</td>
                                <td className="px-4 py-3 text-sm text-center text-[#52525e]">{mark.mid2}</td>
                                <td className="px-4 py-3 text-sm text-center text-[#52525e]">{mark.end_sem}</td>
                                <td className="px-4 py-3 text-sm text-center font-bold text-[#4f6ef7]">{mark.total_marks}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'goals' && (
              <div className="space-y-6">
                {!profileData ? (
                  <div className="bg-white border border-[#e4e4e9] rounded-xl p-12 text-center shadow-sm">
                    <AlertCircle className="text-[#f59e0b] mx-auto mb-4" size={32} />
                    <p className="text-[#9090a0]">Complete your profile to see your goals</p>
                    <a href="/mentee/onboarding" className="text-[#4f6ef7] text-sm font-semibold mt-2 inline-block hover:underline">Go to Onboarding</a>
                  </div>
                ) : (
                  <>
                    {/* Academic Goal */}
                    <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm relative group">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-[#111116] flex items-center gap-2">
                          <GraduationCap size={18} className="text-[#4f6ef7]" />
                          Academic Goal
                        </h3>
                        <button 
                          onClick={() => setIsEditingGoals(!isEditingGoals)}
                          className="text-[#9090a0] hover:text-[#4f6ef7] transition-colors"
                        >
                          {isEditingGoals ? <X size={18} /> : <Edit2 size={18} />}
                        </button>
                      </div>

                      {isEditingGoals ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Goal Statement</label>
                            <textarea 
                              className="w-full bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg p-3 text-sm focus:border-[#4f6ef7] focus:outline-none"
                              rows={2}
                              value={editedGoals.academic?.statement || ''}
                              onChange={(e) => setEditedGoals({ ...editedGoals, academic: { ...editedGoals.academic, statement: e.target.value } })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Activities Planned</label>
                            <textarea 
                              className="w-full bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg p-3 text-sm focus:border-[#4f6ef7] focus:outline-none"
                              rows={2}
                              value={editedGoals.academic?.activities || ''}
                              onChange={(e) => setEditedGoals({ ...editedGoals, academic: { ...editedGoals.academic, activities: e.target.value } })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Success Criteria</label>
                            <textarea 
                              className="w-full bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg p-3 text-sm focus:border-[#4f6ef7] focus:outline-none"
                              rows={2}
                              value={editedGoals.academic?.success_criteria || ''}
                              onChange={(e) => setEditedGoals({ ...editedGoals, academic: { ...editedGoals.academic, success_criteria: e.target.value } })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <p className="text-[#111116] font-medium text-sm">{profileData.data?.goals?.academic?.statement || 'No statement set'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Activities</span>
                              <p className="text-[#52525e] text-sm">{profileData.data?.goals?.academic?.activities || 'None'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Success Criteria</span>
                              <p className="text-[#52525e] text-sm">{profileData.data?.goals?.academic?.success_criteria || 'None'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Personal Goal */}
                    <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-[#111116] flex items-center gap-2 mb-4">
                        <Target size={18} className="text-[#7c3aed]" />
                        Personal Goal
                      </h3>
                      {isEditingGoals ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Goal Statement</label>
                            <textarea 
                              className="w-full bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg p-3 text-sm focus:border-[#4f6ef7] focus:outline-none"
                              rows={2}
                              value={editedGoals.personal?.statement || ''}
                              onChange={(e) => setEditedGoals({ ...editedGoals, personal: { ...editedGoals.personal, statement: e.target.value } })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Activities Planned</label>
                            <textarea 
                              className="w-full bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg p-3 text-sm focus:border-[#4f6ef7] focus:outline-none"
                              rows={2}
                              value={editedGoals.personal?.activities || ''}
                              onChange={(e) => setEditedGoals({ ...editedGoals, personal: { ...editedGoals.personal, activities: e.target.value } })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <p className="text-[#111116] font-medium text-sm">{profileData.data?.goals?.personal?.statement || 'No statement set'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest block mb-1">Activities</span>
                            <p className="text-[#52525e] text-sm">{profileData.data?.goals?.personal?.activities || 'None'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* College Year Goals */}
                    <div className="bg-white border border-[#e4e4e9] rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-[#111116] flex items-center gap-2 mb-4">
                        <Calendar size={18} className="text-[#f59e0b]" />
                        College Year Goals
                      </h3>
                      {isEditingGoals ? (
                        <div className="space-y-3">
                          {Array.from({ length: Math.min(4, Math.max(2, (editedGoals.college_year?.length || 0) + 1)) }).map((_, idx) => (
                            <input 
                              key={idx}
                              type="text"
                              className="w-full bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg p-3 text-sm focus:border-[#4f6ef7] focus:outline-none"
                              value={editedGoals.college_year?.[idx] || ''}
                              onChange={(e) => {
                                const newGoals = [...(editedGoals.college_year || ['', ''])]
                                newGoals[idx] = e.target.value
                                setEditedGoals({ ...editedGoals, college_year: newGoals })
                              }}
                              placeholder={`Goal ${idx + 1}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {(profileData.data?.goals?.college_year || []).map((goal, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-[#52525e]">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div>
                              {goal}
                            </li>
                          ))}
                          {(!profileData.data?.goals?.college_year || profileData.data?.goals?.college_year.length === 0) && (
                            <li className="text-[#9090a0] text-sm italic">No college year goals set</li>
                          )}
                        </ul>
                      )}
                    </div>

                    {isEditingGoals && (
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => {
                            setIsEditingGoals(false)
                            setEditedGoals(profileData.data?.goals || {})
                          }}
                          className="px-6 py-2 bg-white border border-[#d1d1db] hover:bg-[#f8f8fb] text-[#111116] rounded-xl text-sm font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={saveGoals}
                          className="px-6 py-2 bg-[#4f6ef7] hover:bg-[#3d5ce8] text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Save size={18} />
                          Save Changes
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
