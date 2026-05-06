"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import FullMentorDashboard from '@/components/FullMentorDashboard'

interface Class {
  id: string
  name: string
  class_code: string
  created_at: string
  students: EnrollmentWithProfile[]
}

interface EnrollmentWithProfile {
  student_id: string
  profiles?: {
    id: string
    email: string
    role: string
  }
}

export default function MentorPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [createdClassCode, setCreatedClassCode] = useState('')
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [mentorId, setMentorId] = useState<string | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])

  const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const fetchClasses = async () => {
    try {
      setIsLoadingClasses(true)
      setFetchError(null)
      
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        setFetchError('User not authenticated')
        return
      }

      // Set mentorId for the UI component
      setMentorId(userData.user.id)

      // Step A: Fetch classes with enrollments only
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          class_code,
          created_at,
          enrollments (id, student_id)
        `)
        .eq('mentor_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (classesError) {
        console.error('Fetch error:', JSON.stringify(classesError, null, 2))
        setFetchError('Error fetching classes: ' + classesError.message)
        return
      }

      // Step B: Extract all student_ids
      const studentIds = classesData
        ?.flatMap(c => c.enrollments || [])
        .map(e => e.student_id) || []

      // Step C: Fetch profiles separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, role')
        .in('id', studentIds)

      // Debug logs before merging
      console.log("ENROLLMENTS:", classesData)
      console.log("PROFILES:", profiles)

      // Step D: Merge data with detailed debug logging
      const transformedClasses = classesData?.map(classItem => ({
        ...classItem,
        students: (classItem.enrollments || []).map(enrollment => {
          const matchedProfile = profiles?.find(
            p => String(p.id) === String(enrollment.student_id)
          )

          console.log("MATCH CHECK:", {
            enrollment_id: enrollment.student_id,
            profile_ids: profiles?.map(p => p.id),
            matched: matchedProfile
          })

          return {
            student_id: enrollment.student_id,
            profiles: matchedProfile
          }
        })
      })) || []

      console.log("FINAL STUDENTS:", transformedClasses)

      setClasses(transformedClasses)
      
      // Transform classes data to users format for FullMentorDashboard
      const transformedUsers = transformedClasses.flatMap(classItem =>
        classItem.students.map(student => ({
          id: student.student_id,
          name: student.profiles?.email || "Unknown"
        }))
      )
      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error in fetchClasses:', error)
      setFetchError('An unexpected error occurred while fetching classes')
    } finally {
      setIsLoadingClasses(false)
    }
  }

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!className.trim()) return

    setLoading(true)
    setMessage('')

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setMessage('User not authenticated')
        return
      }

      const classCode = generateClassCode()

      const { error } = await supabase
        .from('classes')
        .insert({
          name: className.trim(),
          mentor_id: userData.user.id,
          class_code: classCode
        })

      if (error) {
        setMessage('Error creating class: ' + error.message)
      } else {
        setMessage('Class created successfully!')
        setCreatedClassCode(classCode)
        setClassName('')
        fetchClasses()
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Class Creation Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Class</h2>
          <form onSubmit={createClass} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Class name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Class'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}

          {createdClassCode && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-gray-600 mb-2">Class Code:</p>
              <p className="text-2xl font-bold text-blue-600">{createdClassCode}</p>
              <p className="text-xs text-gray-500 mt-2">Share this code with students to join your class</p>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard UI */}
      {fetchError ? (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{fetchError}</p>
          </div>
        </div>
      ) : isLoadingClasses ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading classes...</span>
        </div>
      ) : mentorId ? (
        <FullMentorDashboard users={users} />
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading mentor information...</p>
        </div>
      )}
    </div>
  )
}
