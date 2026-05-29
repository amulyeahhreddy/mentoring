-- Applied directly to Supabase on 2026-05-21. This file is for version control only.
-- Do not re-run against the live database.

-- =============================================================================
-- PROFILES: 17 extended student columns
-- =============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS roll_number_formatted TEXT,
  ADD COLUMN IF NOT EXISTS eamcet_rank INTEGER,
  ADD COLUMN IF NOT EXISTS admission_quota TEXT CHECK (admission_quota IN ('Convenor', 'Management', 'NRI')),
  ADD COLUMN IF NOT EXISTS admission_category TEXT,
  ADD COLUMN IF NOT EXISTS id_mark_1 TEXT,
  ADD COLUMN IF NOT EXISTS id_mark_2 TEXT,
  ADD COLUMN IF NOT EXISTS father_occupation TEXT,
  ADD COLUMN IF NOT EXISTS father_education TEXT,
  ADD COLUMN IF NOT EXISTS father_address TEXT,
  ADD COLUMN IF NOT EXISTS mother_occupation TEXT,
  ADD COLUMN IF NOT EXISTS mother_education TEXT,
  ADD COLUMN IF NOT EXISTS local_guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS local_guardian_occupation TEXT,
  ADD COLUMN IF NOT EXISTS local_guardian_address TEXT,
  ADD COLUMN IF NOT EXISTS local_guardian_phone TEXT,
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS residential_address TEXT;

-- =============================================================================
-- SESSIONS: topics, discipline, approval workflow
-- =============================================================================
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS topics_addressed JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS indisciplinary_activity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS indisciplinary_details TEXT,
  ADD COLUMN IF NOT EXISTS student_acknowledged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS student_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mentor_signed_off BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentor_signed_off_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS coordinator_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coordinator_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coordinator_notes TEXT;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'draft';

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS valid_session_status;
ALTER TABLE sessions
  ADD CONSTRAINT valid_session_status CHECK (
    session_status IN ('draft', 'mentor_review', 'student_acknowledged', 'coordinator_approved', 'completed')
  );

-- =============================================================================
-- EXTRACURRICULAR_LOG (Phase 1 nullable columns)
-- =============================================================================
ALTER TABLE extracurricular_log
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id),
  ADD COLUMN IF NOT EXISTS skill_area TEXT,
  ADD COLUMN IF NOT EXISTS organized_or_participated TEXT;

-- =============================================================================
-- PRE-ADMISSION ACADEMIC RECORDS
-- =============================================================================
CREATE TABLE IF NOT EXISTS pre_admission_academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('10th', '12th_MPC', '12th_BiPC', 'Diploma')),
  board TEXT NOT NULL,
  subjects TEXT NOT NULL,
  year_of_passing INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  grade TEXT NOT NULL,
  medium TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, level)
);

ALTER TABLE pre_admission_academic_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_pre_admission" ON pre_admission_academic_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- PRE-COLLEGE ACTIVITIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS pre_college_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  activity_type TEXT,
  description TEXT,
  organized_or_participated TEXT,
  award TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pre_college_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_pre_college" ON pre_college_activities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INITIAL QUESTIONNAIRE
-- =============================================================================
CREATE TABLE IF NOT EXISTS initial_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_year TEXT,
  area_of_stay TEXT,
  transport_mode TEXT,
  transport_inconvenience BOOLEAN DEFAULT false,
  transport_inconvenience_details TEXT,
  hobbies TEXT,
  health_issues TEXT,
  home_study_environment_ok BOOLEAN DEFAULT true,
  home_study_environment_notes TEXT,
  study_issues TEXT,
  academic_regulation_aware BOOLEAN DEFAULT false,
  parent_informed_autonomous BOOLEAN DEFAULT false,
  engineering_determination BOOLEAN DEFAULT true,
  engineering_determination_reason TEXT,
  ragging_experienced BOOLEAN DEFAULT false,
  ragging_details TEXT,
  ragging_suggestions TEXT,
  interested_in_sports BOOLEAN DEFAULT false,
  sports_details TEXT,
  interested_in_organising_activities BOOLEAN DEFAULT false,
  organising_details TEXT,
  club_interests JSONB DEFAULT '[]',
  professional_body_interests JSONB DEFAULT '[]',
  professional_body_membership_timeline TEXT,
  soft_skills_centre_aware BOOLEAN DEFAULT false,
  strengths_text TEXT,
  weaknesses_text TEXT,
  skill_problem_solving TEXT,
  skill_communication TEXT,
  skill_mathematics TEXT,
  skill_inquisitiveness TEXT,
  skill_learning TEXT,
  skill_innovation TEXT,
  improvement_efforts TEXT,
  institution_expectation TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE initial_questionnaire ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_initial_questionnaire" ON initial_questionnaire
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- GOALS DECLARATION
-- =============================================================================
CREATE TABLE IF NOT EXISTS goals_declaration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL DEFAULT '2025-26',
  academic_goal TEXT,
  academic_activities TEXT,
  academic_success_criteria TEXT,
  personal_goal TEXT,
  personal_activities TEXT,
  personal_success_criteria TEXT,
  talent_1 TEXT,
  talent_2 TEXT,
  prized_possession TEXT,
  college_year_goal_1 TEXT,
  college_year_goal_2 TEXT,
  proud_of TEXT,
  mentee_signed BOOLEAN DEFAULT false,
  mentee_signed_at TIMESTAMPTZ,
  review_notes TEXT,
  review_year INTEGER,
  reviewed_by UUID REFERENCES profiles(id),
  mentor_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE goals_declaration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_goals_declaration" ON goals_declaration
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mentors_update_goals_review" ON goals_declaration
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('mentor', 'admin')
    )
  );

-- =============================================================================
-- SESSION IMPACT ASSESSMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS session_impact_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  skills JSONB DEFAULT '{}',
  transformation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, session_id)
);

ALTER TABLE session_impact_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_session_impact" ON session_impact_assessment
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- FORTNIGHTLY ATTENDANCE
-- =============================================================================
CREATE TABLE IF NOT EXISTS fortnightly_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  fortnight_number INTEGER,
  period_start DATE,
  period_end DATE,
  attendance_percentage NUMERIC(5,2),
  remarks TEXT,
  parent_informed TEXT,
  parent_informed_date DATE,
  parent_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fortnightly_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_fortnightly_attendance" ON fortnightly_attendance
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- CAREER COUNSELLING
-- =============================================================================
CREATE TABLE IF NOT EXISTS career_counselling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  ms_usa_aware BOOLEAN DEFAULT false,
  ms_usa_details TEXT,
  ms_other_aware BOOLEAN DEFAULT false,
  ms_other_details TEXT,
  higher_studies_india_aware BOOLEAN DEFAULT false,
  higher_studies_india_details TEXT,
  mtech_aware BOOLEAN DEFAULT false,
  mtech_details TEXT,
  mba_aware BOOLEAN DEFAULT false,
  mba_details TEXT,
  job_aware BOOLEAN DEFAULT false,
  job_details TEXT,
  job_description TEXT,
  pathways JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE career_counselling ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_career_counselling" ON career_counselling
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- PSYCHOMETRIC TEST
-- =============================================================================
CREATE TABLE IF NOT EXISTS psychometric_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_number INTEGER NOT NULL CHECK (test_number IN (1, 2, 3)),
  ps_item_responses JSONB DEFAULT '{}',
  mentor_comments TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, test_number)
);

ALTER TABLE psychometric_test ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_psychometric_test" ON psychometric_test
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- BACKLOG RECORDS
-- =============================================================================
CREATE TABLE IF NOT EXISTS backlog_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year SMALLINT NOT NULL,
  semester SMALLINT NOT NULL,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  attempt_1_month TEXT,
  attempt_1_grade TEXT,
  attempt_1_result TEXT,
  attempt_2_month TEXT,
  attempt_2_grade TEXT,
  attempt_2_result TEXT,
  attempt_3_month TEXT,
  attempt_3_grade TEXT,
  attempt_3_result TEXT,
  attempt_4_month TEXT,
  attempt_4_grade TEXT,
  attempt_4_result TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE backlog_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_backlog_records" ON backlog_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- PORTFOLIO RATINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS portfolio_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  semester_label TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  evidence_description TEXT,
  attributes_mapped JSONB DEFAULT '[]',
  program_outcomes_mapped JSONB DEFAULT '[]',
  file_attachment_url TEXT,
  rated_by UUID REFERENCES profiles(id),
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portfolio_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_portfolio_ratings" ON portfolio_ratings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- MENTOR ASSIGNMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  handoff_notes TEXT,
  handoff_unresolved_recommendations TEXT,
  handoff_completed BOOLEAN DEFAULT false,
  handoff_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mentor_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_mentor_assignments" ON mentor_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
