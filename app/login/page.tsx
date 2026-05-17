"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      
      if (!userData.user) {
        setError('User not found')
        return
      }

      // Fetch profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()

      if (profileError || !profile) {
        setError('Profile not found')
        return
      }

      // Redirect based on role
      if (profile.role === 'admin') {
        router.push('/admin')
      } else if (profile.role === 'mentor') {
        router.push('/mentor')
      } else if (profile.role === 'mentee') {
        router.push('/mentee')
      } else {
        setError('Invalid user role')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for password reset instructions')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f4f6] font-sans">
      <div className="max-w-md w-full px-6 py-12">
        {/* LOGO / BRANDING */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#111116] text-white rounded-2xl shadow-xl shadow-black/10 mb-6">
            <i className="ti ti-hexagon-filled text-3xl"></i>
          </div>
          <h1 className="text-[28px] font-black text-[#111116] tracking-tight mb-2">MentorOS</h1>
          <p className="text-[14px] text-[#9090a0] font-medium uppercase tracking-widest">Intelligent Academic Mentoring</p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white border border-[#e4e4e9] rounded-[24px] shadow-2xl shadow-[#111116]/5 overflow-hidden">
          <div className="p-8 pb-4">
            <h2 className="text-[18px] font-bold text-[#111116]">Welcome back</h2>
            <p className="text-[13px] text-[#9090a0] mt-1">Sign in to access your dashboard</p>
          </div>

          <div className="px-8 pb-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-[13px] font-bold px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <i className="ti ti-alert-circle text-lg"></i>
                {error}
              </div>
            )}
            
            {message && (
              <div className="bg-green-50 border border-green-100 text-green-600 text-[13px] font-bold px-4 py-3 rounded-xl flex items-center gap-3">
                <i className="ti ti-circle-check text-lg"></i>
                {message}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <i className="ti ti-mail absolute left-4 top-1/2 -translate-y-1/2 text-[#9090a0] group-focus-within:text-[#4f6ef7] transition-colors"></i>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl text-[14px] text-[#111116] focus:border-[#4f6ef7] focus:ring-4 focus:ring-[#4f6ef7]/5 outline-none transition-all placeholder:text-[#d1d1db]"
                      placeholder="name@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest">Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] font-black text-[#4f6ef7] uppercase tracking-widest hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative group">
                    <i className="ti ti-lock absolute left-4 top-1/2 -translate-y-1/2 text-[#9090a0] group-focus-within:text-[#4f6ef7] transition-colors"></i>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl text-[14px] text-[#111116] focus:border-[#4f6ef7] focus:ring-4 focus:ring-[#4f6ef7]/5 outline-none transition-all placeholder:text-[#d1d1db]"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#111116] text-white text-[15px] font-black rounded-xl shadow-xl shadow-black/10 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Authenticating...
                  </>
                ) : (
                  <>Sign in to MentorOS <i className="ti ti-arrow-right"></i></>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* FOOTER */}
        <p className="mt-8 text-center text-[12px] text-[#9090a0] font-medium">
          New here? Contact your administrator for account access.
        </p>
      </div>
    </div>
  )
}
