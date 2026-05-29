import { createClient } from '@/lib/supabase/server'
import QuestionnaireForm from '@/components/mentee/QuestionnaireForm'
import { redirect } from 'next/navigation'

export default async function QuestionnairePage({ params }: { params: Promise<{ id: string }> }) {
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

  if (profile?.role === 'mentee' && user.id !== id) {
    redirect(`/mentee/${user.id}/questionnaire`)
  }

  const { data: record } = await supabase
    .from('initial_questionnaire')
    .select('*')
    .eq('student_id', id)
    .single()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Initial Questionnaire</h1>
        <p className="text-muted-foreground mt-2">
          Please fill out this onboarding questionnaire. Note that once submitted, this form cannot be edited.
        </p>
      </div>
      
      <QuestionnaireForm studentId={id} initialData={record} />
    </div>
  )
}
