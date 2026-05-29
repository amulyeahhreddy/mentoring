'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react'

interface PreCollegeActivity {
  id: string
  student_id: string
  activity_type: string
  name: string
  level: string
  achievement: string
  year: string
  created_at: string
}

export default function PreCollegeActivities({ studentId }: { studentId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activities, setActivities] = useState<PreCollegeActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    activity_type: '',
    name: '',
    level: '',
    achievement: '',
    year: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchActivities = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/pre-college`)
      if (!res.ok) throw new Error('Failed to fetch activities')
      const data = await res.json()
      setActivities(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchActivities()
    }
  }, [isOpen, studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    
    try {
      const res = await fetch(`/api/students/${studentId}/pre-college`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!res.ok) throw new Error('Failed to add activity')
      
      setFormData({ activity_type: '', name: '', level: '', achievement: '', year: '' })
      fetchActivities()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return
    
    try {
      const res = await fetch(`/api/students/${studentId}/pre-college`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activityId })
      })
      
      if (!res.ok) throw new Error('Failed to delete activity')
      fetchActivities()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <section className="border rounded-xl bg-card shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="text-lg font-bold">Pre-College Activities</h2>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {/* Add Activity Form */}
          <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold text-sm">Add New Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Activity Type"
                value={formData.activity_type}
                onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                className="px-3 py-2 rounded-md border text-sm"
                required
              />
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 rounded-md border text-sm"
                required
              />
              <input
                type="text"
                placeholder="Level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="px-3 py-2 rounded-md border text-sm"
                required
              />
              <input
                type="text"
                placeholder="Achievement"
                value={formData.achievement}
                onChange={(e) => setFormData({ ...formData, achievement: e.target.value })}
                className="px-3 py-2 rounded-md border text-sm"
                required
              />
              <input
                type="text"
                placeholder="Year"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="px-3 py-2 rounded-md border text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Adding...' : 'Add Activity'}
            </button>
          </form>

          {/* Activities List */}
          {loading ? (
            <div className="text-center text-muted-foreground text-sm py-4">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">No activities recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-3 bg-muted/30 rounded-lg gap-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{activity.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {activity.activity_type}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Level: {activity.level}</p>
                      <p>Achievement: {activity.achievement}</p>
                      <p>Year: {activity.year}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(activity.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete activity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
