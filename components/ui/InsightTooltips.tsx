'use client'

import React, { useState, useRef, useEffect } from 'react'
import { InsightContext } from '@/lib/types/insightContext'

// --- BASE TOOLTIP COMPONENT ---

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  colorClass: string // e.g., 'border-amber-500', 'border-red-500'
}

export function Tooltip({ children, content, colorClass }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<'above' | 'below'>('above')
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && containerRef.current && tooltipRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      // Check if there is enough space above
      if (rect.top - tooltipRect.height < 10) {
        setPosition('below')
      } else {
        setPosition('above')
      }
    }
  }, [open])

  // Handle click outside for mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div 
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(!open)}
    >
      <span className={`border-bottom-dashed cursor-help border-b-[1px] border-dashed ${colorClass}`}>
        {children}
      </span>
      
      {open && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 w-[260px] bg-white border border-[#e4e4e9] rounded-lg shadow-lg p-4 text-[13px] text-[#111116] transition-all animate-in fade-in duration-150 ${
            position === 'above' 
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' 
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
        >
          {content}
          {/* Arrow */}
          <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-[#e4e4e9] transform rotate-45 ${
            position === 'above' ? 'bottom-[-5px] border-l-0 border-t-0 border-r border-b' : 'top-[-5px]'
          }`} />
        </div>
      )}
    </div>
  )
}

// --- SPECIFIC TOOLTIP CONTENTS ---

// 1. SubjectTooltip
export function SubjectTooltip({ stat }: { stat: InsightContext['subject_stats'][0] }) {
  const hasData = stat.current_score !== null || stat.attendance_percentage !== null
  
  if (!hasData) {
    return <div className="text-[#9090a0] italic">No data available</div>
  }

  const scoreDropped = stat.previous_score !== null && stat.current_score !== null && stat.current_score < stat.previous_score
  const scoreImproved = stat.previous_score !== null && stat.current_score !== null && stat.current_score > stat.previous_score

  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">{stat.subject}</div>
      
      {stat.current_score !== null && (
        <div className="flex justify-between">
          <span className="text-[#52525e]">Score:</span>
          <span className="font-medium">
            {stat.current_score}% 
            {stat.previous_score !== null && (
              <span className={`text-[11px] ml-1 ${scoreDropped ? 'text-amber-500' : scoreImproved ? 'text-green-500' : 'text-[#9090a0]'}`}>
                (prev: {stat.previous_score}%) {scoreDropped ? '▼' : scoreImproved ? '▲' : ''}
              </span>
            )}
          </span>
        </div>
      )}
      
      {stat.grade && (
        <div className="flex justify-between">
          <span className="text-[#52525e]">Grade:</span>
          <span className="font-medium">{stat.grade}</span>
        </div>
      )}
      
      {stat.attendance_percentage !== null && (
        <div className="flex justify-between">
          <span className="text-[#52525e]">Attendance:</span>
          <span className={`font-medium ${stat.attendance_percentage < 60 ? 'text-red-500' : stat.attendance_percentage < 75 ? 'text-amber-500' : 'text-green-500'}`}>
            {stat.attendance_percentage}% 
            {stat.attendance_percentage < 75 && <span className="ml-1">⚠</span>}
          </span>
        </div>
      )}
      
      {stat.is_goal_related && (
        <div className="text-amber-600 text-[11px] font-medium flex items-center gap-1">
          <span>🎯</span> Goal-related
        </div>
      )}
      
      {stat.is_prerequisite_for.length > 0 && (
        <div className="text-[#52525e] text-[11px]">
          <span className="font-medium">⚠ Prerequisite for:</span> {stat.is_prerequisite_for.join(', ')}
        </div>
      )}
    </div>
  )
}

// 2. SgpaTooltip
export function SgpaTooltip({ history, backlogs }: { history: InsightContext['sgpa_history'], backlogs: InsightContext['active_backlogs'] }) {
  if (history.length === 0) return <div className="text-[#9090a0] italic">No SGPA history</div>

  const last3 = history.slice(-3).reverse()
  
  let trend = 'stable'
  if (history.length >= 2) {
    const last = history[history.length - 1].sgpa
    const prev = history[history.length - 2].sgpa
    if (last < prev) trend = 'declining'
    else if (last > prev) trend = 'improving'
  }

  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">Academic Performance</div>
      
      <div className="space-y-1">
        {last3.map((entry, i) => {
          const nextEntry = last3[i + 1]
          const showArrow = nextEntry && entry.sgpa !== nextEntry.sgpa
          const isUp = nextEntry && entry.sgpa > nextEntry.sgpa
          
          return (
            <div key={entry.semester} className="flex justify-between text-[12px]">
              <span className="text-[#52525e]">Sem {entry.semester}:</span>
              <span className="font-medium flex items-center gap-1">
                {entry.sgpa.toFixed(2)}
                {showArrow && (
                  <span className={isUp ? 'text-green-500' : 'text-red-500'}>
                    {isUp ? '▲' : '▼'}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      
      <div className="flex justify-between text-[12px] border-t border-[#f4f4f6] pt-1 mt-1">
        <span className="text-[#52525e]">Trend:</span>
        <span className={`font-medium capitalize ${trend === 'declining' ? 'text-red-500' : trend === 'improving' ? 'text-green-500' : 'text-[#9090a0]'}`}>
          {trend}
        </span>
      </div>
      
      {backlogs.length > 0 && (
        <div className="text-red-500 text-[11px] font-medium">
          Active Backlogs: {backlogs.length}
        </div>
      )}
    </div>
  )
}

// 3. BacklogTooltip
export function BacklogTooltip({ active, cleared }: { active: InsightContext['active_backlogs'], cleared: InsightContext['cleared_backlogs'] }) {
  if (active.length === 0 && cleared.length === 0) {
    return <div className="text-[#9090a0] italic">No active backlogs</div>
  }

  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">Backlogs</div>
      
      {active.length > 0 && (
        <div>
          <div className="text-[#52525e] text-[11px] font-medium">Active ({active.length}):</div>
          <ul className="text-[12px] list-disc list-inside">
            {active.map((b, i) => (
              <li key={i}>{b.subject} (Sem {b.semester})</li>
            ))}
          </ul>
        </div>
      )}
      
      {cleared.length > 0 && (
        <div className="border-t border-[#f4f4f6] pt-1 mt-1">
          <div className="text-[#52525e] text-[11px] font-medium">Cleared ({cleared.length}):</div>
          <ul className="text-[12px] list-disc list-inside text-[#9090a0]">
            {cleared.map((b, i) => (
              <li key={i}>{b.subject} (Sem {b.semester})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// 4. AttendanceTooltip
export function AttendanceTooltip({ ctx }: { ctx: InsightContext }) {
  if (ctx.overall_attendance === null) return <div className="text-[#9090a0] italic">No attendance data</div>

  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">Attendance</div>
      
      <div className="flex justify-between">
        <span className="text-[#52525e]">Overall:</span>
        <span className={`font-medium ${ctx.overall_attendance < 60 ? 'text-red-500' : ctx.overall_attendance < 75 ? 'text-amber-500' : 'text-green-500'}`}>
          {ctx.overall_attendance}%
        </span>
      </div>
      
      {ctx.attendance_trend && (
        <div className="flex justify-between">
          <span className="text-[#52525e]">Trend:</span>
          <span className={`font-medium capitalize flex items-center gap-1 ${ctx.attendance_trend === 'declining' ? 'text-red-500' : ctx.attendance_trend === 'improving' ? 'text-green-500' : 'text-[#9090a0]'}`}>
            {ctx.attendance_trend}
            {ctx.attendance_trend === 'declining' ? '▼' : ctx.attendance_trend === 'improving' ? '▲' : ''}
          </span>
        </div>
      )}
      
      {ctx.last_month_attendance !== null && (
        <div className="flex justify-between">
          <span className="text-[#52525e]">Last Month:</span>
          <span className="font-medium">{ctx.last_month_attendance}%</span>
        </div>
      )}
      
      {ctx.low_attendance_subjects.length > 0 && (
        <div className="border-t border-[#f4f4f6] pt-1 mt-1">
          <div className="text-[#52525e] text-[11px] font-medium">Low Attendance:</div>
          <div className="text-[12px] text-amber-600">{ctx.low_attendance_subjects.join(', ')}</div>
        </div>
      )}
      
      <div className="text-[11px] text-[#9090a0] border-t border-[#f4f4f6] pt-1 mt-1">
        Minimum required: 75%
      </div>
    </div>
  )
}

// 5. TaskTooltip
export function TaskTooltip({ ctx }: { ctx: InsightContext }) {
  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">Tasks</div>
      
      {ctx.overdue_tasks.length > 0 ? (
        <div>
          <div className="text-amber-600 text-[11px] font-medium">Overdue ({ctx.overdue_tasks.length}):</div>
          <ul className="text-[12px] list-disc list-inside">
            {ctx.overdue_tasks.slice(0, 3).map((t, i) => (
              <li key={i}>{t.task} (Due: {t.due_by})</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-green-500 text-[12px]">No overdue tasks</div>
      )}
      
      {ctx.task_completion_history.length > 0 && (
        <div className="border-t border-[#f4f4f6] pt-1 mt-1">
          <div className="text-[#52525e] text-[11px] font-medium">Completion Rate:</div>
          <div className="text-[12px] flex items-center gap-1">
            {ctx.task_completion_history.join('% → ')}%
            {ctx.task_completion_history.length >= 2 && (
              <span className={ctx.task_completion_history[ctx.task_completion_history.length - 1] < ctx.task_completion_history[ctx.task_completion_history.length - 2] ? 'text-red-500' : 'text-green-500'}>
                {ctx.task_completion_history[ctx.task_completion_history.length - 1] < ctx.task_completion_history[ctx.task_completion_history.length - 2] ? '▼' : '▲'}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="flex justify-between text-[12px] border-t border-[#f4f4f6] pt-1 mt-1">
        <span className="text-[#52525e]">Total Completed:</span>
        <span className="font-medium">{ctx.total_tasks_completed}/{ctx.total_tasks_assigned}</span>
      </div>
    </div>
  )
}

// 6. BehavioralTooltip
export function BehavioralTooltip({ ctx }: { ctx: InsightContext }) {
  const toneColors: Record<string, string> = {
    positive: 'bg-green-500',
    neutral: 'bg-gray-500',
    anxious: 'bg-amber-500',
    distressed: 'bg-red-500'
  }

  // Check for streak
  let streak = false
  if (ctx.tone_history.length >= 2) {
    const last = ctx.tone_history[ctx.tone_history.length - 1]
    const prev = ctx.tone_history[ctx.tone_history.length - 2]
    if (last === prev && (last === 'anxious' || last === 'distressed')) {
      streak = true
    }
  }

  const lowEngagementCount = ctx.engagement_history.filter(e => e === 'low').length

  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">Behavioral History</div>
      
      {ctx.tone_history.length > 0 && (
        <div>
          <div className="text-[#52525e] text-[11px] font-medium">Tone (Last 4 sessions):</div>
          <div className="flex gap-2 mt-1">
            {ctx.tone_history.slice(-4).map((tone, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${toneColors[tone] || 'bg-gray-300'}`} />
                <span className="text-[10px] text-[#9090a0] mt-0.5 capitalize">{tone}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {streak && (
        <div className="text-amber-600 text-[11px] font-medium border-t border-[#f4f4f6] pt-1 mt-1">
          ⚠ Sustained {ctx.tone_history[ctx.tone_history.length - 1]} state detected.
        </div>
      )}
      
      {ctx.engagement_history.length > 0 && (
        <div className="border-t border-[#f4f4f6] pt-1 mt-1">
          <div className="text-[#52525e] text-[11px] font-medium">Engagement:</div>
          <div className="text-[12px]">{ctx.engagement_history.slice(-3).join(' → ')}</div>
          {lowEngagementCount > 0 && (
            <div className="text-[11px] text-amber-600">Low engagement seen {lowEngagementCount} times.</div>
          )}
        </div>
      )}
    </div>
  )
}

// 7. GoalTooltip
export function GoalTooltip({ goal, subject_stats }: { goal: InsightContext['goals'][0], subject_stats: InsightContext['subject_stats'] }) {
  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">{goal.title}</div>
      
      {goal.related_subjects.length > 0 && (
        <div>
          <div className="text-[#52525e] text-[11px] font-medium">Related Subjects:</div>
          <ul className="text-[12px] space-y-0.5">
            {goal.related_subjects.map((sub, i) => {
              const stat = subject_stats.find(s => s.subject === sub)
              const score = stat?.current_score
              const isGood = score !== null && score !== undefined && score >= 60
              
              return (
                <li key={i} className="flex justify-between items-center">
                  <span>{sub}</span>
                  {score !== null && score !== undefined ? (
                    <span className="flex items-center gap-0.5">
                      {score}% {isGood ? <span className="text-green-500">✓</span> : <span className="text-amber-500">⚠</span>}
                    </span>
                  ) : (
                    <span className="text-[#9090a0]">—</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      
      {goal.prerequisite_gaps.length > 0 && (
        <div className="border-t border-[#f4f4f6] pt-1 mt-1">
          <div className="text-amber-600 text-[11px] font-medium">Prerequisite Gaps:</div>
          <ul className="text-[11px] list-disc list-inside">
            {goal.prerequisite_gaps.map((gap, i) => (
              <li key={i}>{gap.subject} (Req for {gap.required_for})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// 8. RiskTooltip
export function RiskTooltip({ flag }: { flag: InsightContext['recurring_risk_flags'][0] }) {
  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-600',
    high: 'bg-red-100 text-red-600',
    medium: 'bg-amber-100 text-amber-600',
    low: 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-2">
      <div className="font-bold text-[14px]">{flag.description}</div>
      
      <div className="flex justify-between items-center">
        <span className="text-[#52525e] text-[12px]">Severity:</span>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${severityColors[flag.severity] || 'bg-gray-100'}`}>
          {flag.severity}
        </span>
      </div>
      
      <div className="flex justify-between text-[12px]">
        <span className="text-[#52525e]">Occurrences:</span>
        <span className="font-medium">{flag.occurrence_count}</span>
      </div>
      
      <div className="flex justify-between text-[12px]">
        <span className="text-[#52525e]">First Seen:</span>
        <span className="font-medium">{flag.first_seen}</span>
      </div>
      
      <div className="flex justify-between text-[12px]">
        <span className="text-[#52525e]">Status:</span>
        <span className={`font-medium ${flag.resolved ? 'text-green-500' : 'text-red-500'}`}>
          {flag.resolved ? 'Resolved' : 'Unresolved'}
        </span>
      </div>
    </div>
  )
}
