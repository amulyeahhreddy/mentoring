import { createClient } from '@/lib/supabase/server'
import GoalsForm from '@/components/mentee/GoalsForm'
import { redirect } from 'next/navigation'

export default async function GoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch role to know if the viewer is a mentor or mentee
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'mentee' && user.id !== id) {
    redirect(`/mentee/${user.id}/goals`);
  }

  const { data: record } = await supabase
    .from('goals_declaration')
    .select('*')
    .eq('student_id', id)
    .single()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Goals Declaration</h1>
        <p className="text-muted-foreground mt-2">
          Declare your academic and personal goals. Once signed, they will be reviewed by your mentor annually.
        </p>
      </div>
      
      <GoalsForm 
        studentId={id} 
        initialData={record} 
        userRole={profile?.role || 'mentee'} 
      />
    </div>
  )
}
