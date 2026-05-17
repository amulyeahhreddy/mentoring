import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#f8f8fb] rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#9090a0] shadow-sm border border-[#e4e4e9]">
                    <i className="ti ti-activity"></i>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#111116]">New student enrollment processed</p>
                    <p className="text-[11px] text-[#9090a0]">System Log &middot; 2 hours ago</p>
                  </div>
                </div>
                <button className="text-[11px] font-medium text-[#4f6ef7] hover:underline">Details</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111116] rounded-xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                <i className="ti ti-shield-check text-2xl text-[#10b981]"></i>
              </div>
              <h3 className="text-[17px] font-semibold tracking-tight mb-2">System Security</h3>
              <p className="text-[13px] text-[#9090a0] leading-relaxed">Your administration console is secured with 256-bit encryption and multi-factor authentication.</p>
            </div>
            <button className="w-full py-4 bg-white text-[#111116] text-[13px] font-medium rounded-xl hover:bg-gray-100 transition-all mt-10">
              Audit Access Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
