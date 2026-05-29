import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import AuditLogsWidget from '@/components/admin/AuditLogsWidget'

export default async function AdminOverview() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Get counts using admin client
  const { count: mentorsCount } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'mentor')

  const { count: studentsCount } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'mentee')

  const { count: classesCount } = await adminClient
    .from('classes')
    .select('*', { count: 'exact', head: true })

  const { count: enrollmentsCount } = await adminClient
    .from('enrollments')
    .select('*', { count: 'exact', head: true })

  const { count: completedSessionsCount } = await adminClient
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { count: draftSessionsCount } = await adminClient
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  const { data: recentSessions } = await adminClient
    .from('sessions')
    .select(`
      id,
      session_number,
      session_date,
      status,
      created_at,
      updated_at,
      profiles!sessions_student_id_fkey(name),
      mentor:profiles!sessions_mentor_id_fkey(name)
    `)
    .order('updated_at', { ascending: false })
    .limit(6)

  const { data: recentEnrollments } = await adminClient
    .from('enrollments')
    .select(`
      enrolled_at,
      profiles!enrollments_student_id_fkey(name),
      classes(name)
    `)
    .order('enrolled_at', { ascending: false })
    .limit(3)

  type ActivityItem = {
    icon: string
    iconColor: string
    text: string
    sub: string
    time: string
  }

  const activities: ActivityItem[] = []

  recentSessions?.forEach(s => {
    const studentProfile = s.profiles as any
    const mentorProfile = s.mentor as any

    const studentName = Array.isArray(studentProfile)
      ? studentProfile[0]?.name
      : studentProfile?.name || 'A student'

    const mentorName = Array.isArray(mentorProfile)
      ? mentorProfile[0]?.name
      : mentorProfile?.name || 'A mentor'

    const isCompleted = s.status === 'completed'
    activities.push({
      icon: isCompleted ? 'ti-circle-check' : 'ti-notes',
      iconColor: isCompleted ? '#059669' : '#4f6ef7',
      text: isCompleted
        ? `Session ${s.session_number} finalized for ${studentName}`
        : `Session ${s.session_number} draft saved for ${studentName}`,
      sub: `Mentor: ${mentorName}`,
      time: s.updated_at
    })
  })

  recentEnrollments?.forEach(e => {
    const studentProfile = e.profiles as any
    const classData = e.classes as any

    const studentName = Array.isArray(studentProfile)
      ? studentProfile[0]?.name
      : studentProfile?.name || 'A student'

    const className = Array.isArray(classData)
      ? classData[0]?.name
      : classData?.name || 'a class'

    activities.push({
      icon: 'ti-user-plus',
      iconColor: '#7c3aed',
      text: `${studentName} enrolled in ${className}`,
      sub: 'New enrollment',
      time: e.enrolled_at
    })
  })

  // Sort by time descending, take top 5
  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const topActivities = activities.slice(0, 5)

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#111116] tracking-tight">System Overview</h1>
          <p className="text-[13px] text-[#9090a0] font-normal">Real-time platform statistics and metrics.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-[#d1d1db] text-[#111116] text-[13px] font-medium rounded-xl hover:bg-[#f8f8fb] transition-all">Export Report</button>
          <button className="px-5 py-2.5 bg-[#4f6ef7] text-white text-[13px] font-medium rounded-xl hover:bg-[#3d5ce8] transition-all">Refresh Data</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Mentors', count: mentorsCount, color: '#4f6ef7', icon: 'ti-user-bolt' },
          { label: 'Total Students', count: studentsCount, color: '#10b981', icon: 'ti-users-group' },
          { label: 'Total Classes', count: classesCount, color: '#7c3aed', icon: 'ti-layout-grid' },
          { label: 'Total Enrollments', count: enrollmentsCount, color: '#f59e0b', icon: 'ti-link' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-xl border border-[#e4e4e9] shadow-sm hover:shadow-xl hover:shadow-[#111116]/5 transition-all group relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: stat.color }}
              >
                <i className={`ti ${stat.icon} text-xl`}></i>
              </div>
              
              <div>
                <div className="text-[28px] font-bold text-[#111116] tracking-tight">
                  {stat.count || 0}
                </div>
                <div className="text-[11px] font-medium text-[#9090a0] uppercase tracking-widest mt-1">
                  {stat.label}
                </div>
              </div>

              <div className="pt-4 border-t border-[#f4f4f6] flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#9090a0] flex items-center gap-1">
                  <i className="ti ti-trending-up"></i> +0% this month
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e4e4e9] shadow-sm p-8">
          <h3 className="text-[14px] font-semibold text-[#111116] mb-6">Recent Platform Activity</h3>
          <div className="space-y-4">
            {topActivities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[13px] text-[#9090a0]">No recent activity</p>
              </div>
            ) : (
              topActivities.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#f8f8fb] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e4e4e9]"
                      style={{ color: item.iconColor }}
                    >
                      <i className={`ti ${item.icon}`}></i>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#111116]">{item.text}</p>
                      <p className="text-[11px] text-[#9090a0]">
                        {item.sub} &middot; {new Date(item.time).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <AuditLogsWidget 
          completedSessions={completedSessionsCount || 0}
          draftSessions={draftSessionsCount || 0}
          mentorsCount={mentorsCount || 0}
        />
      </div>
    </div>
  )
}
