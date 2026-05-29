'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, FileSignature } from 'lucide-react'

const goalsSchema = z.object({
  id: z.string().optional(),
  academic_year: z.string().default('2025-26'),
  academic_goal: z.string().min(1, 'Academic goal is required'),
  academic_activities: z.string().min(1, 'Activities are required'),
  academic_success_criteria: z.string().min(1, 'Success criteria required'),
  personal_goal: z.string().min(1, 'Personal goal is required'),
  personal_activities: z.string().min(1, 'Activities are required'),
  personal_success_criteria: z.string().min(1, 'Success criteria required'),
  talent_1: z.string().optional(),
  talent_2: z.string().optional(),
  prized_possession: z.string().optional(),
  college_year_goal_1: z.string().optional(),
  college_year_goal_2: z.string().optional(),
  proud_of: z.string().optional(),
})

type FormValues = z.infer<typeof goalsSchema>

export default function GoalsForm({ studentId, initialData, userRole }: { studentId: string, initialData: any, userRole: string }) {
  const isSigned = !!(initialData && initialData.mentee_signed)
  const isMentor = userRole === 'mentor'
  // Mentee can edit only if not signed. Mentor can only read, except for review section
  const isReadOnly = isSigned || isMentor
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [showSignConfirm, setShowSignConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<any>({
    resolver: zodResolver(goalsSchema),
    defaultValues: initialData || {}
  })

  // Mentor Review state
  const [reviewNotes, setReviewNotes] = useState(initialData?.review_notes || '')
  const [reviewYear, setReviewYear] = useState(initialData?.review_year || 1)
  const [isReviewing, setIsReviewing] = useState(false)

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccess('Goals saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSign = async () => {
    if (!initialData?.id) {
      setError('Please save the form before signing.')
      return
    }
    setShowSignConfirm(true)
  }

  const confirmSign = async () => {
    setIsSigning(true)
    setShowSignConfirm(false)
    setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/goals/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: initialData.id })
      })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (err: any) {
      console.error('Goals sign error:', err)
      setError(err.message || 'Failed to sign')
      setIsSigning(false)
    }
  }

  const handleMentorReview = async () => {
    setIsReviewing(true)
    setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/goals`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: initialData.id, review_notes: reviewNotes, review_year: reviewYear })
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccess('Review saved successfully')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to save review')
      setIsReviewing(false)
    }
  }

  const FieldRow = ({ label, name, errorObj }: { label: string, name: keyof FormValues, errorObj?: any }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <textarea 
        {...register(name)} 
        disabled={isReadOnly} 
        className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" 
      />
      {errorObj && <span className="text-xs text-destructive">{errorObj.message}</span>}
    </div>
  )

  return (
    <div className="space-y-8">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      {success && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">{success}</div>}
      
      {isSigned && (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex items-center gap-3">
          <FileSignature className="text-primary w-6 h-6" />
          <div>
            <p className="font-semibold text-primary">Goals Officially Declared</p>
            <p className="text-sm text-muted-foreground">Signed on {new Date(initialData.mentee_signed_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">1. Academic Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldRow label="What is your goal?" name="academic_goal" errorObj={errors.academic_goal} />
            <FieldRow label="What activities will you do to reach this goal?" name="academic_activities" errorObj={errors.academic_activities} />
            <FieldRow label="How will you know you have succeeded?" name="academic_success_criteria" errorObj={errors.academic_success_criteria} />
          </div>
        </section>

        <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">2. Personal Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldRow label="What is your goal?" name="personal_goal" errorObj={errors.personal_goal} />
            <FieldRow label="What activities will you do to reach this goal?" name="personal_activities" errorObj={errors.personal_activities} />
            <FieldRow label="How will you know you have succeeded?" name="personal_success_criteria" errorObj={errors.personal_success_criteria} />
          </div>
        </section>

        <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">3. Self-Knowledge</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="Talent/Skill 1" name="talent_1" />
            <FieldRow label="Talent/Skill 2" name="talent_2" />
            <FieldRow label="My most prized possession" name="prized_possession" />
            <FieldRow label="One thing I am really proud of" name="proud_of" />
            <FieldRow label="Goal for this college year (1)" name="college_year_goal_1" />
            <FieldRow label="Goal for this college year (2)" name="college_year_goal_2" />
          </div>
        </section>

        {!isReadOnly && (
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-6 shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </button>
            <button 
              type="button"
              onClick={handleSign}
              disabled={isSigning || isDirty || !initialData?.id}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow"
              title={isDirty ? 'Save changes before signing' : 'Sign and lock goals'}
            >
              {isSigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSignature className="w-4 h-4 mr-2" />}
              I Declare These Goals
            </button>
          </div>
        )}

        {/* Sign Confirmation Modal */}
        {showSignConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-xl shadow-lg max-w-md w-full mx-4 space-y-4">
              <h3 className="text-lg font-semibold">Confirm Goal Declaration</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to sign? You will not be able to edit these goals afterwards.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignConfirm(false)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSign}
                  disabled={isSigning}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
                >
                  {isSigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSignature className="w-4 h-4 mr-2" />}
                  Confirm & Sign
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Mentor Review Section */}
      {(isMentor || initialData?.mentor_reviewed_at) && isSigned && (
        <section className="bg-muted/30 p-6 rounded-xl border border-dashed shadow-sm space-y-4 mt-8">
          <h2 className="text-xl font-semibold border-b pb-2 flex items-center justify-between">
            <span>Annual Mentor Review</span>
            {initialData?.mentor_reviewed_at && (
              <span className="text-sm font-normal text-muted-foreground">Reviewed on {new Date(initialData.mentor_reviewed_at).toLocaleDateString()}</span>
            )}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium w-32">Review Year (1-4)</label>
              <input 
                type="number" 
                min="1" max="4"
                value={reviewYear}
                onChange={(e) => setReviewYear(Number(e.target.value))}
                disabled={!isMentor}
                className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 shadow-sm text-sm" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Review Notes</label>
              <textarea 
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                disabled={!isMentor}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm bg-white" 
              />
            </div>
            
            {isMentor && (
              <div className="flex justify-end pt-2">
                <button 
                  type="button" 
                  onClick={handleMentorReview}
                  disabled={isReviewing}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 shadow"
                >
                  {isReviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Mentor Review
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
