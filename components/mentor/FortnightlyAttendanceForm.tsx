'use client'

import { useEffect, useState } from 'react'

export interface FortnightRow {
  id?: string
  fortnight_number?: number
  period_start?: string
  period_end?: string
  attendance_percentage?: string | number
  remarks?: string
  parent_informed?: string
  parent_informed_date?: string
  parent_response?: string
}

const EMPTY_ROWS: FortnightRow[] = [
  { fortnight_number: 1 },
  { fortnight_number: 2 },
  { fortnight_number: 3 },
  { fortnight_number: 4 },
]

interface FortnightlyAttendanceFormProps {
  studentId: string
  sessionId: string
  readOnly?: boolean
}

function AttendanceWarning({ pct }: { pct: number }) {
  if (pct < 65) {
    return (
      <p className="text-[11px] text-[#dc2626] font-semibold mt-1">
        🚨 Below 65% — escalate to coordinator
      </p>
    )
  }
  if (pct < 75) {
    return (
      <p className="text-[11px] text-[#d97706] font-semibold mt-1">
        ⚠️ Below 75% — parent contact recommended
      </p>
    )
  }
  return null
}

export default function FortnightlyAttendanceForm({
  studentId,
  sessionId,
  readOnly = false,
}: FortnightlyAttendanceFormProps) {
  const [rows, setRows] = useState<FortnightRow[]>(EMPTY_ROWS)
  const [savingIdx, setSavingIdx] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        `/api/students/${studentId}/attendance?session_id=${sessionId}`
      )
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.data ? [data.data] : []
      if (list.length === 0) return
      const merged = EMPTY_ROWS.map((empty, i) => {
        const found =
          list.find((r: FortnightRow) => r.fortnight_number === i + 1) || list[i]
        return found ? { ...empty, ...found, fortnight_number: i + 1 } : empty
      })
      setRows(merged)
    }
    load()
  }, [studentId, sessionId])

  const updateRow = (idx: number, key: keyof FortnightRow, value: string | number) => {
    setRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }

  const saveRow = async (idx: number) => {
    setSavingIdx(idx)
    const row = rows[idx]
    const payload = {
      ...row,
      session_id: sessionId,
      fortnight_number: row.fortnight_number ?? idx + 1,
      attendance_percentage: row.attendance_percentage
        ? Number(row.attendance_percentage)
        : null,
    }
    const res = await fetch(`/api/students/${studentId}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const result = await res.json()
      const saved = result.data || result
      if (saved?.id) {
        setRows((prev) => {
          const next = [...prev]
          next[idx] = { ...next[idx], id: saved.id }
          return next
        })
      }
    }
    setSavingIdx(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-b border-[#f4f4f6] pb-3">
        <span className="text-[11px] font-black text-[#7c3aed] uppercase tracking-wider">Attendance</span>
        <h4 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">
          Fortnightly Attendance
        </h4>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#e4e4e9]">
        <table className="w-full text-[12px] text-left">
          <thead className="bg-[#f8f8fb] border-b border-[#e4e4e9]">
            <tr>
              <th className="px-3 py-2 font-bold text-[#52525e]">Fortnight #</th>
              <th className="px-3 py-2 font-bold text-[#52525e]">Start</th>
              <th className="px-3 py-2 font-bold text-[#52525e]">End</th>
              <th className="px-3 py-2 font-bold text-[#52525e]">Attendance %</th>
              <th className="px-3 py-2 font-bold text-[#52525e]">Remarks</th>
              <th className="px-3 py-2 font-bold text-[#52525e]">Parent Informed</th>
              <th className="px-3 py-2 font-bold text-[#52525e]">Parent Informed Date</th>
              <th className="px-3 py-2 font-bold text-[#52525e]">Parent Response</th>
              {!readOnly && <th className="px-3 py-2 font-bold text-[#52525e]"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e4e9]">
            {rows.map((row, idx) => {
              const pct = parseFloat(String(row.attendance_percentage ?? ''))
              const hasPct = !isNaN(pct)
              return (
                <tr key={idx}>
                  <td className="px-2 py-2 font-bold text-[#7c3aed]">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      disabled={readOnly}
                      className="bg-transparent outline-none"
                      value={row.period_start || ''}
                      onChange={(e) => updateRow(idx, 'period_start', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      disabled={readOnly}
                      className="bg-transparent outline-none"
                      value={row.period_end || ''}
                      onChange={(e) => updateRow(idx, 'period_end', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={readOnly}
                      className="w-14 font-bold text-[#7c3aed] outline-none"
                      value={row.attendance_percentage ?? ''}
                      onChange={(e) => updateRow(idx, 'attendance_percentage', e.target.value)}
                    />
                    {hasPct && <AttendanceWarning pct={pct} />}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      disabled={readOnly}
                      className="w-full min-w-[80px] outline-none"
                      value={row.remarks || ''}
                      onChange={(e) => updateRow(idx, 'remarks', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      disabled={readOnly}
                      className="bg-transparent outline-none"
                      value={row.parent_informed || ''}
                      onChange={(e) => updateRow(idx, 'parent_informed', e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="NA">NA</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      disabled={readOnly}
                      className="bg-transparent outline-none"
                      value={row.parent_informed_date || ''}
                      onChange={(e) => updateRow(idx, 'parent_informed_date', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      disabled={readOnly}
                      className="w-full min-w-[80px] outline-none"
                      value={row.parent_response || ''}
                      onChange={(e) => updateRow(idx, 'parent_response', e.target.value)}
                    />
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => saveRow(idx)}
                        disabled={savingIdx === idx}
                        className="text-[11px] font-bold text-[#7c3aed] hover:underline whitespace-nowrap"
                      >
                        {savingIdx === idx ? '…' : 'Save'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
