'use client'

import { useState, useEffect } from 'react'

interface Enrollment {
  student_name: string
  class_name: string
  mentor_name: string
  enrolled_at: string
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEnrollments()
  }, [])

  const fetchEnrollments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/enrollments')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch enrollments')
      }

      setEnrollments(data.enrollments)
    } catch (error: any) {
      console.error('Error fetching enrollments:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-10 space-y-8">
      <div>
        <h1 className="text-[26px] font-black text-[#111116] tracking-tight">Student Enrollments</h1>
        <p className="text-[14px] text-[#9090a0] font-medium">Tracking the relationship between students, classes, and mentors.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-[#f4f4f6] border-t-[#111116] rounded-full animate-spin"></div>
          <p className="text-[12px] font-black text-[#9090a0] uppercase tracking-widest">Compiling Enrollment History...</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e4e4e9] rounded-[24px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fcfcfd] border-b border-[#f4f4f6]">
                  <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Student</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Assigned Class</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Assigned Mentor</th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f6]">
                {enrollments.map((enrollment, index) => (
                  <tr key={index} className="hover:bg-[#fcfcfd] transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#f4f4f6] flex items-center justify-center text-[12px] font-bold text-[#111116]">
                          {enrollment.student_name.charAt(0)}
                        </div>
                        <span className="text-[14px] font-bold text-[#111116]">{enrollment.student_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <i className="ti ti-school text-[#9090a0] text-[14px]"></i>
                        <span className="text-[13px] text-[#52525e] font-medium">{enrollment.class_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                        <span className="text-[13px] text-[#52525e] font-medium">{enrollment.mentor_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right text-[13px] text-[#9090a0] font-medium">
                      {formatDate(enrollment.enrolled_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {enrollments.length === 0 && (
              <div className="text-center py-24 border-t border-[#f4f4f6]">
                <div className="w-16 h-16 bg-[#f4f4f6] rounded-full flex items-center justify-center text-[#d1d1db] mx-auto mb-4">
                  <i className="ti ti-link text-2xl"></i>
                </div>
                <p className="text-[14px] text-[#9090a0] font-medium">No active enrollments found in the database.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
