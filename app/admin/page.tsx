import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function AdminOverview() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Get counts using admin client
  const { count: mentorsCount } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'mentor')

  const { count: studentsCount } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'mentee')

  const { count: classesCount } = await adminClient
    .from('classes')
    .select('*', { count: 'exact', head: true })

  const { count: enrollmentsCount } = await adminClient
    .from('enrollments')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Mentors Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {mentorsCount || 0}
          </div>
          <div className="text-gray-600 text-sm uppercase tracking-wide">
            Total Mentors
          </div>
        </div>

        {/* Total Students Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {studentsCount || 0}
          </div>
          <div className="text-gray-600 text-sm uppercase tracking-wide">
            Total Students
          </div>
        </div>

        {/* Total Classes Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {classesCount || 0}
          </div>
          <div className="text-gray-600 text-sm uppercase tracking-wide">
            Total Classes
          </div>
        </div>

        {/* Total Enrollments Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {enrollmentsCount || 0}
          </div>
          <div className="text-gray-600 text-sm uppercase tracking-wide">
            Total Enrollments
          </div>
        </div>
      </div>
    </div>
  )
}
