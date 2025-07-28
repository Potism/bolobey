-- Test script to check user points
-- Replace 'your-user-id' with your actual user ID

-- Check if user_points table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_points';

-- Check if the get_user_points_balance function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_user_points_balance';

-- Check all users with points (replace with your user ID)
SELECT 
    up.user_id,
    up.betting_points,
    up.stream_points,
    up.total_betting_points_earned,
    up.total_stream_points_earned,
    up.total_points_spent,
    up.created_at,
    up.updated_at
FROM user_points up
ORDER BY up.updated_at DESC
LIMIT 10;

-- Check point transactions
SELECT 
    pt.id,
    pt.user_id,
    pt.transaction_type,
    pt.points_amount,
    pt.description,
    pt.created_at
FROM point_transactions pt
ORDER BY pt.created_at DESC
LIMIT 10;

-- Check point packages
SELECT * FROM point_packages;

-- Test the function manually (replace 'your-user-id' with your actual user ID)
-- SELECT * FROM get_user_points_balance('your-user-id'); 