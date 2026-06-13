import { z } from 'zod'

export const AiOutputSchema = z.object({
  observation: z.string(),
  recommendation: z.string(),
  tasks: z.array(z.object({
    text: z.string(),
    assigned_to: z.enum(['student', 'mentor', 'both']),
    due_by: z.string(),
  })).default([]),
  risk_flags: z.array(z.object({
    flag_code: z.string(),
    severity: z.enum(['critical', 'high', 'medium']),
    description: z.string(),
  })).default([]),
  topics_addressed: z.record(z.string(), z.boolean()).default({}),
  issues_checklist: z.record(z.string(), z.boolean()).default({}),
}).passthrough() // allow extra fields for forward-compatibility
