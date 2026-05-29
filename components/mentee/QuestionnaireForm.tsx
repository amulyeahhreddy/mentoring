'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'

export const CLUBS = [
  "Photography", "Fine Arts", "Debate", "Quiz", "Literary", "Music", "Dance", "Drama", 
  "NSS", "NCC", "Sports", "Chess", "Science", "Robotics", "Coding", "Entrepreneurship", 
  "Environment", "Social Service", "Reading", "Films", "Nature", "Yoga", "Wellness", "Research"
]

export const PRO_BODIES = ["ISTE", "IEEE", "CSI", "IETE", "SAE", "ICP"]

const questionnaireSchema = z.object({
  academic_year: z.string(),
  area_of_stay: z.string().optional(),
  transport_mode: z.string().optional(),
  transport_inconvenience: z.boolean().optional(),
  transport_inconvenience_details: z.string().optional(),
  
  hobbies: z.string().optional(),
  health_issues: z.string().optional(),
  home_study_environment_ok: z.boolean().optional(),
  home_study_environment_notes: z.string().optional(),
  
  study_issues: z.string().optional(),
  academic_regulation_aware: z.boolean().optional(),
  parent_informed_autonomous: z.boolean().optional(),
  engineering_determination: z.boolean().optional(),
  engineering_determination_reason: z.string().optional(),
  
  ragging_experienced: z.boolean().optional(),
  ragging_details: z.string().optional(),
  ragging_suggestions: z.string().optional(),
  
  interested_in_sports: z.boolean().optional(),
  sports_details: z.string().optional(),
  interested_in_organising_activities: z.boolean().optional(),
  organising_details: z.string().optional(),
  club_interests: z.array(z.string()).optional().default([]),
  professional_body_interests: z.array(z.string()).optional().default([]),
  professional_body_membership_timeline: z.string().optional(),
  soft_skills_centre_aware: z.boolean().optional(),
  
  strengths_text: z.string().optional(),
  weaknesses_text: z.string().optional(),
  skill_problem_solving: z.string().optional(),
  skill_communication: z.string().optional(),
  skill_mathematics: z.string().optional(),
  skill_inquisitiveness: z.string().optional(),
  skill_learning: z.string().optional(),
  skill_innovation: z.string().optional(),
  improvement_efforts: z.string().optional(),
  institution_expectation: z.string().optional(),
})

type FormValues = z.infer<typeof questionnaireSchema>

export default function QuestionnaireForm({ studentId, initialData }: { studentId: string, initialData: any }) {
  const isReadOnly = !!(initialData && initialData.submitted_at)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: initialData || {
      club_interests: [],
      professional_body_interests: [],
    }
  })

  const w_transport_inconv = watch('transport_inconvenience')
  const w_home_study_bad = !watch('home_study_environment_ok')
  const w_eng_det = watch('engineering_determination')
  const w_ragging = watch('ragging_experienced')
  const w_sports = watch('interested_in_sports')
  const w_org = watch('interested_in_organising_activities')

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError('')
    try {
      const payload = { ...data, submitted_at: new Date().toISOString() }
      const res = await fetch(`/api/students/${studentId}/questionnaire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccess(true)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: any) {
      console.error('Questionnaire submission error:', err)
      setError(err.message || 'Failed to submit')
    } finally {
      setIsLoading(false)
    }
  }
  const onError = (errors: any) => {
    console.error('Validation errors blocking submission:', errors, errors);
  };
  const RadioSkillRow = ({ label, field }: { label: string, field: any }) => (
    <div className="grid grid-cols-6 gap-2 items-center py-2 border-b text-sm">
      <div className="font-medium">{label}</div>
      {['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Unable to Judge'].map(opt => (
        <label key={opt} className="flex justify-center">
          <input type="radio" value={opt} {...register(field)} disabled={isReadOnly} className="h-4 w-4 text-primary" />
        </label>
      ))}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      {success && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">Submitted successfully!</div>}
      
      {/* 1. Transport */}
      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">1. Transport & Logistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Area of Stay</label>
            <input {...register('area_of_stay')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Mode of Transport</label>
            <input {...register('transport_mode')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm text-sm" />
          </div>
          <div className="space-y-1 flex items-center gap-2 mt-4">
            <input type="checkbox" {...register('transport_inconvenience')} disabled={isReadOnly} className="h-4 w-4" />
            <label className="text-sm font-medium">Any inconvenience in transport?</label>
          </div>
          {w_transport_inconv && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Details</label>
              <textarea {...register('transport_inconvenience_details')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
            </div>
          )}
        </div>
      </section>

      {/* 2. Personal */}
      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">2. Personal Background</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Hobbies & Interests</label>
            <textarea {...register('hobbies')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Health Issues (if any)</label>
            <textarea {...register('health_issues')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
          <div className="space-y-1 flex items-center gap-2">
            <input type="checkbox" {...register('home_study_environment_ok')} disabled={isReadOnly} className="h-4 w-4" />
            <label className="text-sm font-medium">Is the study environment at home satisfactory?</label>
          </div>
          {w_home_study_bad && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Please explain</label>
              <textarea {...register('home_study_environment_notes')} disabled={isReadOnly} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
            </div>
          )}
        </div>
      </section>

      {/* 3. Academic */}
      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">3. Academic Awareness</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('academic_regulation_aware')} disabled={isReadOnly} className="h-4 w-4" />
            <label className="text-sm font-medium">Are you aware of academic regulations?</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('parent_informed_autonomous')} disabled={isReadOnly} className="h-4 w-4" />
            <label className="text-sm font-medium">Have you informed your parents about the autonomous status?</label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">What determined you to choose Engineering?</label>
              <textarea {...register('engineering_determination_reason')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Any study related issues?</label>
              <textarea {...register('study_issues')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Safety (Ragging) */}
      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">4. Safety (Ragging Prevention)</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('ragging_experienced')} disabled={isReadOnly} className="h-4 w-4" />
            <label className="text-sm font-medium">Have you ever experienced ragging?</label>
          </div>
          {w_ragging && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Details</label>
              <textarea {...register('ragging_details')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium">Suggestions to prevent ragging</label>
            <textarea {...register('ragging_suggestions')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
        </div>
      </section>

      {/* 5. Co-Curricular */}
      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">5. Co-Curricular Interests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('interested_in_sports')} disabled={isReadOnly} className="h-4 w-4" />
              <label className="text-sm font-medium">Interested in Sports?</label>
            </div>
            {w_sports && <input {...register('sports_details')} disabled={isReadOnly} placeholder="Which sports?" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />}
            
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" {...register('interested_in_organising_activities')} disabled={isReadOnly} className="h-4 w-4" />
              <label className="text-sm font-medium">Interested in organising activities?</label>
            </div>
            {w_org && <input {...register('organising_details')} disabled={isReadOnly} placeholder="Details" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Professional Bodies</label>
            <div className="flex flex-wrap gap-2">
              {PRO_BODIES.map(pb => (
                <label key={pb} className="flex items-center gap-1 text-sm bg-muted/50 px-2 py-1 rounded">
                  <input type="checkbox" value={pb} {...register('professional_body_interests')} disabled={isReadOnly} /> {pb}
                </label>
              ))}
            </div>
            <input {...register('professional_body_membership_timeline')} disabled={isReadOnly} placeholder="When do you plan to take membership?" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-2" />
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-medium">Club Interests</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CLUBS.map(club => (
              <label key={club} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={club} {...register('club_interests')} disabled={isReadOnly} className="h-4 w-4" /> {club}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Self-Assessment */}
      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">6. Self-Assessment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">My Strengths</label>
            <textarea {...register('strengths_text')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">My Weaknesses</label>
            <textarea {...register('weaknesses_text')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
        </div>

        <div className="overflow-x-auto pt-4">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b text-center">
              <div className="text-left">Skill Area</div>
              <div>Excellent</div>
              <div>Very Good</div>
              <div>Good</div>
              <div>Satisfactory</div>
              <div>Unable to Judge</div>
            </div>
            <RadioSkillRow label="Problem Solving" field="skill_problem_solving" />
            <RadioSkillRow label="Communication" field="skill_communication" />
            <RadioSkillRow label="Mathematics" field="skill_mathematics" />
            <RadioSkillRow label="Inquisitiveness" field="skill_inquisitiveness" />
            <RadioSkillRow label="Learning" field="skill_learning" />
            <RadioSkillRow label="Innovation" field="skill_innovation" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Efforts planned for improvement</label>
            <textarea {...register('improvement_efforts')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Expectations from the Institution</label>
            <textarea {...register('institution_expectation')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
        </div>
      </section>

      {!isReadOnly && (
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isLoading}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Submit Questionnaire
          </button>
        </div>
      )}
    </form>
  )
}
