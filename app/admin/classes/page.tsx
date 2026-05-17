'use client'

import { useState, useEffect } from 'react'
import CreateClassDialog from '@/components/admin/CreateClassDialog'
import AssignMentorDialog from '@/components/admin/AssignMentorDialog'

interface Class {
  id: string
  name: string
  class_code: string
  mentor_name: string
  student_count: number
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [createClassDialogOpen, setCreateClassDialogOpen] = useState(false)
  const [assignMentorDialogOpen, setAssignMentorDialogOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchClasses()
  }, [refreshKey])

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/classes')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes')
      }

      setClasses(data.classes)
    } catch (error: any) {
      console.error('Error fetching classes:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClassCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleMentorAssigned = () => {
    setRefreshKey(prev => prev + 1)
  }

  const openAssignMentorDialog = (classId: string) => {
    setSelectedClassId(classId)
    setAssignMentorDialogOpen(true)
  }

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[26px] font-black text-[#111116] tracking-tight">Academic Classes</h1>
          <p className="text-[14px] text-[#9090a0] font-medium">Configure and manage classroom units and mentor assignments.</p>
        </div>
        <button
          onClick={() => setCreateClassDialogOpen(true)}
          className="px-6 py-3 bg-[#111116] text-white text-[13px] font-black rounded-xl shadow-lg shadow-black/10 hover:bg-black transition-all flex items-center gap-2"
        >
          <i className="ti ti-plus text-lg"></i>
          Create New Class
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-[#f4f4f6] border-t-[#111116] rounded-full animate-spin"></div>
          <p className="text-[12px] font-black text-[#9090a0] uppercase tracking-widest">Loading Academic Data...</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e4e4e9] rounded-[24px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fcfcfd] border-b border-[#f4f4f6]">
                  <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Class Identity</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">System Code</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Assigned Mentor</th>
                  <th className="px-8 py-5 text-center text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Capacity</th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f6]">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-[#fcfcfd] transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#eef1fe] flex items-center justify-center text-[#4f6ef7]">
                          <i className="ti ti-school text-lg"></i>
                        </div>
                        <span className="text-[14px] font-bold text-[#111116]">{cls.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className="text-[11px] font-black text-[#111116] bg-[#f4f4f6] px-2.5 py-1.5 rounded-lg font-mono tracking-tighter">
                        {cls.class_code}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#d1d1db] to-[#e4e4e9] flex items-center justify-center text-[10px] font-bold text-white">
                          {cls.mentor_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-[13px] text-[#52525e] font-medium">{cls.mentor_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[14px] font-black text-[#111116]">{cls.student_count}</span>
                        <span className="text-[10px] text-[#9090a0] font-bold uppercase tracking-tighter">Enrolled</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <button
                        onClick={() => openAssignMentorDialog(cls.id)}
                        className="text-[12px] font-black text-[#4f6ef7] uppercase tracking-widest hover:bg-[#4f6ef7]/5 px-4 py-2 rounded-lg transition-all"
                      >
                        {cls.mentor_name ? 'Reassign Mentor' : 'Assign Mentor'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {classes.length === 0 && (
              <div className="text-center py-24 border-t border-[#f4f4f6]">
                <div className="w-16 h-16 bg-[#f4f4f6] rounded-full flex items-center justify-center text-[#d1d1db] mx-auto mb-4">
                  <i className="ti ti-school text-2xl"></i>
                </div>
                <p className="text-[14px] text-[#9090a0] font-medium">No classes configured in the system yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <CreateClassDialog
        open={createClassDialogOpen}
        onClose={() => setCreateClassDialogOpen(false)}
        onSuccess={handleClassCreated}
      />

      <AssignMentorDialog
        class_id={selectedClassId}
        open={assignMentorDialogOpen}
        onClose={() => setAssignMentorDialogOpen(false)}
        onSuccess={handleMentorAssigned}
      />
    </div>
  )
}
