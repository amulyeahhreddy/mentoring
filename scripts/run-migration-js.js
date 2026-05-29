const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');

const env = {};
envLocalContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^=#\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Extract course ratings from structured_input JSONB
 */
function extractCourseRatings(structuredInput, sessionId, studentId) {
  const ratings = [];

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
      const data = courseData;
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
 */
function extractFacilityFeedback(structuredInput, sessionId, studentId) {
  const feedback = {};
  const source = structuredInput?.student?.facility_feedback || structuredInput?.facility_feedback || {};

  const keyMap = {
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

  if (Object.keys(feedback).length === 0) {
    return null;
  }

  return {
    session_id: sessionId,
    student_id: studentId,
    ...feedback
  };
}

async function migrate() {
  console.log('Starting Phase 2 Normalization Migration via JS Runner...');
  console.log('========================================================\n');

  try {
    // 1. Fetch sessions
    const { data: sessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id, student_id, structured_input')
      .not('structured_input', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch sessions: ${fetchError.message}`);
    }

    const stats = {
      total: sessions?.length || 0,
      processed: 0,
      skipped: 0,
      noData: 0,
      courseRatingsInserted: 0,
      facilityFeedbackInserted: 0,
      errors: []
    };

    console.log(`Found ${stats.total} sessions with structured_input.\n`);

    // 2. Process each session
    for (const session of sessions || []) {
      stats.processed++;
      const sessionId = session.id;
      const studentId = session.student_id;
      const structuredInput = session.structured_input;

      if (!structuredInput || typeof structuredInput !== 'object') {
        stats.noData++;
        continue;
      }

      try {
        // Check if already migrated
        const { data: existingCourseRatings } = await supabase
          .from('session_course_ratings')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);

        const { data: existingFacilityFeedback } = await supabase
          .from('session_facility_feedback')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);

        const hasExistingCourseRatings = existingCourseRatings && existingCourseRatings.length > 0;
        const hasExistingFacilityFeedback = existingFacilityFeedback && existingFacilityFeedback.length > 0;

        if (hasExistingCourseRatings && hasExistingFacilityFeedback) {
          stats.skipped++;
          continue;
        }

        // Extract course ratings
        const courseRatings = extractCourseRatings(structuredInput, sessionId, studentId);
        if (courseRatings.length > 0 && !hasExistingCourseRatings) {
          const { error: insertError } = await supabase
            .from('session_course_ratings')
            .insert(courseRatings);

          if (insertError) {
            throw new Error(`Failed to insert course ratings: ${insertError.message}`);
          }
          stats.courseRatingsInserted += courseRatings.length;
          console.log(`Session ${sessionId}: Inserted ${courseRatings.length} course ratings.`);
        }

        // Extract facility feedback
        const facilityFeedback = extractFacilityFeedback(structuredInput, sessionId, studentId);
        if (facilityFeedback && !hasExistingFacilityFeedback) {
          const { error: insertError } = await supabase
            .from('session_facility_feedback')
            .insert(facilityFeedback);

          if (insertError) {
            throw new Error(`Failed to insert facility feedback: ${insertError.message}`);
          }
          stats.facilityFeedbackInserted++;
          console.log(`Session ${sessionId}: Inserted facility feedback.`);
        }

        if (courseRatings.length === 0 && !facilityFeedback) {
          stats.noData++;
        }

      } catch (err) {
        console.error(`❌ Session ${sessionId}: Error - ${err.message}`);
        stats.errors.push(`Session ${sessionId}: ${err.message}`);
      }
    }

    console.log('\n========================================================');
    console.log('Migration Completed Summary:');
    console.log(`Total checked: ${stats.total}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Skipped (already normalized): ${stats.skipped}`);
    console.log(`No course/facility data: ${stats.noData}`);
    console.log(`New Course Ratings inserted: ${stats.courseRatingsInserted}`);
    console.log(`New Facility Feedback inserted: ${stats.facilityFeedbackInserted}`);
    console.log(`Errors: ${stats.errors.length}`);
    if (stats.errors.length > 0) {
      console.log('Error details:');
      stats.errors.forEach(e => console.log('  -', e));
    }
    console.log('========================================================');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
