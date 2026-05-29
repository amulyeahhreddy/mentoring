import { createClient } from '@/lib/supabase/server'
import BacklogTracker from '@/components/mentee/BacklogTracker'
import { redirect } from 'next/navigation'

export default async function BacklogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: records } = await supabase
    .from('backlog_records')
    .select('*')
    .eq('student_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backlog Tracker</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage active and cleared course backlogs across attempts.
        </p>
      </div>
      
      <BacklogTracker 
        studentId={id} 
        initialData={records || []} 
        userRole={profile?.role || 'mentee'} 
      />
    </div>
  )
}
