-- Create assign_session_number function for atomic session number assignment
CREATE OR REPLACE FUNCTION assign_session_number(p_student_id UUID, p_mentor_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the highest session number for this student-mentor pair and increment by 1
  -- If no sessions exist, start at 1
  SELECT COALESCE(MAX(session_number), 0) + 1
  INTO next_num
  FROM sessions
  WHERE student_id = p_student_id AND mentor_id = p_mentor_id;
  
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
