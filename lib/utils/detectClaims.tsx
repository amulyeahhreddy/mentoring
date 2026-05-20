import React from 'react'
import { InsightContext } from '@/lib/types/insightContext'
import { 
  Tooltip, 
  SubjectTooltip, 
  SgpaTooltip, 
  BacklogTooltip, 
  AttendanceTooltip, 
  TaskTooltip, 
  BehavioralTooltip, 
  GoalTooltip, 
  RiskTooltip 
} from '@/components/ui/InsightTooltips'

interface Match {
  start: number
  end: number
  text: string
  ruleIndex: number
  component: React.ComponentType<any>
  colorClass: string
  props: any
}

export function detectClaims(text: string, ctx: InsightContext): React.ReactNode {
  if (!text) return text

  const matches: Match[] = []
  const usedRanges: { start: number; end: number }[] = []

  const isOverlapping = (start: number, end: number) => {
    return usedRanges.some(r => (start >= r.start && start < r.end) || (end > r.start && end <= r.end) || (start <= r.start && end >= r.end))
  }

  const addRange = (start: number, end: number) => {
    usedRanges.push({ start, end })
  }

  // Define rules in order of priority
  const rules = [
    // 1. SUBJECT NAMES
    {
      name: 'subject',
      getPatterns: (c: InsightContext) => c.subject_stats.map(s => s.subject),
      component: SubjectTooltip,
      getColorClass: (m: string, c: InsightContext) => {
        const stat = c.subject_stats.find(s => s.subject.toLowerCase() === m.toLowerCase())
        if (stat && stat.attendance_percentage !== null && stat.attendance_percentage < 75) return 'border-amber-500'
        return 'border-green-500'
      },
      getProps: (m: string, c: InsightContext) => ({
        stat: c.subject_stats.find(s => s.subject.toLowerCase() === m.toLowerCase())
      }),
      useWordBoundary: true
    },
    // 2. SGPA / ACADEMIC PERFORMANCE
    {
      name: 'sgpa',
      getPatterns: () => ["sgpa", "academic performance", "grades", "gpa", "performance declining", "academically", "results"],
      component: SgpaTooltip,
      getColorClass: (m: string, c: InsightContext) => {
        const history = c.sgpa_history
        if (history.length >= 2 && history[history.length - 1].sgpa < history[history.length - 2].sgpa) {
          return 'border-red-500'
        }
        return 'border-gray-500'
      },
      getProps: (m: string, c: InsightContext) => ({
        history: c.sgpa_history,
        backlogs: c.active_backlogs
      }),
      useWordBoundary: true
    },
    // 3. BACKLOGS
    {
      name: 'backlog',
      getPatterns: () => ["backlog", "arrear", "pending subject", "failed subject", "re-appear", "re-exam"],
      component: BacklogTooltip,
      getColorClass: () => 'border-red-500',
      getProps: (m: string, c: InsightContext) => ({
        active: c.active_backlogs,
        cleared: c.cleared_backlogs
      }),
      useWordBoundary: true
    },
    // 4. ATTENDANCE
    {
      name: 'attendance',
      getPatterns: () => ["attendance", "absent", "absences", "missing class", "missing lecture", "missing lab", "bunking", "not attending"],
      component: AttendanceTooltip,
      getColorClass: (m: string, c: InsightContext) => {
        if (c.overall_attendance !== null && c.overall_attendance < 60) return 'border-red-500'
        if (c.overall_attendance !== null && c.overall_attendance < 75) return 'border-amber-500'
        return 'border-green-500'
      },
      getProps: (m: string, c: InsightContext) => ({ ctx: c }),
      useWordBoundary: true
    },
    // 5. TASKS
    {
      name: 'task',
      getPatterns: () => ["task", "assignment", "pending work", "follow-through", "completion", "not completed", "hasn't done", "overdue"],
      component: TaskTooltip,
      getColorClass: (m: string, c: InsightContext) => {
        if (c.overdue_tasks.length > 0) return 'border-amber-500'
        return 'border-green-500'
      },
      getProps: (m: string, c: InsightContext) => ({ ctx: c }),
      useWordBoundary: true
    },
    // 6. BEHAVIORAL
    {
      name: 'behavioral',
      getPatterns: () => ["anxious", "stressed", "anxiety", "distressed", "disengaged", "withdrawn", "low engagement", "not engaging", "low motivation", "struggling emotionally", "burned out", "burnout"],
      component: BehavioralTooltip,
      getColorClass: () => 'border-amber-500', // Assuming negative since we match negative phrases
      getProps: (m: string, c: InsightContext) => ({ ctx: c }),
      useWordBoundary: true
    },
    // 7. GOALS
    {
      name: 'goal',
      getPatterns: (c: InsightContext) => [
        ...c.goals.map(g => g.title),
        "career goal", "target career", "aspires to", "wants to be"
      ],
      component: GoalTooltip,
      getColorClass: () => 'border-amber-500',
      getProps: (m: string, c: InsightContext) => {
        const goal = c.goals.find(g => g.title.toLowerCase() === m.toLowerCase()) || { title: m, related_subjects: [], prerequisite_gaps: [] }
        return {
          goal: goal,
          subject_stats: c.subject_stats
        }
      },
      useWordBoundary: false // Goal titles might be long phrases
    },
    // 8. RISK FLAGS
    {
      name: 'risk',
      getPatterns: (c: InsightContext) => c.recurring_risk_flags.map(f => f.description).filter(d => d.length >= 4),
      component: RiskTooltip,
      getColorClass: (m: string, c: InsightContext) => {
        const flag = c.recurring_risk_flags.find(f => f.description.toLowerCase().includes(m.toLowerCase()))
        if (flag && (flag.severity === 'high' || flag.severity === 'critical')) return 'border-red-500'
        return 'border-amber-500'
      },
      getProps: (m: string, c: InsightContext) => ({
        flag: c.recurring_risk_flags.find(f => f.description.toLowerCase().includes(m.toLowerCase())) || { description: m, severity: 'low', occurrence_count: 1, first_seen: '', resolved: false }
      }),
      useWordBoundary: false
    }
  ]

  // Find matches for each rule in order
  rules.forEach((rule, ruleIndex) => {
    const patterns = rule.getPatterns(ctx)
    
    patterns.forEach(pattern => {
      if (!pattern) return
      
      // Escape special characters for regex
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regexStr = rule.useWordBoundary ? `\\b${escapedPattern}\\b` : escapedPattern
      const regex = new RegExp(regexStr, 'gi')
      
      let match
      while ((match = regex.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length
        const matchText = match[0]
        
        if (!isOverlapping(start, end)) {
          matches.push({
            start,
            end,
            text: matchText,
            ruleIndex,
            component: rule.component,
            colorClass: rule.getColorClass(matchText, ctx),
            props: rule.getProps(matchText, ctx)
          })
          addRange(start, end)
        }
      }
    })
  })

  // Sort matches by start index
  matches.sort((a, b) => a.start - b.start)

  // Reconstruct text with React nodes
  if (matches.length === 0) return text

  const result: React.ReactNode[] = []
  let lastIndex = 0

  matches.forEach((match, index) => {
    // Add text before match
    if (match.start > lastIndex) {
      result.push(text.slice(lastIndex, match.start))
    }

    // Add wrapped match
    const TooltipContent = match.component
    result.push(
      <Tooltip key={index} colorClass={match.colorClass} content={<TooltipContent {...match.props} />}>
        {match.text}
      </Tooltip>
    )

    lastIndex = match.end
  })

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return <>{result}</>
}
