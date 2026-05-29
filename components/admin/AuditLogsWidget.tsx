'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuditLogsWidgetProps {
  completedSessions: number
  draftSessions: number
  mentorsCount: number
}

interface LogEntry {
  id: string
  timestamp: string
  action: string
  performed_by: string
  type: string
  raw_action: string
  actor_role: string
  record_id: string
}

interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

const TABLE_OPTIONS = [
  { value: '', label: 'All Tables' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'profiles', label: 'Profiles' },
  { value: 'mentor_assignments', label: 'Mentor Assignments' },
  { value: 'fortnightly_attendance', label: 'Attendance' },
  { value: 'career_counselling', label: 'Career Counselling' },
  { value: 'session_course_ratings', label: 'Course Ratings' },
  { value: 'session_facility_feedback', label: 'Facility Feedback' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'INSERT', label: 'Created' },
  { value: 'UPDATE', label: 'Updated' },
  { value: 'DELETE', label: 'Deleted' },
]

export default function AuditLogsWidget({
  completedSessions,
  draftSessions,
  mentorsCount
}: AuditLogsWidgetProps) {
  const [showLogs, setShowLogs] = useState(false)

  return (
    <>
      <div className="bg-[#111116] rounded-xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
              <i className="ti ti-shield-check text-2xl text-[#10b981]"></i>
            </div>
            <h3 className="text-[17px] font-semibold tracking-tight mb-2">Platform Status</h3>
            <p className="text-[13px] text-[#9090a0] leading-relaxed">Live snapshot of platform activity.</p>
            
            <div className="space-y-3 mt-4">
              {[
                { label: 'Completed Sessions', value: completedSessions, icon: 'ti-circle-check' },
                { label: 'Draft Sessions', value: draftSessions, icon: 'ti-pencil' },
                { label: 'Active Mentors', value: mentorsCount, icon: 'ti-user-bolt' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] text-white/70 font-medium">
                    <i className={`ti ${stat.icon}`}></i>
                    {stat.label}
                  </div>
                  <span className="text-[15px] font-black text-white">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setShowLogs(true)}
            className="w-full py-4 bg-white text-[#111116] text-[13px] font-medium rounded-xl hover:bg-gray-100 transition-all mt-10"
          >
            Audit Access Logs
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-6 border-b border-[#e4e4e9] flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-black text-[#111116]">Audit Log</h3>
                <p className="text-[12px] text-[#9090a0] font-medium">Immutable event trail from database triggers</p>
              </div>
              <button 
                onClick={() => setShowLogs(false)}
                className="text-[#9090a0] hover:text-[#111116] transition-colors"
              >
                <i className="ti ti-x text-xl text-black"></i>
              </button>
            </div>
            <AuditLogsList />
          </div>
        </div>
      )}
    </>
  )
}

function AuditLogsList() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 25, total: 0, total_pages: 0 })

  // Filters
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const fetchLogs = useCallback(async (page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '25' })
      if (tableFilter) params.set('table', tableFilter)
      if (actionFilter) params.set('action', actionFilter)

      const res = await fetch(`/api/admin/audit-logs?${params}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs')
      }
      setLogs(data.logs || [])
      setPagination(data.pagination || { page: 1, per_page: 25, total: 0, total_pages: 0 })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tableFilter, actionFilter])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const actionColor = (rawAction: string) => {
    switch (rawAction) {
      case 'INSERT': return 'bg-[#ecfdf5] text-[#059669]'
      case 'UPDATE': return 'bg-[#eef1fe] text-[#4f6ef7]'
      case 'DELETE': return 'bg-[#fef2f2] text-[#ef4444]'
      default: return 'bg-[#f4f4f6] text-[#9090a0]'
    }
  }

  const roleIcon = (role: string) => {
    switch (role) {
      case 'admin': return 'ti-shield-check'
      case 'mentor': return 'ti-user-star'
      case 'mentee': return 'ti-user'
      default: return 'ti-robot'
    }
  }

  return (
    <div className="flex flex-col">
      {/* Filters bar */}
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f6] bg-[#fcfcfd]">
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="text-[12px] font-bold text-[#52525e] bg-white border border-[#e4e4e9] rounded-lg px-3 py-2 outline-none focus:border-[#4f6ef7] transition-all"
        >
          {TABLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-[12px] font-bold text-[#52525e] bg-white border border-[#e4e4e9] rounded-lg px-3 py-2 outline-none focus:border-[#4f6ef7] transition-all"
        >
          {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[11px] font-medium text-[#9090a0]">
          {pagination.total} event{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-8 h-8 border-4 border-[#f4f4f6] border-t-[#111116] rounded-full animate-spin"></div>
            <p className="text-[11px] font-bold text-[#9090a0] uppercase tracking-widest">Loading Audit Logs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 text-[13px]">
            Error loading audit logs: {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-[#9090a0]">
            No audit events found.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-3 bg-[#f8f8fb] rounded-xl hover:bg-[#f0f0f5] transition-colors">
                <div className="flex flex-col items-center gap-1 min-w-[52px]">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${actionColor(log.raw_action)}`}>
                    {log.raw_action}
                  </span>
                  <i className={`ti ${roleIcon(log.actor_role)} text-[#9090a0] text-sm`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#111116] leading-snug">{log.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#9090a0] font-medium">
                      by {log.performed_by}
                    </span>
                    <span className="text-[11px] text-[#d1d1db]">·</span>
                    <span className="text-[11px] text-[#9090a0]">
                      {new Date(log.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="text-[10px] font-bold text-[#9090a0] uppercase tracking-wider bg-[#f4f4f6] px-2 py-0.5 rounded-md">
                    {log.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-[#f4f4f6] bg-[#fcfcfd]">
          <button
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="text-[12px] font-bold text-[#4f6ef7] hover:bg-[#eef1fe] px-4 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-[12px] font-bold text-[#9090a0]">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="text-[12px] font-bold text-[#4f6ef7] hover:bg-[#eef1fe] px-4 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
