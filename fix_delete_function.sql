-- Fix Delete Function for Prizes
-- Run this in Supabase SQL Editor

-- 1. Check if admin can delete prizes
-- First, let's verify the RLS policies allow admin deletion

-- 2. Create a safer delete function that handles RLS properly
CREATE OR REPLACE FUNCTION delete_prize_safe(prize_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  -- Only allow admins to delete prizes
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can delete prizes';
  END IF;
  
  -- Check if prize exists
  IF NOT EXISTS (SELECT 1 FROM prizes WHERE id = prize_uuid) THEN
    RAISE EXCEPTION 'Prize not found';
  END IF;
  
  -- Check if prize has any redemptions
  IF EXISTS (SELECT 1 FROM prize_redemptions WHERE prize_id = prize_uuid) THEN
    RAISE EXCEPTION 'Cannot delete prize with existing redemptions';
  END IF;
  
  -- Delete the prize
  DELETE FROM prizes WHERE id = prize_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_prize_safe(UUID) TO authenticated;

-- 4. Update RLS policies to ensure admin can delete
DROP POLICY IF EXISTS "Admins can delete prizes" ON prizes;
CREATE POLICY "Admins can delete prizes" ON prizes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. Test the function (optional - uncomment to test)
-- SELECT delete_prize_safe('your-prize-id-here');

-- 6. Success message
DO $$
BEGIN
  RAISE NOTICE 'Delete function and policies updated successfully!';
  RAISE NOTICE 'Admins can now delete prizes safely.';
END $$; 