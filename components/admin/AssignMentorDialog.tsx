'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Mentor {
  id: string
  name: string
  email: string
}

interface AssignMentorDialogProps {
  class_id: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AssignMentorDialog({ class_id, open, onClose, onSuccess }: AssignMentorDialogProps) {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [selectedMentorId, setSelectedMentorId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchingMentors, setFetchingMentors] = useState(false)

  useEffect(() => {
    if (open) {
      fetchMentors()
    }
  }, [open])

  const fetchMentors = async () => {
    setFetchingMentors(true)
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch mentors')
      }

      console.log('AssignMentorDialog - Full API response:', data)
      console.log('AssignMentorDialog - Mentors array:', data.mentors)
      
      setMentors(data.mentors)
    } catch (err: any) {
      console.error('AssignMentorDialog - Error fetching mentors:', err)
      setError(err.message)
    } finally {
      setFetchingMentors(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMentorId) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/assign-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentor_id: selectedMentorId,
          class_id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign mentor')
      }

      // Success
      setSelectedMentorId('')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedMentorId('')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Assign Mentor</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Mentor
            </label>
            {fetchingMentors ? (
              <div className="text-gray-500 text-sm">Loading mentors...</div>
            ) : (
              <select
                required
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a mentor...</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name} ({mentor.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMentorId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Mentor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
