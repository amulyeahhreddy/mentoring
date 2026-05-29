'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Edit2, Loader2, Save } from 'lucide-react'

const recordSchema = z.object({
  id: z.string().optional(),
  level: z.enum(['10th', '12th_MPC', '12th_BiPC', 'Diploma']),
  board: z.string().min(1, 'Board is required'),
  subjects: z.string().min(1, 'Subjects are required'),
  year_of_passing: z.coerce.number().min(1990).max(2030),
  percentage: z.coerce.number().min(0).max(100),
  grade: z.string().min(1, 'Grade is required'),
  medium: z.string().min(1, 'Medium is required')
})

type RecordFormValues = z.infer<typeof recordSchema>

const LEVELS = ['10th', '12th_MPC', '12th_BiPC', 'Diploma'] as const

interface PreAdmissionFormProps {
  studentId: string
  initialData: any[]
}

export default function PreAdmissionForm({ studentId, initialData }: PreAdmissionFormProps) {
  const [records, setRecords] = useState(initialData)
  
  return (
    <div className="space-y-8">
      {LEVELS.map((level) => {
        const existingRecord = records.find(r => r.level === level)
        return (
          <LevelRow 
            key={level} 
            level={level} 
            studentId={studentId} 
            existingRecord={existingRecord} 
            onSave={(updated) => {
              setRecords(prev => {
                const filtered = prev.filter(r => r.level !== level)
                return [...filtered, updated]
              })
            }} 
          />
        )
      })}
    </div>
  )
}

function LevelRow({ level, studentId, existingRecord, onSave }: { level: string, studentId: string, existingRecord: any, onSave: (data: any) => void }) {
  const [isEditing, setIsEditing] = useState(!existingRecord)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(recordSchema),
    defaultValues: existingRecord || {
      level: level as any,
      board: '',
      subjects: '',
      year_of_passing: new Date().getFullYear(),
      percentage: 0,
      grade: '',
      medium: 'English'
    }
  })

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/pre-admission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      onSave(saved)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save record')
    } finally {
      setIsLoading(false)
    }
  }

  const levelDisplay = level.replace('_', ' ')

  if (!isEditing && existingRecord) {
    return (
      <div className="p-4 border rounded-lg bg-muted/20 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1 w-full text-sm">
          <div>
            <p className="text-muted-foreground text-xs font-semibold">Level</p>
            <p className="font-medium">{levelDisplay}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-semibold">Board</p>
            <p>{existingRecord.board}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-semibold">Subjects</p>
            <p>{existingRecord.subjects}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-semibold">Year</p>
            <p>{existingRecord.year_of_passing}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-semibold">% / Grade</p>
            <p>{existingRecord.percentage}% / {existingRecord.grade}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-semibold">Medium</p>
            <p>{existingRecord.medium}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="text-primary hover:bg-primary/10 p-2 rounded-md transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 border rounded-lg border-primary/20 bg-background space-y-4 shadow-sm relative">
      <div className="flex items-center gap-2 mb-2 border-b pb-2">
        <h3 className="font-semibold text-lg text-primary">{levelDisplay} Record</h3>
      </div>
      
      {error && <p className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Board/University</label>
          <input {...register('board')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {errors.board && <span className="text-xs text-destructive">{errors.board.message?.toString()}</span>}
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium">Subjects</label>
          <input {...register('subjects')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {errors.subjects && <span className="text-xs text-destructive">{errors.subjects.message?.toString()}</span>}
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium">Year of Passing</label>
          <input type="number" {...register('year_of_passing')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {errors.year_of_passing && <span className="text-xs text-destructive">{errors.year_of_passing.message?.toString()}</span>}
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium">Percentage (0-100)</label>
          <input type="number" step="0.01" {...register('percentage')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {errors.percentage && <span className="text-xs text-destructive">{errors.percentage.message?.toString()}</span>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Grade</label>
          <input {...register('grade')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {errors.grade && <span className="text-xs text-destructive">{errors.grade.message?.toString()}</span>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Medium of Instruction</label>
          <input {...register('medium')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {errors.medium && <span className="text-xs text-destructive">{errors.medium.message?.toString()}</span>}
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        {existingRecord && (
          <button 
            type="button" 
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          disabled={isLoading}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 shadow"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save {levelDisplay}
        </button>
      </div>
    </form>
  )
}
