-- Add issues_checklist column to sessions table
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS issues_checklist jsonb DEFAULT '{}';
