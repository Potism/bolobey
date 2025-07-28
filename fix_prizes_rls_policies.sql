-- Fix Prizes System RLS Policies
-- Run this in Supabase SQL Editor to resolve permission issues

-- 1. Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can read their own redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Users can create their own redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Anyone can read active prizes" ON prizes;
DROP POLICY IF EXISTS "Admins can manage prizes" ON prizes;

-- 2. Create proper RLS policies for prizes table
CREATE POLICY "Anyone can read active prizes" ON prizes
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage prizes" ON prizes
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

-- 3. Create proper RLS policies for prize_redemptions table
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

-- 4. Create a function to get user redemptions with proper permissions
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

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_user_redemptions_safe(UUID) TO authenticated;

-- 6. Create a function to get user info for redemptions (admin only)
CREATE OR REPLACE FUNCTION get_redemption_user_info(redemption_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  email TEXT
) AS $$
BEGIN
  -- Only allow admins to access this function
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
    pr.user_id,
    u.display_name,
    u.email
  FROM prize_redemptions pr
  JOIN users u ON pr.user_id = u.id
  WHERE pr.id = redemption_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions for admin function
GRANT EXECUTE ON FUNCTION get_redemption_user_info(UUID) TO authenticated;

-- 8. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Prizes RLS policies fixed!';
  RAISE NOTICE '🔒 Users can now read their own redemptions';
  RAISE NOTICE '👑 Admins can manage all redemptions';
  RAISE NOTICE '🎁 Prizes are publicly readable';
  RAISE NOTICE '🚀 Ready to use!';
END $$; 