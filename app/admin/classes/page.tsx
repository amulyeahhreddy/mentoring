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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Classes Management</h1>
        <button
          onClick={() => setCreateClassDialogOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Class
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading classes...</div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Mentor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cls.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {cls.class_code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.mentor_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.student_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => openAssignMentorDialog(cls.id)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Assign Mentor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {classes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No classes found
            </div>
          )}
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
