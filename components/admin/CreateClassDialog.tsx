'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface CreateClassDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateClassDialog({ open, onClose, onSuccess }: CreateClassDialogProps) {
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [classCode, setClassCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/create-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: className
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create class')
      }

      // Success
      setSuccess(`Class created! Code: ${data.class.class_code}`)
      setClassCode(data.class.class_code)
      setClassName('')
      onSuccess()

      // Keep dialog open for 2 seconds so user can copy code
      setTimeout(() => {
        onClose()
        setSuccess('')
        setClassCode('')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setClassName('')
    setError('')
    setSuccess('')
    setClassCode('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/10 border border-[#e4e4e9]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15px] font-semibold text-[#111116]">Create Class</h2>
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
              Class Name
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#d1d1db] rounded-lg text-[13px] text-[#111116] placeholder-[#9090a0] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/15 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="text-[12px] text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg p-4">
              <div className="text-[13px] font-semibold text-[#059669]">
                Class created successfully!
              </div>
              <div className="text-[11px] text-[#059669] mt-1">
                Class code:
              </div>
              <div className="font-mono font-bold text-[#059669] text-[15px] bg-white border border-[#a7f3d0] px-3 py-1.5 rounded-lg inline-block mt-2 tracking-widest">
                {classCode}
              </div>
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
              disabled={loading || success !== ''}
              className="px-4 py-2 text-[13px] font-medium text-white bg-[#4f6ef7] hover:bg-[#3d5ce8] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : success ? 'Created!' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
