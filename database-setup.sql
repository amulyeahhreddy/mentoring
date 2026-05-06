-- Fix profiles trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'mentee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'mentor', 'mentee')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_code TEXT UNIQUE NOT NULL,
  created_by_admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mentor-class assignments
CREATE TABLE IF NOT EXISTS mentor_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES profiles(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  UNIQUE(mentor_id, class_id)
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Student profiles (one-time onboarding)
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  data JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ
);

-- B.Tech semester records
CREATE TABLE IF NOT EXISTS btech_sem_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  year SMALLINT NOT NULL CHECK (year BETWEEN 1 AND 4),
  semester SMALLINT NOT NULL CHECK (semester IN (1, 2)),
  sgpa NUMERIC(4,2),
  cgpa NUMERIC(4,2),
  credits_earned INTEGER,
  backlogs INTEGER DEFAULT 0,
  year_of_passing INTEGER,
  UNIQUE(student_id, year, semester)
);

-- Subject marks
CREATE TABLE IF NOT EXISTS subject_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  year SMALLINT NOT NULL,
  semester SMALLINT NOT NULL,
  course_code TEXT,
  course_name TEXT NOT NULL,
  mid1 NUMERIC(5,2),
  mid2 NUMERIC(5,2),
  end_sem NUMERIC(5,2),
  internal NUMERIC(5,2),
  total NUMERIC(5,2)
);

-- Sessions (3-layer JSONB)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  mentor_id UUID NOT NULL REFERENCES profiles(id),
  academic_year TEXT,
  year_of_study SMALLINT CHECK (year_of_study BETWEEN 1 AND 4),
  semester SMALLINT CHECK (semester IN (1, 2)),
  session_number SMALLINT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_label TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  structured_input JSONB DEFAULT '{}',
  audio_data JSONB DEFAULT '{}',
  ai_output JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  mentor_id UUID NOT NULL REFERENCES profiles(id),
  text TEXT NOT NULL,
  assigned_to TEXT CHECK (assigned_to IN ('student', 'mentor', 'both')),
  due_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  reviewed_in_session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Aptitude test scores
CREATE TABLE IF NOT EXISTS aptitude_test_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  year SMALLINT,
  semester SMALLINT,
  test_number INTEGER,
  type TEXT CHECK (type IN ('Quantitative', 'Verbal Ability', 'Logical Reasoning', 'Programming')),
  score NUMERIC(5,2)
);

-- Portfolio artifacts
CREATE TABLE IF NOT EXISTS portfolio_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  year SMALLINT,
  semester SMALLINT,
  artifact_type TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  attainment_levels JSONB DEFAULT '[]',
  program_outcomes JSONB DEFAULT '[]'
);

-- Books read log
CREATE TABLE IF NOT EXISTS books_read_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  author TEXT,
  category TEXT,
  language TEXT,
  date_read DATE,
  award_recognition TEXT
);

-- Extracurricular log
CREATE TABLE IF NOT EXISTS extracurricular_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  event TEXT NOT NULL,
  place TEXT,
  event_date DATE,
  award TEXT
);

-- Social work log
CREATE TABLE IF NOT EXISTS social_work_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  organizer TEXT,
  event TEXT NOT NULL,
  place TEXT,
  event_date DATE
);

-- AI pre-session insights cache
CREATE TABLE IF NOT EXISTS pre_session_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  mentor_id UUID NOT NULL REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  insights JSONB NOT NULL DEFAULT '{}',
  model_used TEXT
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE btech_sem_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE aptitude_test_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE books_read_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracurricular_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_work_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_session_insights ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used by all API routes)
CREATE POLICY "service_role_profiles" ON profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_classes" ON classes FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_mentor_classes" ON mentor_classes FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_enrollments" ON enrollments FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_student_profiles" ON student_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_btech" ON btech_sem_records FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_subjects" ON subject_marks FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_sessions" ON sessions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_tasks" ON tasks FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_aptitude" ON aptitude_test_scores FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_portfolio" ON portfolio_artifacts FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_books" ON books_read_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_extra" ON extracurricular_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_social" ON social_work_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_insights" ON pre_session_insights FOR ALL TO service_role USING (true);
