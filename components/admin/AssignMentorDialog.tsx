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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/10 border border-[#e4e4e9]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15px] font-semibold text-[#111116]">Assign Mentor</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-[#f4f4f6] flex items-center justify-center text-[#9090a0] hover:text-[#111116] transition-all"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#52525e] mb-1.5">
              Select Mentor
            </label>
            {fetchingMentors ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#d1d1db] border-t-[#4f6ef7] rounded-full animate-spin"></div>
                <span className="text-[13px] text-[#9090a0]">Loading mentors...</span>
              </div>
            ) : (
              <select
                required
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#d1d1db] rounded-lg text-[13px] text-[#111116] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/15 outline-none transition-all"
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
            <div className="text-[12px] text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-[13px] font-medium text-[#52525e] bg-white border border-[#d1d1db] rounded-lg hover:bg-[#f8f8fb] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMentorId}
              className="px-4 py-2 text-[13px] font-medium text-white bg-[#4f6ef7] hover:bg-[#3d5ce8] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign Mentor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
