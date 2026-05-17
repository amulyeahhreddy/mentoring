import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from './components/AdminNav'
import SignOutButton from './components/sign-out-button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-[#f4f4f6] font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e1e2e] text-white flex flex-col shadow-2xl relative z-50">
        {/* Admin name at top */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white/[0.08] rounded-lg flex items-center justify-center text-white backdrop-blur-md">
              <i className="ti ti-settings text-xl"></i>
            </div>
            <h1 className="text-[13px] font-semibold text-[#e8e8f0] tracking-tight">Admin Console</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-[14px] font-bold shadow-lg">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-[12px] font-medium text-[#e8e8f0] tracking-tight">{profile.name}</h2>
              <p className="text-[10px] text-[#52525e] font-medium uppercase tracking-[0.1em]">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <AdminNav items={[
          { label: 'Overview', href: '/admin', icon: 'ti-layout-dashboard' },
          { label: 'Users', href: '/admin/users', icon: 'ti-users' },
          { label: 'Classes', href: '/admin/classes', icon: 'ti-school' },
          { label: 'Enrollments', href: '/admin/enrollments', icon: 'ti-link' }
        ]} />

        {/* Logout button at bottom */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.05)] bg-white/[0.02]">
          <SignOutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto relative">
        <main className="min-h-full">
          {children}
        </main>
      </div>
    </div>
  )
}
