-- Function to get user's points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  -- Calculate total points from stream_points table
  SELECT COALESCE(SUM(points), 0) INTO total_points
  FROM stream_points
  WHERE user_id = user_uuid;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 