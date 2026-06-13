'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, Save } from 'lucide-react'

const DIMENSIONS = [
  "Engineering Knowledge",
  "Problem Analysis",
  "Design/Development",
  "Complex Investigations",
  "Tool Usage",
  "Engineer & World",
  "Ethics",
  "Teamwork",
  "Communication",
  "Project Management",
  "Lifelong Learning"
]

const DIMENSION_COLUMN_MAP: Record<string, string> = {
  "Engineering Knowledge": "ld_engineering_knowledge",
  "Problem Analysis": "ld_problem_analysis",
  "Design/Development": "ld_design_development",
  "Complex Investigations": "ld_complex_investigations",
  "Tool Usage": "ld_tool_usage",
  "Engineer & World": "ld_engineer_and_world",
  "Ethics": "ld_ethics",
  "Teamwork": "ld_teamwork",
  "Communication": "ld_communication",
  "Project Management": "ld_project_management",
  "Lifelong Learning": "ld_lifelong_learning"
}

export default function PsychometricTest1({ studentId, initialData, userRole }: { studentId: string, initialData: any, userRole: string }) {
  const isMentor = userRole === 'mentor'
  const isReadOnly = !isMentor
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultResponses = initialData?.mentor_comments ? {} : {} // Will rely on uncontrolled inputs or default values

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isReadOnly) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    const formData = new FormData(e.currentTarget)
    const mentor_comments = formData.get('mentor_comments') as string
    
    const responses: Record<string, string> = {}
    const flatFields: Record<string, string> = {}
    DIMENSIONS.forEach(dim => {
      const val = formData.get(dim)
      if (val) {
        responses[dim] = val as string
        const col = DIMENSION_COLUMN_MAP[dim]
        if (col) {
          flatFields[col] = val as string
        }
      }
    })

    try {
      const res = await fetch(`/api/students/${studentId}/psychometric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_number: 1,
          ps_item_responses: responses,
          mentor_comments,
          ...flatFields
        })
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccess('Test 1 saved successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const existingResponses = initialData?.ps_item_responses || {}

  return (
    <form onSubmit={onSubmit} className="bg-card p-6 rounded-xl border shadow-sm space-y-6">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      {success && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">{success}</div>}

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-4 gap-2 text-sm font-semibold text-muted-foreground pb-2 border-b">
            <div>Leadership Dimension</div>
            <div className="text-center">Outstanding</div>
            <div className="text-center">Satisfactory</div>
            <div className="text-center">Needs Improvement</div>
          </div>
          
          <div className="divide-y">
            {DIMENSIONS.map(dim => {
              const currentVal = existingResponses[dim]
              return (
                <div key={dim} className="grid grid-cols-4 gap-2 py-3 items-center text-sm hover:bg-muted/30">
                  <div className="font-medium">{dim}</div>
                  {['Outstanding', 'Satisfactory', 'Needs Improvement'].map(opt => (
                    <label key={opt} className="flex justify-center cursor-pointer">
                      <input 
                        type="radio" 
                        name={dim} 
                        value={opt} 
                        disabled={isReadOnly}
                        defaultChecked={currentVal === opt}
                        className="h-4 w-4 text-primary cursor-pointer disabled:cursor-default" 
                      />
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <label className="font-medium">Mentor Comments</label>
        <textarea 
          name="mentor_comments"
          disabled={isReadOnly}
          defaultValue={initialData?.mentor_comments || ''}
          placeholder="Overall assessment notes..."
          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>

      {!isReadOnly && (
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isLoading}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Test 1
          </button>
        </div>
      )}
    </form>
  )
}
