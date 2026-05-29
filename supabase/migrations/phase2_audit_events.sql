-- Phase 2 Task 2.5: Create audit_events table (append-only, immutable)
-- This table provides a true immutable audit trail for critical data changes

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

-- Enable Row Level Security
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Only INSERT allowed. No UPDATE, no DELETE — ever.
CREATE POLICY "audit_insert_only" ON audit_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admins can SELECT to view the audit log
CREATE POLICY "admin_read_audit" ON audit_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role has full access
CREATE POLICY "service_role_audit" ON audit_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- DO NOT create UPDATE or DELETE policies. Their absence is the security guarantee.
