-- =============================================================================
-- PHASE 2 MIGRATION: DATA MODEL NORMALIZATION & IMMUTABLE AUDIT TRAIL
-- structured_input is deprecated for course_ratings and facility_feedback as of Phase 2. Do not add new data types here.
-- =============================================================================

-- Task 2.1 — Create session_course_ratings table
CREATE TABLE IF NOT EXISTS session_course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  course_code TEXT,
  course_name TEXT,
  difficulty_scale INTEGER,        -- 1=Very Easy | 2=Easy | 3=Moderate | 4=Difficult | 5=Very Difficult
  teacher_informed BOOLEAN,
  faculty_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deprecation comment on sessions.structured_input
COMMENT ON COLUMN sessions.structured_input IS 'deprecated for course_ratings and facility_feedback as of Phase 2. Do not add new data types here.';

ALTER TABLE session_course_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_course_ratings" ON session_course_ratings;
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

DROP POLICY IF EXISTS "student_read_course_ratings" ON session_course_ratings;
CREATE POLICY "student_read_course_ratings" ON session_course_ratings
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "service_role_all_course_ratings" ON session_course_ratings;
CREATE POLICY "service_role_all_course_ratings" ON session_course_ratings
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- Task 2.2 — Create session_facility_feedback table
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

ALTER TABLE session_facility_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_facility_feedback" ON session_facility_feedback;
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

DROP POLICY IF EXISTS "student_read_facility_feedback" ON session_facility_feedback;
CREATE POLICY "student_read_facility_feedback" ON session_facility_feedback
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "service_role_all_facility_feedback" ON session_facility_feedback;
CREATE POLICY "service_role_all_facility_feedback" ON session_facility_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- Task 2.5 — Create audit_events table (append-only, immutable)
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time TIMESTAMPTZ DEFAULT now() NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT,                          -- 'admin' | 'mentor' | 'mentee'
  action TEXT NOT NULL,                     -- 'INSERT' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'SIGN' | 'EXPORT'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,                         -- null for inserts
  new_values JSONB,                         -- null for deletes
  ip_address TEXT,
  user_agent TEXT,
  session_context TEXT                      -- e.g. 'session_id:xyz'
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Only INSERT allowed. No UPDATE, no DELETE — ever.
DROP POLICY IF EXISTS "audit_insert_only" ON audit_events;
CREATE POLICY "audit_insert_only" ON audit_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admins can SELECT to view the audit log
DROP POLICY IF EXISTS "admin_read_audit" ON audit_events;
CREATE POLICY "admin_read_audit" ON audit_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "service_role_audit" ON audit_events;
CREATE POLICY "service_role_audit" ON audit_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- Task 2.6 — Implement log_audit_event() Postgres trigger function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_events (
    actor_id,
    actor_role,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  )
  VALUES (
    auth.uid(),
    (SELECT role FROM profiles WHERE id = auth.uid()),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Apply trigger to these tables
DROP TRIGGER IF EXISTS audit_sessions ON sessions;
CREATE TRIGGER audit_sessions
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_mentor_assignments ON mentor_assignments;
CREATE TRIGGER audit_mentor_assignments
  AFTER INSERT OR UPDATE OR DELETE ON mentor_assignments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_portfolio_ratings ON portfolio_ratings;
CREATE TRIGGER audit_portfolio_ratings
  AFTER INSERT OR UPDATE OR DELETE ON portfolio_ratings
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_fortnightly_attendance ON fortnightly_attendance;
CREATE TRIGGER audit_fortnightly_attendance
  AFTER INSERT OR UPDATE OR DELETE ON fortnightly_attendance
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_career_counselling ON career_counselling;
CREATE TRIGGER audit_career_counselling
  AFTER INSERT OR UPDATE OR DELETE ON career_counselling
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
