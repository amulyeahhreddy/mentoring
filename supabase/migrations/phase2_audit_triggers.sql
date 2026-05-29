-- Phase 2 Task 2.6: Implement log_audit_event() trigger function
-- This function logs all changes to critical tables into audit_events

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

-- Apply trigger to sessions
DROP TRIGGER IF EXISTS audit_sessions ON sessions;
CREATE TRIGGER audit_sessions
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Apply trigger to profiles
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Apply trigger to mentor_assignments
DROP TRIGGER IF EXISTS audit_mentor_assignments ON mentor_assignments;
CREATE TRIGGER audit_mentor_assignments
  AFTER INSERT OR UPDATE OR DELETE ON mentor_assignments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Apply trigger to portfolio_ratings
DROP TRIGGER IF EXISTS audit_portfolio_ratings ON portfolio_ratings;
CREATE TRIGGER audit_portfolio_ratings
  AFTER INSERT OR UPDATE OR DELETE ON portfolio_ratings
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Apply trigger to fortnightly_attendance
DROP TRIGGER IF EXISTS audit_fortnightly_attendance ON fortnightly_attendance;
CREATE TRIGGER audit_fortnightly_attendance
  AFTER INSERT OR UPDATE OR DELETE ON fortnightly_attendance
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Apply trigger to career_counselling
DROP TRIGGER IF EXISTS audit_career_counselling ON career_counselling;
CREATE TRIGGER audit_career_counselling
  AFTER INSERT OR UPDATE OR DELETE ON career_counselling
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
