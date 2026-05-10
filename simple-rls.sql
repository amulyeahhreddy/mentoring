-- Enable RLS on all tables
ALTER TABLE subject_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE aptitude_test_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE btech_sem_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracurricular_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE books_read_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- subject_marks
CREATE POLICY "Authenticated users can select subject marks"
ON subject_marks
FOR SELECT
TO authenticated
USING (true);

-- aptitude_test_scores
CREATE POLICY "Authenticated users can select aptitude test scores"
ON aptitude_test_scores
FOR SELECT
TO authenticated
USING (true);

-- sessions
CREATE POLICY "Users can select their own sessions"
ON sessions
FOR SELECT
TO authenticated
USING (mentor_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON sessions
FOR UPDATE
TO authenticated
USING (mentor_id = auth.uid());

-- btech_sem_records
CREATE POLICY "Authenticated users can select btech sem records"
ON btech_sem_records
FOR SELECT
TO authenticated
USING (true);

-- extracurricular_log
CREATE POLICY "Authenticated users can select extracurricular log"
ON extracurricular_log
FOR SELECT
TO authenticated
USING (true);

-- books_read_log
CREATE POLICY "Authenticated users can select books read log"
ON books_read_log
FOR SELECT
TO authenticated
USING (true);

-- portfolio_artifacts
CREATE POLICY "Authenticated users can select portfolio artifacts"
ON portfolio_artifacts
FOR SELECT
TO authenticated
USING (true);

-- student_profiles
CREATE POLICY "Authenticated users can select student profiles"
ON student_profiles
FOR SELECT
TO authenticated
USING (true);
