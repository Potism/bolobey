-- Complete Prizes System Fix
-- Run this in Supabase SQL Editor to fix all prizes issues

-- 1. First, let's check what we have
SELECT 'Checking current state...' as step;
SELECT COUNT(*) as prizes_count FROM prizes;
SELECT COUNT(*) as redemptions_count FROM prize_redemptions;
SELECT COUNT(*) as user_points_count FROM user_points;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can read active prizes" ON prizes;
DROP POLICY IF EXISTS "Admins can manage prizes" ON prizes;
DROP POLICY IF EXISTS "Users can read their own redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Users can create their own redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON prize_redemptions;

-- 3. Create simple, working RLS policies for prizes
CREATE POLICY "Anyone can read active prizes" ON prizes
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage prizes" ON prizes
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

-- 4. Create simple, working RLS policies for prize_redemptions
CREATE POLICY "Users can read their own redemptions" ON prize_redemptions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own redemptions" ON prize_redemptions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all redemptions" ON prize_redemptions
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

-- 5. Create a function for admins to get all redemptions with user info
CREATE OR REPLACE FUNCTION get_all_redemptions_admin()
RETURNS TABLE(
  redemption_id UUID,
  user_id UUID,
  user_display_name TEXT,
  user_email TEXT,
  prize_id UUID,
  prize_name TEXT,
  prize_category TEXT,
  points_spent INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'email' IN (
      SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    pr.id,
    pr.user_id,
    u.display_name,
    u.email,
    pr.prize_id,
    p.name,
    p.category,
    pr.points_spent,
    pr.status,
    pr.created_at
  FROM prize_redemptions pr
  JOIN prizes p ON pr.prize_id = p.id
  JOIN users u ON pr.user_id = u.id
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function for users to get their own redemptions
CREATE OR REPLACE FUNCTION get_user_redemptions_safe(user_uuid UUID)
RETURNS TABLE(
  redemption_id UUID,
  prize_name TEXT,
  prize_category TEXT,
  points_spent INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Ensure user can only access their own redemptions
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Can only access own redemptions';
  END IF;

  RETURN QUERY
  SELECT 
    pr.id,
    p.name,
    p.category,
    pr.points_spent,
    pr.status,
    pr.created_at
  FROM prize_redemptions pr
  JOIN prizes p ON pr.prize_id = p.id
  WHERE pr.user_id = user_uuid
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION get_all_redemptions_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_redemptions_safe(UUID) TO authenticated;

-- 8. Insert sample prizes if table is empty
INSERT INTO prizes (name, description, points_cost, category, stock_quantity, is_featured, is_active)
SELECT * FROM (VALUES
    ('Gaming Mouse', 'High-performance gaming mouse with RGB lighting', 500, 'gaming', 10, true, true),
    ('Gaming Headset', 'Wireless gaming headset with noise cancellation', 750, 'gaming', 8, true, true),
    ('Gaming Keyboard', 'Mechanical gaming keyboard with customizable keys', 1000, 'gaming', 5, true, true),
    ('Gaming Chair', 'Ergonomic gaming chair with lumbar support', 2500, 'gaming', 3, false, true),
    ('Gaming Monitor', '27-inch 144Hz gaming monitor', 5000, 'electronics', 2, false, true),
    ('Gaming Laptop', 'High-end gaming laptop with RTX graphics', 15000, 'electronics', 1, true, true),
    ('Bolobey T-Shirt', 'Official Bolobey tournament t-shirt', 200, 'clothing', 50, false, true),
    ('Bolobey Hoodie', 'Comfortable Bolobey branded hoodie', 400, 'clothing', 25, false, true),
    ('Gaming Mousepad', 'Large RGB gaming mousepad', 150, 'accessories', 30, false, true),
    ('Gaming Controller', 'Wireless gaming controller', 300, 'gaming', 15, false, true)
) AS v(name, description, points_cost, category, stock_quantity, is_featured, is_active)
WHERE NOT EXISTS (SELECT 1 FROM prizes);

-- 9. Enable realtime for these tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'prizes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prizes;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'prize_redemptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prize_redemptions;
  END IF;
END $$;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prizes_active ON prizes(is_active);
CREATE INDEX IF NOT EXISTS idx_prizes_featured ON prizes(is_featured);
CREATE INDEX IF NOT EXISTS idx_prizes_category ON prizes(category);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_user_id ON prize_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_status ON prize_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_created_at ON prize_redemptions(created_at);

-- 11. Test the setup
SELECT 'Testing prizes access...' as step;
SELECT COUNT(*) as active_prizes FROM prizes WHERE is_active = true;

SELECT 'Testing redemptions access...' as step;
SELECT COUNT(*) as total_redemptions FROM prize_redemptions;

-- 12. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Complete prizes system fix applied!';
  RAISE NOTICE '🎁 Prizes should now be visible to all users';
  RAISE NOTICE '👑 Admins can now see all redemptions with user info';
  RAISE NOTICE '🔒 Users can only see their own redemptions';
  RAISE NOTICE '📦 Sample prizes added if table was empty';
  RAISE NOTICE '🚀 Ready to use!';
END $$; 