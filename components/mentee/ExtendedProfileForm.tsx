'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react'

const profileSchema = z.object({
  roll_number_formatted: z.string().regex(/^[0-9]{2}R[0-9]{2}[A-Z][0-9]{2}[A-Z0-9]{2}$/, 'Must be a valid roll number format like 25R11A05D9').optional().or(z.literal('')),
  eamcet_rank: z.coerce.number().positive().optional().or(z.literal('')),
  admission_quota: z.enum(['Convenor', 'Management', 'NRI']).optional().or(z.literal('')),
  admission_category: z.string().optional(),
  id_mark_1: z.string().optional(),
  id_mark_2: z.string().optional(),
  blood_group: z.string().optional(),
  mobile_number: z.string().optional(),
  personal_email: z.string().email('Invalid email').optional().or(z.literal('')),
  father_name: z.string().optional(),
  father_occupation: z.string().optional(),
  father_education: z.string().optional(),
  father_address: z.string().optional(),
  father_contact_no: z.string().optional(),
  mother_name: z.string().optional(),
  mother_occupation: z.string().optional(),
  mother_education: z.string().optional(),
  mother_contact_no: z.string().optional(),
  local_guardian_name: z.string().optional(),
  local_guardian_occupation: z.string().optional(),
  local_guardian_address: z.string().optional(),
  local_guardian_phone: z.string().optional(),
  parent_email: z.string().email('Invalid email').optional().or(z.literal('')),
  residential_address: z.string().optional()
})

type FormValues = z.infer<typeof profileSchema>

export default function ExtendedProfileForm({ studentId, initialData, isReadOnly }: { studentId: string, initialData: any, isReadOnly?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData || {}
  })

  const onSubmit = async (data: any) => {
    if (isReadOnly) return
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/students/${studentId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccess('Profile details saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <h3 className="text-lg font-bold">Admission & Extended Details</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="p-6 border-t">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
            {success && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">{success}</div>}

            {/* Admission Details */}
            <div className="space-y-4">
              <h4 className="font-semibold border-b pb-2">Admission Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Roll Number (Formatted)</label>
                  <input {...register('roll_number_formatted')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="25R11A05D9" />
                  {errors.roll_number_formatted && <span className="text-xs text-destructive">{errors.roll_number_formatted.message?.toString()}</span>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">EAMCET Rank</label>
                  <input type="number" {...register('eamcet_rank')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Admission Quota</label>
                  <select {...register('admission_quota')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="">Select...</option>
                    <option value="Convenor">Convenor</option>
                    <option value="Management">Management</option>
                    <option value="NRI">NRI</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Admission Category</label>
                  <input {...register('admission_category')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
              </div>
            </div>

            {/* Identification & Address */}
            <div className="space-y-4">
              <h4 className="font-semibold border-b pb-2">Identification & Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Identification Mark 1</label>
                  <input {...register('id_mark_1')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Identification Mark 2</label>
                  <input {...register('id_mark_2')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Blood Group</label>
                  <input {...register('blood_group')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="O+" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <input {...register('mobile_number')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Personal Email</label>
                  <input type="email" {...register('personal_email')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                  {errors.personal_email && <span className="text-xs text-destructive">{errors.personal_email.message?.toString()}</span>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Parent Email</label>
                  <input type="email" {...register('parent_email')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                  {errors.parent_email && <span className="text-xs text-destructive">{errors.parent_email.message?.toString()}</span>}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">Residential Address</label>
                  <textarea {...register('residential_address')} disabled={isReadOnly} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
                </div>
              </div>
            </div>

            {/* Parent Details */}
            <div className="space-y-4">
              <h4 className="font-semibold border-b pb-2">Parent Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Father's Name</label>
                  <input {...register('father_name')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Father's Contact Number</label>
                  <input {...register('father_contact_no')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Father Occupation</label>
                  <input {...register('father_occupation')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Father Education</label>
                  <input {...register('father_education')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">Father Address</label>
                  <input {...register('father_address')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mother's Name</label>
                  <input {...register('mother_name')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mother's Contact Number</label>
                  <input {...register('mother_contact_no')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mother Occupation</label>
                  <input {...register('mother_occupation')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mother Education</label>
                  <input {...register('mother_education')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
              </div>
            </div>

            {/* Local Guardian Details */}
            <div className="space-y-4">
              <h4 className="font-semibold border-b pb-2">Local Guardian</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Guardian Name</label>
                  <input {...register('local_guardian_name')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Guardian Phone</label>
                  <input {...register('local_guardian_phone')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Guardian Occupation</label>
                  <input {...register('local_guardian_occupation')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Guardian Address</label>
                  <input {...register('local_guardian_address')} disabled={isReadOnly} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
                </div>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex justify-end pt-4 border-t">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Extended Profile
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
