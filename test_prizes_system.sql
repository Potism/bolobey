-- Test Prizes System with Dual-Point System
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check if prizes table exists and has data
SELECT 'Checking prizes table...' as test_step;
SELECT COUNT(*) as total_prizes FROM prizes;
SELECT COUNT(*) as active_prizes FROM prizes WHERE is_active = true;
SELECT COUNT(*) as featured_prizes FROM prizes WHERE is_featured = true;

-- 2. Check if prize_redemptions table exists
SELECT 'Checking prize_redemptions table...' as test_step;
SELECT COUNT(*) as total_redemptions FROM prize_redemptions;

-- 3. Check if user_points table exists and has data
SELECT 'Checking user_points table...' as test_step;
SELECT COUNT(*) as total_users_with_points FROM user_points;
SELECT SUM(stream_points) as total_stream_points FROM user_points;

-- 4. Check if point_transactions table exists
SELECT 'Checking point_transactions table...' as test_step;
SELECT COUNT(*) as total_transactions FROM point_transactions;
SELECT transaction_type, COUNT(*) as count 
FROM point_transactions 
GROUP BY transaction_type 
ORDER BY count DESC;

-- 5. Check if the redeem_prize_dual_points function exists
SELECT 'Checking redeem_prize_dual_points function...' as test_step;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'redeem_prize_dual_points';

-- 6. Check if get_user_redemptions_dual_points function exists
SELECT 'Checking get_user_redemptions_dual_points function...' as test_step;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_redemptions_dual_points';

-- 7. Check RLS policies for prizes table
SELECT 'Checking prizes RLS policies...' as test_step;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'prizes';

-- 8. Check RLS policies for prize_redemptions table
SELECT 'Checking prize_redemptions RLS policies...' as test_step;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'prize_redemptions';

-- 9. Check recent redemptions with user and prize data
SELECT 'Checking recent redemptions...' as test_step;
SELECT 
    pr.id,
    pr.points_spent,
    pr.status,
    pr.created_at,
    p.name as prize_name,
    p.category as prize_category,
    u.display_name as user_name
FROM prize_redemptions pr
JOIN prizes p ON pr.prize_id = p.id
JOIN users u ON pr.user_id = u.id
ORDER BY pr.created_at DESC
LIMIT 5;

-- 10. Check recent point transactions related to prizes
SELECT 'Checking recent prize-related transactions...' as test_step;
SELECT 
    pt.transaction_type,
    pt.points_amount,
    pt.points_type,
    pt.description,
    pt.created_at,
    u.display_name as user_name
FROM point_transactions pt
JOIN users u ON pt.user_id = u.id
WHERE pt.transaction_type IN ('stream_points_redeemed', 'stream_points_refunded')
ORDER BY pt.created_at DESC
LIMIT 5;

-- 11. Check user points balances
SELECT 'Checking user points balances...' as test_step;
SELECT 
    u.display_name,
    up.betting_points,
    up.stream_points,
    up.updated_at
FROM user_points up
JOIN users u ON up.user_id = u.id
ORDER BY up.stream_points DESC
LIMIT 10;

-- 12. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Prizes system test completed!';
  RAISE NOTICE '🎁 Check the results above to verify everything is working';
  RAISE NOTICE '💰 Make sure users can redeem prizes with stream points';
  RAISE NOTICE '📦 Make sure admins can manage redemptions';
END $$; 