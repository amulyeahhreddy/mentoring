-- Phase 2 Task 2.2: Create session_facility_feedback table
-- This table normalizes facility feedback from sessions.structured_input JSONB

CREATE TABLE IF NOT EXISTS session_facility_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  canteen_remarks TEXT,
  transport_remarks TEXT,
  ragging_remarks TEXT,
  sanitation_remarks TEXT,
  library_remarks TEXT,
  lab_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE session_facility_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Mentors can read/write facility feedback for their assigned students
CREATE POLICY "mentor_facility_feedback" ON session_facility_feedback
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN mentor_classes mc ON mc.mentor_id = auth.uid()
      JOIN enrollments e ON e.class_id = mc.class_id AND e.student_id = s.student_id
      WHERE s.id = session_facility_feedback.session_id
    )
  );

-- Policy: Students can read their own facility feedback
CREATE POLICY "student_read_facility_feedback" ON session_facility_feedback
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- Policy: Service role has full access
CREATE POLICY "service_role_all_facility_feedback" ON session_facility_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);
