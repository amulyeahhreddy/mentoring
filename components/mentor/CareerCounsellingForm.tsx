'use client'

import { useEffect, useState } from 'react'
import { CAREER_PATHWAYS } from '@/lib/session-utils'

type PathwayData = { aware?: boolean; details?: string }

interface CareerCounsellingFormProps {
  studentId: string
  sessionId: string
  readOnly?: boolean
}

export default function CareerCounsellingForm({
  studentId,
  sessionId,
  readOnly = false,
}: CareerCounsellingFormProps) {
  const [recordId, setRecordId] = useState<string | undefined>()
  const [pathways, setPathways] = useState<Record<string, PathwayData>>({})
  const [openPanel, setOpenPanel] = useState<string | null>(CAREER_PATHWAYS[0].key)
  const [saving, setSaving] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/students/${studentId}/career-counselling`)
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      const row = list.find((r: { session_id?: string }) => r.session_id === sessionId) || list[0]
      if (row) {
        setRecordId(row.id)
        const loaded: Record<string, PathwayData> = {}
        for (const p of CAREER_PATHWAYS) {
          loaded[p.key] = {
            aware: row[`${p.key}_aware`] ?? row.pathways?.[p.key]?.aware,
            details: row[`${p.key}_details`] ?? row.pathways?.[p.key]?.details ?? '',
          }
        }
        if (row.pathways && typeof row.pathways === 'object') {
          Object.assign(loaded, row.pathways)
        }
        setPathways(loaded)
      }
    }
    load()
  }, [studentId, sessionId])

  const save = async () => {
    setSaving(true)
    const body: Record<string, unknown> = { session_id: sessionId }
    for (const p of CAREER_PATHWAYS) {
      body[`${p.key}_aware`] = !!pathways[p.key]?.aware
      body[`${p.key}_details`] = pathways[p.key]?.details || ''
    }
    body.pathways = pathways

    const method = recordId ? 'PATCH' : 'POST'
    if (recordId) body.id = recordId

    const res = await fetch(`/api/students/${studentId}/career-counselling`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      if (data?.id) setRecordId(data.id)
    }
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setSectionOpen(!sectionOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl hover:bg-[#f8f8fb]"
      >
        <span className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">
          Career Counselling
        </span>
        <span className="text-[#9090a0]">{sectionOpen ? '▼' : '▶'}</span>
      </button>

      {sectionOpen && (
        <div className="border border-[#e4e4e9] rounded-xl overflow-hidden divide-y divide-[#e4e4e9]">
          {CAREER_PATHWAYS.map((pathway) => {
            const data = pathways[pathway.key] || {}
            const isOpen = openPanel === pathway.key
            return (
              <div key={pathway.key}>
                <button
                  type="button"
                  onClick={() => setOpenPanel(isOpen ? null : pathway.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#fcfcfd] text-left"
                >
                  <span className="text-[13px] font-semibold text-[#111116]">{pathway.label}</span>
                  <span className="text-[#9090a0] text-[12px]">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 bg-[#fcfcfd]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={!!data.aware}
                        onChange={(e) =>
                          setPathways((prev) => ({
                            ...prev,
                            [pathway.key]: { ...prev[pathway.key], aware: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded border-[#d1d1db] text-[#7c3aed]"
                      />
                      <span className="text-[13px] text-[#52525e]">
                        Mentee is aware of {pathway.label} pathway
                      </span>
                    </label>
                    <textarea
                      disabled={readOnly}
                      placeholder={`Notes / discussion details for ${pathway.label}…`}
                      value={data.details || ''}
                      onChange={(e) =>
                        setPathways((prev) => ({
                          ...prev,
                          [pathway.key]: { ...prev[pathway.key], details: e.target.value },
                        }))
                      }
                      className="w-full p-3 bg-white border border-[#e4e4e9] rounded-lg text-[13px] min-h-[72px] outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                )}
              </div>
            )
          })}
          {!readOnly && (
            <div className="p-4 bg-white">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="text-[13px] font-bold text-[#7c3aed] hover:underline disabled:opacity-50"
              >
                {saving ? 'Saving career counselling…' : 'Save career counselling'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
