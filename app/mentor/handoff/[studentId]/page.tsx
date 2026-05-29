import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HandoffForm from '@/components/mentor/HandoffForm'

export default async function MentorHandoffPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
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

  if (profile?.role !== 'mentor') {
    redirect('/dashboard') // Or some unauthorized page
  }

  // Find the active/current assignment for this mentor and student
  const { data: assignment } = await supabase
    .from('mentor_assignments')
    .select('*')
    .eq('student_id', studentId)
    .eq('mentor_id', user.id)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  if (!assignment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          You are not currently assigned to this student, or the assignment record could not be found.
        </div>
      </div>
    )
  }

  // Also fetch student details for context
  const { data: student } = await supabase
    .from('profiles')
    .select('full_name, roll_number')
    .eq('id', studentId)
    .single()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mentor Handoff Report</h1>
        <p className="text-muted-foreground mt-2">
          Complete this handoff report for {student?.full_name} ({student?.roll_number}). This provides crucial context for the next mentor.
        </p>
      </div>
      
      <HandoffForm studentId={studentId} assignmentId={assignment.id} initialData={assignment} />
    </div>
  )
}
