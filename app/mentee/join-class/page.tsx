'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function JoinClassPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ className: string, mentorName: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        try {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', user.id)
            .limit(1)

          if (enrollments && enrollments.length > 0) {
            router.push('/mentee')
            return
          }
        } catch {
          // fail silently, just show the form
        }
      } catch {
        router.push('/login')
      }
    }
    getUser()
  }, [supabase, router])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError('Class code must be 6 characters')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/student/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: userId,
          class_code: code.toUpperCase()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409 || (data.error && data.error.toLowerCase().includes('already enrolled'))) {
          router.push('/mentee')
          return
        }
        throw new Error(data.error || 'Failed to join class')
      }

      setSuccessData({
        className: data.class_name,
        mentorName: data.mentor_name
      })

      setTimeout(() => {
        router.push('/mentee')
      }, 2000)

    } catch (err: any) {
      if (err.message.toLowerCase().includes('already enrolled')) {
        router.push('/mentee')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f6] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {successData ? (
          <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-[#111116] text-2xl font-bold mb-2">Successfully Joined!</h2>
            <p className="text-[#9090a0] mb-1">Class: <span className="text-[#111116] font-semibold">{successData.className}</span></p>
            <p className="text-[#9090a0]">Mentor: <span className="text-[#111116] font-semibold">{successData.mentorName}</span></p>
            <p className="mt-6 text-sm text-[#9090a0]">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8">
            <h2 className="text-[#111116] text-2xl font-bold mb-2 text-center">Join Your Class</h2>
            <p className="text-[#9090a0] text-center mb-8">
              Enter the 6-character class code provided by your mentor to get started.
            </p>

            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Class Code</label>
                <input 
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3X9K"
                  className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-4 py-3 text-lg font-mono text-center tracking-widest text-[#111116] w-full"
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-[#4f6ef7] hover:bg-[#3d5ce8] text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#4f6ef720]"
              >
                {loading ? 'Joining...' : 'Join Class'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
