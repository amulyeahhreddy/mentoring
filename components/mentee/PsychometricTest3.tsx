'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'

// 13 items for Test 3
const TEST_3_ITEMS = Array.from({ length: 13 }, (_, i) => `Item ${20 + i}: Extended self-assessment behavior statement...`)

export default function PsychometricTest3({ studentId, initialData, userRole }: { studentId: string, initialData: any, userRole: string }) {
  const isMentor = userRole === 'mentor'
  const isReadOnly = isMentor && !initialData
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    const formData = new FormData(e.currentTarget)
    const mentor_comments = formData.get('mentor_comments') as string || ''
    
    const responses: Record<string, string> = {}
    TEST_3_ITEMS.forEach((_, i) => {
      const field = `item_${20 + i}`
      const val = formData.get(field)
      if (val) responses[field] = val as string
    })

    try {
      const res = await fetch(`/api/students/${studentId}/psychometric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_number: 3,
          es_item_responses: responses,
          mentor_comments: isMentor ? mentor_comments : initialData?.mentor_comments || ''
        })
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccess('Test 3 saved successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const existingResponses = initialData?.es_item_responses || {}

  return (
    <form onSubmit={onSubmit} className="bg-card p-6 rounded-xl border shadow-sm space-y-6">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      {success && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">{success}</div>}

      <div className="space-y-4 divide-y border-b pb-4">
        {TEST_3_ITEMS.map((item, i) => {
          const field = `item_${20 + i}`
          const currentVal = existingResponses[field]
          return (
            <div key={i} className="pt-4 space-y-2">
              <p className="text-sm font-medium">{item}</p>
              <div className="flex gap-6">
                {['Yes', 'No', 'Change Needed'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name={field} 
                      value={opt} 
                      disabled={isMentor && initialData}
                      defaultChecked={currentVal === opt}
                      className="h-4 w-4 text-primary" 
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {(isMentor || initialData?.mentor_comments) && (
        <div className="space-y-2 pt-4">
          <label className="font-medium text-primary flex items-center gap-2">
            Mentor Comments
            {!isMentor && <span className="text-xs font-normal text-muted-foreground border rounded px-1">Read Only</span>}
          </label>
          <textarea 
            name="mentor_comments"
            disabled={!isMentor}
            defaultValue={initialData?.mentor_comments || ''}
            placeholder="Review comments from mentor..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm shadow-sm"
          />
        </div>
      )}

      {(!isReadOnly) && (
        <div className="flex justify-end pt-4 border-t">
          <button 
            type="submit" 
            disabled={isLoading}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Test 3
          </button>
        </div>
      )}
    </form>
  )
}
