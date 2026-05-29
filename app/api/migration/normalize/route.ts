import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin with service role bypass
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Extract course ratings from structured_input JSONB
 * Handles multiple patterns found in the codebase
 */
function extractCourseRatings(structuredInput: any, sessionId: string, studentId: string) {
  const ratings: any[] = [];

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
        });
      }
    }
  }

  // Pattern 2: structured_input.courses (object keyed by course_code)
  if (structuredInput?.courses && typeof structuredInput.courses === 'object') {
    for (const [courseCode, courseData] of Object.entries(structuredInput.courses)) {
      const data = courseData as any;
      if (data.rating || data.name) {
        ratings.push({
          session_id: sessionId,
          student_id: studentId,
          course_code: courseCode,
          course_name: data.name || courseCode,
          difficulty_scale: data.rating || null,
          teacher_informed: data.difficulty?.informedTeacher || false,
          faculty_response: data.difficulty?.facultyResponse || data.difficulty?.reason || null
        });
      }
    }
  }

  return ratings;
}

/**
 * Extract facility feedback from structured_input JSONB
 * Handles key variations (case-insensitive mapping)
 */
function extractFacilityFeedback(structuredInput: any, sessionId: string, studentId: string) {
  const feedback: any = {};
  const source = structuredInput?.student?.facility_feedback || structuredInput?.facility_feedback || {};

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
  };

  for (const [key, value] of Object.entries(source)) {
    const lowerKey = key.toLowerCase();
    const mappedKey = keyMap[lowerKey];
    
    if (mappedKey && value) {
      feedback[mappedKey] = value;
    }
  }

  // Only return if we have at least one feedback entry
  if (Object.keys(feedback).length === 0) {
    return null;
  }

  return {
    session_id: sessionId,
    student_id: studentId,
    ...feedback
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization Check (admin only, bypass in development)
    const isDev = process.env.NODE_ENV === 'development';
    let authorized = isDev;

    if (!authorized) {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Perform Migration
    const stats = {
      totalSessions: 0,
      processedSessions: 0,
      skippedSessions: 0,
      noDataSessions: 0,
      courseRatingsInserted: 0,
      facilityFeedbackInserted: 0,
      errors: [] as string[]
    };

    // Fetch all sessions with structured_input
    const { data: sessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, student_id, structured_input')
      .not('structured_input', 'is', null);

    if (fetchError) {
      return NextResponse.json({ error: `Failed to fetch sessions: ${fetchError.message}` }, { status: 500 });
    }

    stats.totalSessions = sessions?.length || 0;

    for (const session of sessions || []) {
      stats.processedSessions++;
      const sessionId = session.id;
      const studentId = session.student_id;
      const structuredInput = session.structured_input;

      if (!structuredInput || typeof structuredInput !== 'object') {
        stats.noDataSessions++;
        continue;
      }

      try {
        // Check if already migrated (idempotency check)
        const { data: existingCourseRatings } = await supabaseAdmin
          .from('session_course_ratings')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);

        const { data: existingFacilityFeedback } = await supabaseAdmin
          .from('session_facility_feedback')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);

        const hasExistingCourseRatings = existingCourseRatings && existingCourseRatings.length > 0;
        const hasExistingFacilityFeedback = existingFacilityFeedback && existingFacilityFeedback.length > 0;

        if (hasExistingCourseRatings && hasExistingFacilityFeedback) {
          stats.skippedSessions++;
          continue;
        }

        // Extract and insert course ratings
        const courseRatings = extractCourseRatings(structuredInput, sessionId, studentId);
        if (courseRatings.length > 0 && !hasExistingCourseRatings) {
          const { error: insertError } = await supabaseAdmin
            .from('session_course_ratings')
            .insert(courseRatings);

          if (insertError) {
            throw new Error(`Failed to insert course ratings: ${insertError.message}`);
          }
          stats.courseRatingsInserted += courseRatings.length;
        }

        // Extract and insert facility feedback
        const facilityFeedback = extractFacilityFeedback(structuredInput, sessionId, studentId);
        if (facilityFeedback && !hasExistingFacilityFeedback) {
          const { error: insertError } = await supabaseAdmin
            .from('session_facility_feedback')
            .insert(facilityFeedback);

          if (insertError) {
            throw new Error(`Failed to insert facility feedback: ${insertError.message}`);
          }
          stats.facilityFeedbackInserted++;
        }

        if (courseRatings.length === 0 && !facilityFeedback) {
          stats.noDataSessions++;
        }

      } catch (err: any) {
        console.error(`Error migrating session ${sessionId}:`, err.message);
        stats.errors.push(`Session ${sessionId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: stats.errors.length > 0 ? 'Migration completed with some errors' : 'Migration completed successfully'
    });

  } catch (error: any) {
    console.error('Migration endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check (admin only, bypass in development)
    const isDev = process.env.NODE_ENV === 'development';
    let authorized = isDev;

    if (!authorized) {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Perform Migration
    const stats = {
      totalSessions: 0,
      processedSessions: 0,
      skippedSessions: 0,
      noDataSessions: 0,
      courseRatingsInserted: 0,
      facilityFeedbackInserted: 0,
      errors: [] as string[]
    };

    // Fetch all sessions with structured_input
    const { data: sessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, student_id, structured_input')
      .not('structured_input', 'is', null);

    if (fetchError) {
      return NextResponse.json({ error: `Failed to fetch sessions: ${fetchError.message}` }, { status: 500 });
    }

    stats.totalSessions = sessions?.length || 0;

    for (const session of sessions || []) {
      stats.processedSessions++;
      const sessionId = session.id;
      const studentId = session.student_id;
      const structuredInput = session.structured_input;

      if (!structuredInput || typeof structuredInput !== 'object') {
        stats.noDataSessions++;
        continue;
      }

      try {
        // Check if already migrated (idempotency check)
        const { data: existingCourseRatings } = await supabaseAdmin
          .from('session_course_ratings')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);

        const { data: existingFacilityFeedback } = await supabaseAdmin
          .from('session_facility_feedback')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);

        const hasExistingCourseRatings = existingCourseRatings && existingCourseRatings.length > 0;
        const hasExistingFacilityFeedback = existingFacilityFeedback && existingFacilityFeedback.length > 0;

        if (hasExistingCourseRatings && hasExistingFacilityFeedback) {
          stats.skippedSessions++;
          continue;
        }

        // Extract and insert course ratings
        const courseRatings = extractCourseRatings(structuredInput, sessionId, studentId);
        if (courseRatings.length > 0 && !hasExistingCourseRatings) {
          const { error: insertError } = await supabaseAdmin
            .from('session_course_ratings')
            .insert(courseRatings);

          if (insertError) {
            throw new Error(`Failed to insert course ratings: ${insertError.message}`);
          }
          stats.courseRatingsInserted += courseRatings.length;
        }

        // Extract and insert facility feedback
        const facilityFeedback = extractFacilityFeedback(structuredInput, sessionId, studentId);
        if (facilityFeedback && !hasExistingFacilityFeedback) {
          const { error: insertError } = await supabaseAdmin
            .from('session_facility_feedback')
            .insert(facilityFeedback);

          if (insertError) {
            throw new Error(`Failed to insert facility feedback: ${insertError.message}`);
          }
          stats.facilityFeedbackInserted++;
        }

        if (courseRatings.length === 0 && !facilityFeedback) {
          stats.noDataSessions++;
        }

      } catch (err: any) {
        console.error(`Error migrating session ${sessionId}:`, err.message);
        stats.errors.push(`Session ${sessionId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: stats.errors.length > 0 ? 'Migration completed with some errors' : 'Migration completed successfully'
    });

  } catch (error: any) {
    console.error('Migration endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
