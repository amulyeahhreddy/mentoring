import { createClient } from '@/lib/supabase/server'
import PreAdmissionForm from '@/components/mentee/PreAdmissionForm'
import { redirect } from 'next/navigation'

export default async function PreAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch existing records server-side
  const { data: records } = await supabase
    .from('pre_admission_academic_records')
    .select('*')
    .eq('student_id', id)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pre-Admission Academic History</h1>
        <p className="text-muted-foreground mt-2">
          Review and update your pre-college academic qualifications. 
        </p>
      </div>
      
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <PreAdmissionForm studentId={id} initialData={records || []} />
      </div>
    </div>
  )
}
