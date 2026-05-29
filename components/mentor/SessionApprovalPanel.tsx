'use client'

import { useState } from 'react'
import { type SessionWorkflowStatus } from '@/lib/session-utils'

interface SessionApprovalPanelProps {
  sessionId: string
  sessionStatus: SessionWorkflowStatus | string
  userRole: string
  mentorSignedOffAt?: string | null
  studentAcknowledgedAt?: string | null
  onStatusChange?: () => void
  /** When true, show workflow progress steps. */
  showWorkflowProgress?: boolean
}

export default function SessionApprovalPanel({
  sessionId,
  sessionStatus,
  userRole,
  mentorSignedOffAt,
  studentAcknowledgedAt,
  onStatusChange,
  showWorkflowProgress = false,
}: SessionApprovalPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isComplete = sessionStatus === 'student_acknowledged' || sessionStatus === 'completed'

  const steps = [
    {
      label: 'Mentor Submitted',
      isCompleted: sessionStatus !== 'draft',
      isActive: sessionStatus === 'draft'
    },
    {
      label: 'Student Review',
      isCompleted: sessionStatus === 'student_acknowledged' || sessionStatus === 'completed',
      isActive: sessionStatus === 'mentor_review'
    },
    {
      label: 'Complete',
      isCompleted: sessionStatus === 'student_acknowledged' || sessionStatus === 'completed',
      isActive: false
    }
  ]

  const runAction = async (url: string, body?: object) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Action failed')
      }
      onStatusChange?.()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 mb-8">
      {showWorkflowProgress && (
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-1 min-w-[120px]">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                step.isCompleted
                  ? 'bg-[#059669] text-white'
                  : step.isActive
                    ? 'bg-[#4f6ef7] text-white'
                    : 'bg-[#f4f4f6] text-[#9090a0] border border-[#e4e4e9]'
              }`}
            >
              {step.isCompleted ? '✓' : idx + 1}
            </div>
            <span
              className={`text-[11px] font-semibold ${
                step.isCompleted || step.isActive ? 'text-[#111116]' : 'text-[#9090a0]'
              }`}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <div className="hidden sm:block flex-1 h-[1px] bg-[#e4e4e9] mx-1" />
            )}
          </div>
        ))}
      </div>
      )}

      {isComplete && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4 space-y-2">
          <span className="inline-block bg-[#059669] text-white text-[12px] font-bold px-3 py-1 rounded-full">
            Session Complete
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] text-[#065f46]">
            {mentorSignedOffAt && (
              <div>
                <span className="font-bold block text-[#9090a0] uppercase text-[10px]">Mentor signed off</span>
                {new Date(mentorSignedOffAt).toLocaleString()}
              </div>
            )}
            {studentAcknowledgedAt && (
              <div>
                <span className="font-bold block text-[#9090a0] uppercase text-[10px]">Student acknowledged</span>
                {new Date(studentAcknowledgedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {sessionStatus === 'draft' && userRole === 'mentor' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction(`/api/sessions/${sessionId}/sign-off`)}
          className="w-full py-3 bg-[#4f6ef7] hover:bg-[#3d5ce8] text-white font-bold rounded-xl text-[14px] disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit for Student Review'}
        </button>
      )}

      {sessionStatus === 'mentor_review' && userRole === 'mentee' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction(`/api/sessions/${sessionId}/acknowledge`)}
          className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl text-[14px] disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Review & Acknowledge This Session'}
        </button>
      )}
    </div>
  )
}
