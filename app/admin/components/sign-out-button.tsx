'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center gap-3 px-3 py-2.5 bg-transparent hover:bg-white/5 rounded-lg transition-all text-[#52525e] hover:text-[#e8e8f0] group"
    >
      <i className="ti ti-logout text-[16px]"></i>
      <span className="text-[13px] font-medium">Sign out</span>
    </button>
  )
}
