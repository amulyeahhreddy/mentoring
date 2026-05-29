-- Phase 2 Task 2.1: Create session_course_ratings table
-- This table normalizes course ratings from sessions.structured_input JSONB

CREATE TABLE IF NOT EXISTS session_course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  course_code TEXT,
  course_name TEXT,
  difficulty_scale INTEGER CHECK (difficulty_scale BETWEEN 1 AND 5),
  teacher_informed BOOLEAN,
  faculty_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE session_course_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Mentors can read/write course ratings for their assigned students
CREATE POLICY "mentor_course_ratings" ON session_course_ratings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN mentor_classes mc ON mc.mentor_id = auth.uid()
      JOIN enrollments e ON e.class_id = mc.class_id AND e.student_id = s.student_id
      WHERE s.id = session_course_ratings.session_id
    )
  );

-- Policy: Students can read their own course ratings
CREATE POLICY "student_read_course_ratings" ON session_course_ratings
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- Policy: Service role has full access
CREATE POLICY "service_role_all_course_ratings" ON session_course_ratings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
