'use client'

import { useEffect, useState } from 'react'
import {
  IMPACT_SKILLS,
  TRANSFORMATION_QUESTIONS,
  RADIO_OPTIONS,
} from '@/lib/session-utils'

export interface ImpactAssessmentData {
  id?: string
  session_id: string
  skills?: Record<string, { status?: string; suggestion?: string }>
  transformation?: Record<string, string>
}

interface ImpactAssessmentFormProps {
  studentId: string
  sessionId: string
  readOnly?: boolean
  onSaved?: () => void
}

export default function ImpactAssessmentForm({
  studentId,
  sessionId,
  readOnly = false,
  onSaved,
}: ImpactAssessmentFormProps) {
  const [recordId, setRecordId] = useState<string | undefined>()
  const [skills, setSkills] = useState<Record<string, { status?: string; suggestion?: string }>>({})
  const [transformation, setTransformation] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        `/api/students/${studentId}/impact-assessment?session_id=${sessionId}`
      )
      if (!res.ok) {
        setLoaded(true)
        return
      }
      const data = await res.json()
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        setRecordId(row.id)
        setSkills(row.skills || {})
        setTransformation(row.transformation || {})
      }
      setLoaded(true)
    }
    load()
  }, [studentId, sessionId])

  const save = async () => {
    setSaving(true)
    const payload = {
      session_id: sessionId,
      skills,
      transformation,
    }
    const method = recordId ? 'PATCH' : 'POST'
    const body = recordId ? { ...payload, id: recordId } : payload
    const res = await fetch(`/api/students/${studentId}/impact-assessment`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      if (data?.id) setRecordId(data.id)
      onSaved?.()
    }
  }

  if (!loaded) {
    return <p className="text-[13px] text-[#9090a0] animate-pulse">Loading impact assessment…</p>
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
        <span className="text-[11px] font-black text-[#7c3aed] uppercase tracking-wider">Impact</span>
        <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">
          Impact Assessment — Previous Session
        </h4>
      </div>

      <div className="space-y-3">
        <h5 className="text-[11px] font-bold uppercase text-[#9090a0] tracking-wider">Table A — Skills</h5>
        <div className="border border-[#e4e4e9] rounded-xl overflow-hidden">
          {IMPACT_SKILLS.map((skill) => (
            <div
              key={skill.key}
              className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-[#e4e4e9] last:border-0 bg-[#fcfcfd]"
            >
              <span className="w-[140px] text-[13px] font-medium text-[#111116] shrink-0">
                {skill.label}
              </span>
              <div className="flex bg-[#f4f4f6] rounded-md p-0.5 shrink-0">
                {RADIO_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      setSkills((prev) => ({
                        ...prev,
                        [skill.key]: { ...prev[skill.key], status: opt },
                      }))
                    }
                    className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${
                      skills[skill.key]?.status === opt
                        ? 'bg-white shadow text-[#7c3aed]'
                        : 'text-[#9090a0]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                type="text"
                disabled={readOnly}
                placeholder="Mentor suggestion"
                value={skills[skill.key]?.suggestion || ''}
                onChange={(e) =>
                  setSkills((prev) => ({
                    ...prev,
                    [skill.key]: { ...prev[skill.key], suggestion: e.target.value },
                  }))
                }
                className="flex-1 min-w-[160px] bg-white border border-[#e4e4e9] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7c3aed]"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="text-[11px] font-bold uppercase text-[#9090a0] tracking-wider">
          Table B — Transformation
        </h5>
        <div className="border border-[#e4e4e9] rounded-xl overflow-hidden">
          {TRANSFORMATION_QUESTIONS.map((q, idx) => (
            <div
              key={q.key}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b border-[#e4e4e9] last:border-0 bg-[#fcfcfd]"
            >
              <span className="text-[13px] text-[#52525e] flex-1">
                {idx === 6 ? '7a. ' : idx === 7 ? '7b. ' : idx === 8 ? '8. ' : `${idx + 1}. `}
                {q.label}
              </span>
              <div className="flex bg-[#f4f4f6] rounded-md p-0.5 shrink-0">
                {RADIO_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      setTransformation((prev) => ({ ...prev, [q.key]: opt }))
                    }
                    className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${
                      transformation[q.key] === opt
                        ? 'bg-white shadow text-[#7c3aed]'
                        : 'text-[#9090a0]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-[13px] font-bold text-[#7c3aed] hover:underline disabled:opacity-50"
        >
          {saving ? 'Saving impact assessment…' : 'Save impact assessment'}
        </button>
      )}
    </section>
  )
}
