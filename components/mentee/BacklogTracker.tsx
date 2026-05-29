'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

const attemptSchema = z.object({
  month: z.string().optional(),
  grade: z.string().optional(),
  result: z.enum(['Pass', 'Fail', 'Absent', '']).optional()
})

const backlogSchema = z.object({
  id: z.string().optional(),
  year: z.coerce.number().min(1).max(4),
  semester: z.coerce.number().min(1).max(2),
  course_code: z.string().min(1, 'Required'),
  course_name: z.string().min(1, 'Required'),
  attempt_1_month: z.string().optional(),
  attempt_1_grade: z.string().optional(),
  attempt_1_result: z.string().optional(),
  attempt_2_month: z.string().optional(),
  attempt_2_grade: z.string().optional(),
  attempt_2_result: z.string().optional(),
  attempt_3_month: z.string().optional(),
  attempt_3_grade: z.string().optional(),
  attempt_3_result: z.string().optional(),
  attempt_4_month: z.string().optional(),
  attempt_4_grade: z.string().optional(),
  attempt_4_result: z.string().optional(),
  remarks: z.string().optional()
})

type FormValues = z.infer<typeof backlogSchema>

export default function BacklogTracker({ studentId, initialData, userRole }: { studentId: string, initialData: any[], userRole: string }) {
  const isMentor = userRole === 'mentor'
  const [records, setRecords] = useState(initialData)
  const [isAdding, setIsAdding] = useState(false)

  // Determine active status
  const getStatus = (r: any) => {
    const attempts = [r.attempt_4_result, r.attempt_3_result, r.attempt_2_result, r.attempt_1_result]
    const latest = attempts.find(a => a && a !== '')
    if (latest === 'Pass') return 'cleared'
    return 'active'
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-destructive w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Active Backlogs</p>
            <p className="text-2xl font-bold text-destructive/80">{records.filter(r => getStatus(r) === 'active').length}</p>
          </div>
        </div>
        <div className="bg-green-100 border border-green-200 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="text-green-600 w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold text-green-700">Cleared Backlogs</p>
            <p className="text-2xl font-bold text-green-700/80">{records.filter(r => getStatus(r) === 'cleared').length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {records.map(record => (
          <BacklogRow key={record.id} record={record} isMentor={isMentor} studentId={studentId} onUpdate={(updated: any) => {
            setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
          }} />
        ))}
      </div>

      {isMentor && (
        <div className="pt-4">
          {isAdding ? (
            <BacklogRow 
              isMentor={true} 
              studentId={studentId} 
              isNew={true}
              onUpdate={(created: any) => {
                setRecords(prev => [...prev, created])
                setIsAdding(false)
              }} 
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New Backlog Record
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BacklogRow({ record, isMentor, studentId, isNew = false, onUpdate, onCancel }: any) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(backlogSchema),
    defaultValues: record || { year: 1, semester: 1 }
  })

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      const method = data.id ? 'PATCH' : 'POST'
      const res = await fetch(`/api/students/${studentId}/backlogs`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      onUpdate(saved)
      setIsEditing(false)
    } catch (err: any) {
      alert(err.message || 'Failed to save record')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatus = (r: any) => {
    if (!r) return 'active'
    const attempts = [r.attempt_4_result, r.attempt_3_result, r.attempt_2_result, r.attempt_1_result]
    const latest = attempts.find(a => a && a !== '')
    if (latest === 'Pass') return 'cleared'
    return 'active'
  }

  const status = getStatus(record)
  const statusColor = status === 'cleared' ? 'border-green-200 bg-green-50' : 'border-destructive/20 bg-destructive/5'

  if (!isEditing && record) {
    return (
      <div className={`p-4 border rounded-xl flex flex-col gap-4 ${statusColor}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{record.course_code} - {record.course_name}</h3>
            <p className="text-sm text-muted-foreground">Year {record.year} | Sem {record.semester}</p>
          </div>
          {isMentor && (
            <button onClick={() => setIsEditing(true)} className="text-sm text-primary hover:underline">Edit Attempts</button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {[1,2,3,4].map(num => {
            const m = record[`attempt_${num}_month`]
            const g = record[`attempt_${num}_grade`]
            const r = record[`attempt_${num}_result`]
            if (!m && !g && !r) return null
            return (
              <div key={num} className="bg-white/50 p-2 rounded border border-black/5">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Attempt {num}</p>
                <p>{m || '-'} | {g || '-'} | <span className={r==='Pass'?'text-green-600 font-medium':r==='Fail'?'text-destructive font-medium':''}>{r || '-'}</span></p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 border border-primary/20 rounded-xl bg-card space-y-4 shadow-sm">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-semibold text-primary">{isNew ? 'New Backlog Record' : 'Edit Backlog'}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">Year</label>
          <input type="number" {...register('year')} className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Semester</label>
          <input type="number" {...register('semester')} className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Course Code</label>
          <input {...register('course_code')} className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
        </div>
        <div className="space-y-1 md:col-span-4">
          <label className="text-xs font-medium">Course Name</label>
          <input {...register('course_name')} className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <h4 className="text-sm font-semibold">Attempts</h4>
        {[1,2,3,4].map(num => (
          <div key={num} className="grid grid-cols-3 gap-2 p-2 bg-muted/20 rounded border">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">A{num} Month</label>
              <input {...register(`attempt_${num}_month` as any)} placeholder="e.g. Nov 2025" className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">A{num} Grade</label>
              <input {...register(`attempt_${num}_grade` as any)} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">A{num} Result</label>
              <select {...register(`attempt_${num}_result` as any)} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                <option value=""></option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel || (() => setIsEditing(false))} className="h-9 px-4 text-sm border rounded-md hover:bg-accent">Cancel</button>
        <button type="submit" disabled={isLoading} className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-flex items-center">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Record
        </button>
      </div>
    </form>
  )
}
