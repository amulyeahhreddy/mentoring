-- RLS Policies for Student Profile Access
-- Run these policies in Supabase SQL Editor to enable mentor access to student data

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
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = btech_sem_records.student_id
        )
    );

-- Allow students to read their own academic records
CREATE POLICY "Students can read their own academic records" ON btech_sem_records
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 3. Extracurricular Log policies
-- Allow authenticated mentors to read extracurricular activities for their assigned students
CREATE POLICY "Mentors can read extracurricular activities for their students" ON extracurricular_log
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = extracurricular_log.student_id
        )
    );

-- Allow students to read their own extracurricular activities
CREATE POLICY "Students can read their own extracurricular activities" ON extracurricular_log
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to insert their own extracurricular activities
CREATE POLICY "Students can insert their own extracurricular activities" ON extracurricular_log
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to update their own extracurricular activities
CREATE POLICY "Students can update their own extracurricular activities" ON extracurricular_log
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to delete their own extracurricular activities
CREATE POLICY "Students can delete their own extracurricular activities" ON extracurricular_log
    FOR DELETE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 4. Books Read Log policies
-- Allow authenticated mentors to read books read by their assigned students
CREATE POLICY "Mentors can read books for their students" ON books_read_log
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = books_read_log.student_id
        )
    );

-- Allow students to read their own books
CREATE POLICY "Students can read their own books" ON books_read_log
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to insert their own books
CREATE POLICY "Students can insert their own books" ON books_read_log
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to update their own books
CREATE POLICY "Students can update their own books" ON books_read_log
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to delete their own books
CREATE POLICY "Students can delete their own books" ON books_read_log
    FOR DELETE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 5. Portfolio Artifacts policies
-- Allow authenticated mentors to read portfolio artifacts for their assigned students
CREATE POLICY "Mentors can read portfolio artifacts for their students" ON portfolio_artifacts
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = portfolio_artifacts.student_id
        )
    );

-- Allow students to read their own portfolio artifacts
CREATE POLICY "Students can read their own portfolio artifacts" ON portfolio_artifacts
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to insert their own portfolio artifacts
CREATE POLICY "Students can insert their own portfolio artifacts" ON portfolio_artifacts
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to update their own portfolio artifacts
CREATE POLICY "Students can update their own portfolio artifacts" ON portfolio_artifacts
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to delete their own portfolio artifacts
CREATE POLICY "Students can delete their own portfolio artifacts" ON portfolio_artifacts
    FOR DELETE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 6. Student Profiles policies
-- Allow authenticated mentors to read student profiles for their assigned students
CREATE POLICY "Mentors can read student profiles for their students" ON student_profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = student_profiles.student_id
        )
    );

-- Allow students to read their own profiles
CREATE POLICY "Students can read their own profiles" ON student_profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to insert their own profiles
CREATE POLICY "Students can insert their own profiles" ON student_profiles
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to update their own profiles
CREATE POLICY "Students can update their own profiles" ON student_profiles
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- Allow students to delete their own profiles
CREATE POLICY "Students can delete their own profiles" ON student_profiles
    FOR DELETE USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 7. Sessions policies
-- Allow authenticated mentors to read sessions for their assigned students
CREATE POLICY "Mentors can read sessions for their students" ON sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = sessions.student_id
        )
    );

-- Allow authenticated mentors to insert sessions for their assigned students
CREATE POLICY "Mentors can insert sessions for their students" ON sessions
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = sessions.student_id
        )
    );

-- Allow authenticated mentors to update sessions for their assigned students
CREATE POLICY "Mentors can update sessions for their students" ON sessions
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = sessions.student_id
        )
    );

-- Allow students to read their own sessions
CREATE POLICY "Students can read their own sessions" ON sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 8. Pre-session Insights policies
-- Allow authenticated mentors to read insights for their assigned students
CREATE POLICY "Mentors can read insights for their students" ON pre_session_insights
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = pre_session_insights.student_id
        )
    );

-- Allow authenticated mentors to insert insights for their assigned students
CREATE POLICY "Mentors can insert insights for their students" ON pre_session_insights
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = pre_session_insights.student_id
        )
    );

-- Allow students to read their own insights
CREATE POLICY "Students can read their own insights" ON pre_session_insights
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 10. Tests policies for ValidateScreen functionality
-- Enable RLS on tests table if not already enabled
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated mentors to insert tests for their assigned students
CREATE POLICY "Mentors can insert tests for their students" ON tests
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = tests.student_id
        )
    );

-- Allow authenticated mentors to read tests for their assigned students
CREATE POLICY "Mentors can read tests for their students" ON tests
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = tests.student_id
        )
    );

-- Allow students to read their own tests
CREATE POLICY "Students can read their own tests" ON tests
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );

-- 11. Additional policies for ValidateScreen functionality
-- Allow authenticated mentors to update ai_output and audio_data in sessions
CREATE POLICY "Mentors can update session ai_output and audio_data" ON sessions
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = sessions.student_id
        )
    );

-- Allow authenticated mentors to select ai_output and audio_data from sessions
CREATE POLICY "Mentors can select session ai_output and audio_data" ON sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            JOIN enrollments e ON mc.class_id = e.class_id
            WHERE mc.mentor_id = auth.uid() 
            AND e.student_id = sessions.student_id
        )
    );

-- 9. Additional utility policies for mentor_classes and enrollments
-- Allow mentors to read their own class assignments
CREATE POLICY "Mentors can read their class assignments" ON mentor_classes
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND mentor_id = auth.uid()
    );

-- Allow mentors to read enrollments for their classes
CREATE POLICY "Mentors can read enrollments for their classes" ON enrollments
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM mentor_classes mc
            WHERE mc.mentor_id = auth.uid() 
            AND mc.class_id = enrollments.class_id
        )
    );

-- Allow students to read their own enrollments
CREATE POLICY "Students can read their own enrollments" ON enrollments
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND student_id = auth.uid()
    );
