'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Loader2, Upload, ExternalLink } from 'lucide-react'
import { ARTIFACT_TYPES, PORTFOLIO_DEFAULTS, ALL_ATTRIBUTES, ALL_PROGRAM_OUTCOMES } from '@/lib/portfolio-defaults'

const ratingSchema = z.object({
  id: z.string().optional(),
  artifact_type: z.string(),
  rating: z.coerce.number().min(1).max(5),
  evidence_description: z.string().optional(),
  attributes_mapped: z.array(z.string()).default([]),
  program_outcomes_mapped: z.array(z.string()).default([]),
  file_attachment_url: z.string().optional()
})

type FormValues = z.infer<typeof ratingSchema>

export default function PortfolioRubric({ studentId, semester, initialData, userRole }: { studentId: string, semester: string, initialData: any[], userRole: string }) {
  const isMentor = userRole === 'mentor'

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
        <h3 className="font-semibold text-primary mb-2">Rubric Guidelines</h3>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="bg-background px-2 py-1 rounded shadow-sm">1 = Inadequate</span>
          <span className="bg-background px-2 py-1 rounded shadow-sm">2 = Satisfactory</span>
          <span className="bg-background px-2 py-1 rounded shadow-sm">3 = Good</span>
          <span className="bg-background px-2 py-1 rounded shadow-sm">4 = Excellent</span>
          <span className="bg-background px-2 py-1 rounded shadow-sm">5 = Outstanding</span>
        </div>
      </div>

      <div className="space-y-4">
        {ARTIFACT_TYPES.map(artifactType => {
          const existingRecord = initialData.find(r => r.artifact_type === artifactType)
          // If mentee is viewing and there's no rating, don't show empty rows
          if (!isMentor && !existingRecord) return null
          
          return (
            <ArtifactRow 
              key={artifactType} 
              artifactType={artifactType} 
              existingRecord={existingRecord}
              studentId={studentId}
              semester={semester}
              isMentor={isMentor}
            />
          )
        })}
      </div>
      
      {!isMentor && initialData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          No portfolio artifacts have been rated by your mentor for this semester yet.
        </div>
      )}
    </div>
  )
}

function ArtifactRow({ artifactType, existingRecord, studentId, semester, isMentor }: any) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(!!existingRecord)
  const [record, setRecord] = useState(existingRecord)

  const { register, handleSubmit, watch, setValue, control } = useForm<any>({
    resolver: zodResolver(ratingSchema),
    defaultValues: record || {
      artifact_type: artifactType,
      rating: 0,
      attributes_mapped: [],
      program_outcomes_mapped: []
    }
  })

  const currentRating = watch('rating')

  // Auto-fill on first rating
  const handleRatingChange = (val: number) => {
    setValue('rating', val)
    if (!record && val > 0) {
      const defaults = PORTFOLIO_DEFAULTS[artifactType]
      if (defaults) {
        setValue('attributes_mapped', defaults.attributes)
        setValue('program_outcomes_mapped', defaults.programOutcomes)
      }
    }
  }

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      const method = record ? 'PATCH' : 'POST'
      const payload = { ...data, semester_label: semester }
      
      const res = await fetch(`/api/students/${studentId}/portfolio`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      setRecord(saved)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (err: any) {
      alert(err.message || 'Failed to save rating')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-5 border rounded-xl bg-card space-y-4 shadow-sm transition-all focus-within:ring-1 focus-within:ring-primary/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-3">
        <h3 className="font-semibold text-lg max-w-lg">{artifactType}</h3>
        
        <div className="flex items-center gap-2">
          {[1,2,3,4,5].map(num => (
            <button
              key={num}
              type="button"
              disabled={!isMentor}
              onClick={() => handleRatingChange(num)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${currentRating === num ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {(currentRating > 0 || record) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 text-sm">
          <div className="space-y-2 lg:col-span-1">
            <label className="font-medium text-muted-foreground">Evidence / Description</label>
            <textarea 
              {...register('evidence_description')} 
              disabled={!isMentor}
              placeholder="Describe the artifact..."
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" 
            />
            
            <div className="space-y-1 pt-2">
              <label className="font-medium text-muted-foreground">File Attachment URL</label>
              <div className="flex gap-2">
                <input 
                  {...register('file_attachment_url')} 
                  disabled={!isMentor}
                  placeholder="https://..."
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" 
                />
                {watch('file_attachment_url') && (
                  <a href={watch('file_attachment_url')} target="_blank" rel="noreferrer" className="flex items-center justify-center h-9 w-9 border rounded bg-muted hover:bg-muted/80">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4 lg:col-span-2">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Attributes Mapped</label>
              <Controller
                name="attributes_mapped"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {ALL_ATTRIBUTES.map(attr => (
                      <label key={attr} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium cursor-pointer transition-colors ${field.value.includes(attr) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-muted/50 text-muted-foreground'} ${!isMentor ? 'opacity-70 pointer-events-none' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={!isMentor}
                          className="hidden"
                          checked={field.value.includes(attr)}
                          onChange={(e) => {
                            if (e.target.checked) field.onChange([...field.value, attr])
                            else field.onChange(field.value.filter((v: string) => v !== attr))
                          }}
                        />
                        {attr}
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Program Outcomes (PO)</label>
              <Controller
                name="program_outcomes_mapped"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {ALL_PROGRAM_OUTCOMES.map(po => (
                      <label key={po} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium cursor-pointer transition-colors ${field.value.includes(po) ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-muted/50 text-muted-foreground'} ${!isMentor ? 'opacity-70 pointer-events-none' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={!isMentor}
                          className="hidden"
                          checked={field.value.includes(po)}
                          onChange={(e) => {
                            if (e.target.checked) field.onChange([...field.value, po])
                            else field.onChange(field.value.filter((v: string) => v !== po))
                          }}
                        />
                        {po}
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
            
            {isMentor && (
              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 transition-colors ${isSaved ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow'}`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {isSaved ? 'Saved!' : 'Save Rating'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
