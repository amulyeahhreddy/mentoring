import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 text-white flex flex-col">
        {/* Admin name at top */}
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold">{profile.name}</h2>
          <p className="text-sm text-gray-400">Administrator</p>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <Link
                href="/admin"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                href="/admin/users"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Users
              </Link>
            </li>
            <li>
              <Link
                href="/admin/classes"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Classes
              </Link>
            </li>
            <li>
              <Link
                href="/admin/enrollments"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Enrollments
              </Link>
            </li>
          </ul>
        </nav>

        {/* Logout button at bottom */}
        <div className="p-4 border-t border-gray-800">
          <SignOutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
