-- Test Prizes Access
-- Run this in Supabase SQL Editor to check if everything is working

-- 1. Test prizes access
SELECT 'Testing prizes access...' as test_step;
SELECT COUNT(*) as total_prizes FROM prizes;
SELECT COUNT(*) as active_prizes FROM prizes WHERE is_active = true;
SELECT name, points_cost, stock_quantity FROM prizes WHERE is_active = true LIMIT 5;

-- 2. Test redemptions access
SELECT 'Testing redemptions access...' as test_step;
SELECT COUNT(*) as total_redemptions FROM prize_redemptions;

-- 3. Test admin function
SELECT 'Testing admin function...' as test_step;
SELECT COUNT(*) as admin_function_result FROM get_all_redemptions_admin();

-- 4. Test user points
SELECT 'Testing user points...' as test_step;
SELECT COUNT(*) as users_with_points FROM user_points;
SELECT SUM(stream_points) as total_stream_points FROM user_points;

-- 5. Check RLS policies
SELECT 'Checking RLS policies...' as test_step;
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('prizes', 'prize_redemptions')
ORDER BY tablename, policyname;

-- 6. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Prizes access test completed!';
  RAISE NOTICE '🎁 Check the results above to verify access';
  RAISE NOTICE '👑 Admin function should return redemptions';
  RAISE NOTICE '💰 User points should be accessible';
END $$; 