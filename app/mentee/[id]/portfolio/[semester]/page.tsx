import { createClient } from '@/lib/supabase/server'
import PortfolioRubric from '@/components/mentee/PortfolioRubric'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const SEMESTERS = [
  'I Year I Sem', 'I Year II Sem',
  'II Year I Sem', 'II Year II Sem',
  'III Year I Sem', 'III Year II Sem',
  'IV Year I Sem', 'IV Year II Sem'
]

export default async function PortfolioPage({ params }: { params: Promise<{ id: string; semester: string }> }) {
  const { id, semester } = await params
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

  const decodedSemester = decodeURIComponent(semester)

  const { data: records } = await supabase
    .from('portfolio_ratings')
    .select('*')
    .eq('student_id', id)
    .eq('semester_label', decodedSemester)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Evaluation</h1>
          <p className="text-muted-foreground mt-2">
            Rubric for evaluating student artifacts mapped to Program Outcomes.
          </p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-md overflow-x-auto max-w-full hide-scrollbar">
          {SEMESTERS.map(sem => (
            <Link 
              key={sem} 
              href={`/mentee/${id}/portfolio/${encodeURIComponent(sem)}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm whitespace-nowrap transition-colors ${sem === decodedSemester ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {sem}
            </Link>
          ))}
        </div>
      </div>
      
      <PortfolioRubric 
        studentId={id} 
        semester={decodedSemester}
        initialData={records || []} 
        userRole={profile?.role || 'mentee'} 
      />
    </div>
  )
}
