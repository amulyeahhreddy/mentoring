'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, CheckCircle2, Lock } from 'lucide-react'

export default function HandoffForm({ studentId, assignmentId, initialData }: { studentId: string, assignmentId: string, initialData: any }) {
  const isCompleted = initialData?.handoff_completed
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initialData || {}
  })

  const onSubmit = async (data: any) => {
    if (isCompleted) return
    if (!confirm('Are you sure you want to complete this handoff? This will lock the record.')) return
    
    setIsLoading(true)
    setError('')
    try {
      const payload = {
        id: assignmentId,
        handoff_notes: `Academic Summary: ${data.academic_summary}\n\nBehavioral Notes: ${data.behavioral_notes}\n\nCareer Guidance: ${data.career_guidance}`,
        handoff_unresolved_recommendations: data.handoff_unresolved_recommendations,
        handoff_completed: true,
        handoff_completed_at: new Date().toISOString()
      }
      
      const res = await fetch(`/api/students/${studentId}/mentor-assignments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to submit handoff')
      setIsLoading(false)
    }
  }

  // Parse existing notes if they were stored in the structured format above
  let initialAcademic = ''
  let initialBehavioral = ''
  let initialCareer = ''
  
  if (initialData?.handoff_notes) {
    const notes = initialData.handoff_notes
    const parts = notes.split('\n\n')
    parts.forEach((p: string) => {
      if (p.startsWith('Academic Summary: ')) initialAcademic = p.replace('Academic Summary: ', '')
      if (p.startsWith('Behavioral Notes: ')) initialBehavioral = p.replace('Behavioral Notes: ', '')
      if (p.startsWith('Career Guidance: ')) initialCareer = p.replace('Career Guidance: ', '')
    })
    // Fallback if notes weren't formatted nicely
    if (!initialAcademic && !initialBehavioral && !initialCareer) {
      initialAcademic = notes
    }
  }

  if (isCompleted) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full text-green-700">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-green-800 flex items-center gap-2">Handoff Complete <Lock className="w-4 h-4" /></h2>
            <p className="text-green-700/80">This handoff report was completed on {new Date(initialData.handoff_completed_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-6 opacity-90">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">Overall Academic Summary</label>
            <p className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">{initialAcademic || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">Behavioral Notes</label>
            <p className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">{initialBehavioral || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">Career Guidance Given</label>
            <p className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">{initialCareer || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">Unresolved Recommendations</label>
            <p className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">{initialData.handoff_unresolved_recommendations || 'N/A'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card p-6 rounded-xl border shadow-sm space-y-6">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Overall Academic Summary</label>
          <textarea 
            {...register('academic_summary')}
            defaultValue={initialAcademic}
            placeholder="Summarize the student's academic performance, strengths, and weaknesses..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold">Behavioral Notes</label>
          <textarea 
            {...register('behavioral_notes')}
            defaultValue={initialBehavioral}
            placeholder="Notes on attendance, conduct, discipline, and attitude..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Career Guidance Given So Far</label>
          <textarea 
            {...register('career_guidance')}
            defaultValue={initialCareer}
            placeholder="What career paths or skills have you advised the student to focus on?"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-semibold">Unresolved Recommendations</label>
          <p className="text-xs text-muted-foreground mb-2">What specific actions should the NEXT mentor follow up on immediately?</p>
          <textarea 
            {...register('handoff_unresolved_recommendations')}
            defaultValue={initialData?.handoff_unresolved_recommendations || ''}
            placeholder="e.g., Needs to clear 2 backlogs in Math, follow up on their AWS certification progress..."
            className="flex min-h-[100px] w-full rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm shadow-sm"
            required
          />
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t mt-6">
        <button 
          type="submit" 
          disabled={isLoading}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Complete Handoff
        </button>
      </div>
    </form>
  )
}
