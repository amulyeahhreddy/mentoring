-- Phase 2.5 Migration SQL
-- Run this in the SQL Editor on your Supabase Dashboard to update the schema and trigger.

-- 1. Tasks table RLS policies
DROP POLICY IF EXISTS "mentor_tasks_crud" ON tasks;
CREATE POLICY "mentor_tasks_crud" ON tasks
  FOR ALL TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

DROP POLICY IF EXISTS "student_tasks_read" ON tasks;
CREATE POLICY "student_tasks_read" ON tasks
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "student_tasks_complete" ON tasks;
CREATE POLICY "student_tasks_complete" ON tasks
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (status = 'completed');

DROP POLICY IF EXISTS "service_role_tasks" ON tasks;
CREATE POLICY "service_role_tasks" ON tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Profiles table missing columns (idempotent ADD COLUMN IF NOT EXISTS)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS blood_group      TEXT,
  ADD COLUMN IF NOT EXISTS mobile_number    TEXT,
  ADD COLUMN IF NOT EXISTS personal_email   TEXT,
  ADD COLUMN IF NOT EXISTS father_name      TEXT,
  ADD COLUMN IF NOT EXISTS father_contact_no TEXT,
  ADD COLUMN IF NOT EXISTS mother_name      TEXT,
  ADD COLUMN IF NOT EXISTS mother_contact_no TEXT;

-- 3. Sessions table missing attendance_above_90 column
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS attendance_above_90 BOOLEAN;

-- 4. Psychometric test table updates
ALTER TABLE psychometric_test
  ADD COLUMN IF NOT EXISTS session_id         UUID REFERENCES sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS administered_at    DATE,
  ADD COLUMN IF NOT EXISTS ld_engineering_knowledge  TEXT,
  ADD COLUMN IF NOT EXISTS ld_problem_analysis       TEXT,
  ADD COLUMN IF NOT EXISTS ld_design_development     TEXT,
  ADD COLUMN IF NOT EXISTS ld_complex_investigations TEXT,
  ADD COLUMN IF NOT EXISTS ld_tool_usage             TEXT,
  ADD COLUMN IF NOT EXISTS ld_engineer_and_world     TEXT,
  ADD COLUMN IF NOT EXISTS ld_ethics                 TEXT,
  ADD COLUMN IF NOT EXISTS ld_teamwork               TEXT,
  ADD COLUMN IF NOT EXISTS ld_communication          TEXT,
  ADD COLUMN IF NOT EXISTS ld_project_management     TEXT,
  ADD COLUMN IF NOT EXISTS ld_lifelong_learning      TEXT;

-- 5. Backfill existing Test 1 data
UPDATE psychometric_test
SET
  ld_engineering_knowledge = ps_item_responses->>'Engineering Knowledge',
  ld_problem_analysis      = ps_item_responses->>'Problem Analysis',
  ld_design_development    = ps_item_responses->>'Design/Development',
  ld_complex_investigations = ps_item_responses->>'Complex Investigations',
  ld_tool_usage            = ps_item_responses->>'Tool Usage',
  ld_engineer_and_world    = ps_item_responses->>'Engineer & World',
  ld_ethics                = ps_item_responses->>'Ethics',
  ld_teamwork              = ps_item_responses->>'Teamwork',
  ld_communication         = ps_item_responses->>'Communication',
  ld_project_management    = ps_item_responses->>'Project Management',
  ld_lifelong_learning     = ps_item_responses->>'Lifelong Learning'
WHERE test_number = 1;

-- 6. Mentor assignments table updates
ALTER TABLE mentor_assignments
  ADD COLUMN IF NOT EXISTS year_label    TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS designation   TEXT,
  ADD COLUMN IF NOT EXISTS department    TEXT;

-- 7. Onboarding synchronization trigger
CREATE OR REPLACE FUNCTION sync_onboarding_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  d JSONB := NEW.data;
BEGIN
  UPDATE profiles SET
    father_occupation         = COALESCE(d->'family'->'father'->>'occupation', d->'family'->>'father_occupation', d->>'father_occupation', d->>'fatherOccupation'),
    father_education          = COALESCE(d->'family'->'father'->>'education', d->'family'->>'father_education', d->>'father_education', d->>'fatherEducation'),
    father_address            = COALESCE(d->'family'->'father'->>'address', d->'family'->>'father_address', d->>'father_address', d->>'fatherAddress'),
    mother_occupation         = COALESCE(d->'family'->'mother'->>'occupation', d->'family'->>'mother_occupation', d->>'mother_occupation', d->>'motherOccupation'),
    mother_education          = COALESCE(d->'family'->'mother'->>'education', d->'family'->>'mother_education', d->>'mother_education', d->>'motherEducation'),
    local_guardian_name       = COALESCE(d->'family'->'local_guardian'->>'name', d->'family'->>'local_guardian_name', d->>'local_guardian_name', d->>'guardianName'),
    local_guardian_phone      = COALESCE(d->'family'->'local_guardian'->>'contact', d->'family'->'local_guardian'->>'phone', d->'family'->>'local_guardian_phone', d->>'local_guardian_phone', d->>'guardianPhone'),
    local_guardian_address    = COALESCE(d->'family'->'local_guardian'->>'address', d->'family'->>'local_guardian_address', d->>'local_guardian_address', d->>'guardianAddress'),
    local_guardian_occupation = COALESCE(d->'family'->'local_guardian'->>'occupation', d->'family'->>'local_guardian_occupation', d->>'local_guardian_occupation', d->>'guardianOccupation'),
    parent_email              = COALESCE(d->'identity'->>'parent_email', d->>'parent_email', d->>'parentEmail'),
    residential_address       = COALESCE(d->'identity'->>'residential_address', d->>'residential_address', d->>'residentialAddress'),
    eamcet_rank               = COALESCE((d->'admission'->>'rank')::INTEGER, (d->>'eamcet_rank')::INTEGER, (d->>'eamcetRank')::INTEGER),
    admission_quota           = COALESCE(d->'admission'->>'quota', d->>'admission_quota', d->>'admissionQuota'),
    admission_category        = COALESCE(d->'admission'->>'category', d->>'admission_category', d->>'admissionCategory'),
    id_mark_1                 = COALESCE(d->'identity'->>'identification_mark_1', d->>'id_mark_1', d->>'idMark1'),
    id_mark_2                 = COALESCE(d->'identity'->>'identification_mark_2', d->>'id_mark_2', d->>'idMark2'),
    blood_group               = COALESCE(d->'identity'->>'blood_group', d->>'blood_group', d->>'bloodGroup'),
    mobile_number             = COALESCE(d->'identity'->>'mobile', d->'identity'->>'mobile_number', d->>'mobile_number', d->>'mobileNumber'),
    father_name               = COALESCE(d->'family'->'father'->>'name', d->'family'->>'father_name', d->>'father_name', d->>'fatherName'),
    father_contact_no         = COALESCE(d->'family'->'father'->>'contact', d->'family'->'father'->>'contact_no', d->'family'->>'father_contact_no', d->>'father_contact_no', d->>'fatherContact'),
    mother_name               = COALESCE(d->'family'->'mother'->>'name', d->'family'->>'mother_name', d->>'mother_name', d->>'motherName'),
    mother_contact_no         = COALESCE(d->'family'->'mother'->>'contact', d->'family'->'mother'->>'contact_no', d->'family'->>'mother_contact_no', d->>'mother_contact_no', d->>'motherContact')
  WHERE id = NEW.student_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_onboarding_profile ON student_profiles;
CREATE TRIGGER sync_onboarding_profile
  AFTER INSERT OR UPDATE ON student_profiles
  FOR EACH ROW
  WHEN (NEW.data IS DISTINCT FROM OLD.data OR OLD.data IS NULL)
  EXECUTE FUNCTION sync_onboarding_to_profile();
