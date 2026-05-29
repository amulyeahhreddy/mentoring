/**
 * Phase 2 Migration Script
 * 
 * This script migrates course ratings and facility feedback from sessions.structured_input JSONB
 * to the new normalized tables: session_course_ratings and session_facility_feedback
 * 
 * Features:
 * - Idempotent: Safe to run multiple times
 * - Handles multiple JSONB key patterns
 * - Preserves structured_input as backup (does not modify or delete)
 * - Logs detailed progress
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Statistics
let stats = {
  totalSessions: 0,
  processedSessions: 0,
  skippedSessions: 0,
  noDataSessions: 0,
  courseRatingsInserted: 0,
  facilityFeedbackInserted: 0,
  errors: [] as string[]
}

/**
 * Extract course ratings from structured_input JSONB
 * Handles multiple patterns found in the codebase
 */
function extractCourseRatings(structuredInput: any, sessionId: string, studentId: string) {
  const ratings: any[] = []

  // Pattern 1: structured_input.student.course_ratings (array)
  if (structuredInput?.student?.course_ratings && Array.isArray(structuredInput.student.course_ratings)) {
    for (const cr of structuredInput.student.course_ratings) {
      if (cr.name) {
        ratings.push({
          session_id: sessionId,
          student_id: studentId,
          course_code: cr.course_code || null,
          course_name: cr.name,
          difficulty_scale: cr.rating || null,
          teacher_informed: cr.informed_teacher || false,
          faculty_response: cr.faculty_action || cr.reason || null
        })
      }
    }
  }

  // Pattern 2: structured_input.courses (object keyed by course_code)
  if (structuredInput?.courses && typeof structuredInput.courses === 'object') {
    for (const [courseCode, courseData] of Object.entries(structuredInput.courses)) {
      const data = courseData as any
      if (data.rating || data.name) {
        ratings.push({
          session_id: sessionId,
          student_id: studentId,
          course_code: courseCode,
          course_name: data.name || courseCode,
          difficulty_scale: data.rating || null,
          teacher_informed: data.difficulty?.informedTeacher || false,
          faculty_response: data.difficulty?.facultyResponse || data.difficulty?.reason || null
        })
      }
    }
  }

  return ratings
}

/**
 * Extract facility feedback from structured_input JSONB
 * Handles key variations (case-insensitive mapping)
 */
function extractFacilityFeedback(structuredInput: any, sessionId: string, studentId: string) {
  const feedback: any = {}
  const source = structuredInput?.student?.facility_feedback || structuredInput?.facility_feedback || {}

  // Key mapping (case-insensitive)
  const keyMap: Record<string, string> = {
    'canteen': 'canteen_remarks',
    'transport': 'transport_remarks',
    'college transport': 'transport_remarks',
    'ragging': 'ragging_remarks',
    'sanitation': 'sanitation_remarks',
    'library': 'library_remarks',
    'laboratories': 'lab_remarks',
    'labs': 'lab_remarks'
  }

  for (const [key, value] of Object.entries(source)) {
    const lowerKey = key.toLowerCase()
    const mappedKey = keyMap[lowerKey]
    
    if (mappedKey && value) {
      feedback[mappedKey] = value
    }
  }

  // Only return if we have at least one feedback entry
  if (Object.keys(feedback).length === 0) {
    return null
  }

  return {
    session_id: sessionId,
    student_id: studentId,
    ...feedback
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('Starting Phase 2 Migration...')
  console.log('=====================================\n')

  try {
    // Fetch all sessions with structured_input
    const { data: sessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id, student_id, structured_input')
      .not('structured_input', 'is', null)

    if (fetchError) {
      throw new Error(`Failed to fetch sessions: ${fetchError.message}`)
    }

    stats.totalSessions = sessions?.length || 0
    console.log(`Found ${stats.totalSessions} sessions with structured_input\n`)

    // Process each session
    for (const session of sessions || []) {
      stats.processedSessions++

      try {
        const sessionId = session.id
        const studentId = session.student_id
        const structuredInput = session.structured_input

        if (!structuredInput || typeof structuredInput !== 'object') {
          stats.noDataSessions++
          continue
        }

        // Check if already migrated (idempotency check)
        const { data: existingCourseRatings } = await supabase
          .from('session_course_ratings')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1)

        const { data: existingFacilityFeedback } = await supabase
          .from('session_facility_feedback')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1)

        if (existingCourseRatings && existingCourseRatings.length > 0 &&
            existingFacilityFeedback && existingFacilityFeedback.length > 0) {
          stats.skippedSessions++
          console.log(`Session ${sessionId}: Already migrated (skipped)`)
          continue
        }

        // Extract and insert course ratings
        const courseRatings = extractCourseRatings(structuredInput, sessionId, studentId)
        if (courseRatings.length > 0 && (!existingCourseRatings || existingCourseRatings.length === 0)) {
          const { error: insertError } = await supabase
            .from('session_course_ratings')
            .insert(courseRatings)

          if (insertError) {
            throw new Error(`Failed to insert course ratings: ${insertError.message}`)
          }
          stats.courseRatingsInserted += courseRatings.length
          console.log(`Session ${sessionId}: Inserted ${courseRatings.length} course rating(s)`)
        }

        // Extract and insert facility feedback
        const facilityFeedback = extractFacilityFeedback(structuredInput, sessionId, studentId)
        if (facilityFeedback && (!existingFacilityFeedback || existingFacilityFeedback.length === 0)) {
          const { error: insertError } = await supabase
            .from('session_facility_feedback')
            .insert(facilityFeedback)

          if (insertError) {
            throw new Error(`Failed to insert facility feedback: ${insertError.message}`)
          }
          stats.facilityFeedbackInserted++
          console.log(`Session ${sessionId}: Inserted facility feedback`)
        }

        if (courseRatings.length === 0 && !facilityFeedback) {
          stats.noDataSessions++
          console.log(`Session ${sessionId}: No course ratings or facility feedback found`)
        }

      } catch (error: any) {
        stats.errors.push(`Session ${session.id}: ${error.message}`)
        console.error(`Error processing session ${session.id}:`, error.message)
      }
    }

    // Print summary
    console.log('\n=====================================')
    console.log('Migration Summary')
    console.log('=====================================')
    console.log(`Total sessions with structured_input: ${stats.totalSessions}`)
    console.log(`Processed sessions: ${stats.processedSessions}`)
    console.log(`Skipped (already migrated): ${stats.skippedSessions}`)
    console.log(`No data found: ${stats.noDataSessions}`)
    console.log(`Course ratings inserted: ${stats.courseRatingsInserted}`)
    console.log(`Facility feedback inserted: ${stats.facilityFeedbackInserted}`)
    
    if (stats.errors.length > 0) {
      console.log(`\nErrors (${stats.errors.length}):`)
      stats.errors.forEach(err => console.log(`  - ${err}`))
    }

    console.log('\nMigration completed successfully!')

  } catch (error: any) {
    console.error('\nMigration failed:', error.message)
    process.exit(1)
  }
}

// Run migration
migrate()
