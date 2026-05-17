'use client'

import { useState, useEffect } from 'react'
import CreateUserDialog from '@/components/admin/CreateUserDialog'

interface Mentor {
  id: string
  name: string
  email: string
  created_at: string
  classes_assigned: number
}

interface Student {
  id: string
  name: string
  email: string
  created_at: string
  class_name: string
  mentor_name: string
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'mentors' | 'students'>('mentors')
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [refreshKey])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      console.log('UsersPage - Full API response:', data)
      console.log('UsersPage - Mentors array:', data.mentors)
      console.log('UsersPage - Students array:', data.students)
      
      setMentors(data.mentors)
      setStudents(data.students)
    } catch (error: any) {
      console.error('Error fetching users:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUserCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[26px] font-black text-[#111116] tracking-tight">User Directory</h1>
          <p className="text-[14px] text-[#9090a0] font-medium">Manage and monitor mentors and students across the platform.</p>
        </div>
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="px-6 py-3 bg-[#111116] text-white text-[13px] font-black rounded-xl shadow-lg shadow-black/10 hover:bg-black transition-all flex items-center gap-2"
        >
          <i className="ti ti-plus text-lg"></i>
          Add {activeTab === 'mentors' ? 'Mentor' : 'Student'}
        </button>
      </div>

      {/* TABS */}
      <div className="bg-[#e4e4e9]/50 p-1 rounded-xl inline-flex gap-1 border border-[#e4e4e9]">
        <button
          onClick={() => setActiveTab('mentors')}
          className={`px-6 py-2 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'mentors'
              ? 'bg-white text-[#111116] shadow-sm'
              : 'text-[#9090a0] hover:text-[#111116]'
          }`}
        >
          Mentors
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-6 py-2 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'students'
              ? 'bg-white text-[#111116] shadow-sm'
              : 'text-[#9090a0] hover:text-[#111116]'
          }`}
        >
          Students
        </button>
      </div>

      {/* CONTENT */}
      <div className="bg-white border border-[#e4e4e9] rounded-[24px] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-[#f4f4f6] border-t-[#111116] rounded-full animate-spin"></div>
            <p className="text-[12px] font-black text-[#9090a0] uppercase tracking-widest">Retrieving Records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fcfcfd] border-b border-[#f4f4f6]">
                  {activeTab === 'mentors' ? (
                    <>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Name</th>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Email</th>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Joined</th>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest text-center">Classes</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Name</th>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Email Address</th>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Joined Date</th>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest text-center">Assigned Class</th>
                      <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest text-center">Mentor</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f6]">
                {activeTab === 'mentors' ? (
                  mentors.map((mentor) => (
                    <tr key={mentor.id} className="hover:bg-[#fcfcfd] transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#f4f4f6] flex items-center justify-center text-[13px] font-bold text-[#111116]">
                            {mentor.name.charAt(0)}
                          </div>
                          <span className="text-[14px] font-bold text-[#111116]">{mentor.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-[13px] text-[#52525e]">{mentor.email}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-[13px] text-[#52525e]">{formatDate(mentor.created_at)}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#eef1fe] text-[#4f6ef7] text-[12px] font-black rounded-lg">
                          {mentor.classes_assigned}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-[#fcfcfd] transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#f4f4f6] flex items-center justify-center text-[13px] font-bold text-[#111116]">
                            {student.name.charAt(0)}
                          </div>
                          <span className="text-[14px] font-bold text-[#111116]">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-[13px] text-[#52525e]">{student.email}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-[13px] text-[#52525e]">{formatDate(student.created_at)}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-center">
                        <span className="text-[12px] font-bold text-[#111116] bg-[#f4f4f6] px-3 py-1.5 rounded-lg">{student.class_name}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-center">
                        <span className="text-[12px] font-bold text-[#4f6ef7] hover:underline cursor-pointer">{student.mentor_name}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {((activeTab === 'mentors' && mentors.length === 0) || 
              (activeTab === 'students' && students.length === 0)) && (
              <div className="text-center py-24 border-t border-[#f4f4f6]">
                <div className="w-16 h-16 bg-[#f4f4f6] rounded-full flex items-center justify-center text-[#d1d1db] mx-auto mb-4">
                  <i className="ti ti-search text-2xl"></i>
                </div>
                <p className="text-[14px] text-[#9090a0] font-medium">No records found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateUserDialog
        role={activeTab === 'mentors' ? 'mentor' : 'mentee'}
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleUserCreated}
      />
    </div>
  )
}
