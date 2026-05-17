import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function MenteeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminClient = createAdminClient()
  
  const { data: profile } = await adminClient
    .from('student_profiles')
    .select('completed_at')
    .eq('student_id', user.id)
    .maybeSingle()

  if (!profile || !profile.completed_at) {
    redirect('/mentee/onboarding')
  }

  const { data: enrollments } = await adminClient
    .from('enrollments')
    .select('id')
    .eq('student_id', user.id)

  if (!enrollments || enrollments.length === 0) {
    redirect('/mentee/join-class')
  }

  return (
    <div className="min-h-screen bg-[#f4f4f6]">
      {children}
    </div>
  )
}
