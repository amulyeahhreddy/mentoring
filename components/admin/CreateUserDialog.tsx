'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface CreateUserDialogProps {
  role: 'mentor' | 'mentee'
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateUserDialog({ role, open, onClose, onSuccess }: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      // Success
      const successMessage = role === 'mentor' ? 'Mentor created successfully!' : 'Student created successfully!'
      setSuccess(successMessage)
      setFormData({ name: '', email: '', password: '' })
      
      // Wait 1500ms then close dialog and call onSuccess
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', email: '', password: '' })
    setError('')
    setSuccess('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/10 border border-[#e4e4e9]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15px] font-semibold text-[#111116]">
            Create {role === 'mentor' ? 'Mentor' : 'Student'}
          </h2>
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
              Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#d1d1db] rounded-lg text-[13px] text-[#111116] placeholder-[#9090a0] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/15 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#52525e] mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#d1d1db] rounded-lg text-[13px] text-[#111116] placeholder-[#9090a0] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/15 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#52525e] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#d1d1db] rounded-lg text-[13px] text-[#111116] placeholder-[#9090a0] focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/15 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="text-[12px] text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-[12px] text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg px-3 py-2">
              {success}
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
              {loading ? 'Creating...' : success ? 'Created!' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
