import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PsychometricTest1 from '@/components/mentee/PsychometricTest1'
import PsychometricTest2 from '@/components/mentee/PsychometricTest2'
import PsychometricTest3 from '@/components/mentee/PsychometricTest3'

export default async function PsychometricTestPage({
  params,
}: {
  params: Promise<{ id: string; testNumber: string }>
}) {
  const { id, testNumber } = await params

  if (!['1', '2', '3'].includes(testNumber)) {
    notFound()
  }

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

  const { data: record } = await supabase
    .from('psychometric_test')
    .select('*')
    .eq('student_id', id)
    .eq('test_number', Number(testNumber))
    .single()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Psychometric Test {testNumber}</h1>
          <p className="text-muted-foreground mt-2">
            {testNumber === '1' ? 'Leadership Dimensions Assessment (Mentor Fills)' : 'Self-Assessment Inventory (Student Fills)'}
          </p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-md">
          {(['1', '2', '3'] as const).map((num) => (
            <Link 
              key={num} 
              href={`/mentee/${id}/psychometric/${num}`}
              className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${num === testNumber ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Test {num}
            </Link>
          ))}
        </div>
      </div>
      
      {testNumber === '1' && <PsychometricTest1 studentId={id} initialData={record} userRole={profile?.role || 'mentee'} />}
      {testNumber === '2' && <PsychometricTest2 studentId={id} initialData={record} userRole={profile?.role || 'mentee'} />}
      {testNumber === '3' && <PsychometricTest3 studentId={id} initialData={record} userRole={profile?.role || 'mentee'} />}
    </div>
  )
}
