-- 1. Create function to give new users 50 points
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stream_points (user_id, points, transaction_type, description)
  VALUES (NEW.id, 50, 'admin_award', 'Welcome bonus for new user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger to automatically give points to new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Give 50 points to existing users who don't have any points
INSERT INTO stream_points (user_id, points, transaction_type, description)
SELECT 
  u.id, 
  50, 
  'admin_award', 
  'Welcome bonus for existing user'
FROM auth.users u
LEFT JOIN stream_points sp ON u.id = sp.user_id
WHERE sp.user_id IS NULL
  OR (SELECT COALESCE(SUM(points), 0) FROM stream_points WHERE user_id = u.id) = 0; 