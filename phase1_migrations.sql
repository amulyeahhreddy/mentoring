// Phase 1 migration statements for Phase 1 fixes

-- Add nullable columns to extracurricular_log
ALTER TABLE extracurricular_log
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id),
  ADD COLUMN IF NOT EXISTS skill_area TEXT,
  ADD COLUMN IF NOT EXISTS organized_or_participated TEXT;

-- Add session_status column with check constraint
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'draft',
  ADD CONSTRAINT valid_session_status CHECK (session_status IN ('draft','mentor_review','student_acknowledged','coordinator_approved','completed'));
