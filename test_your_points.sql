-- Test script to check your user points
-- Replace 'your-user-id' with your actual user ID

-- 1. Check if you have a user_points record
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
WHERE up.user_id = 'your-user-id';

-- 2. Test the get_user_points_balance function
SELECT * FROM get_user_points_balance('your-user-id');

-- 3. Check your recent point transactions
SELECT 
    pt.id,
    pt.transaction_type,
    pt.points_amount,
    pt.points_type,
    pt.balance_before,
    pt.balance_after,
    pt.description,
    pt.created_at
FROM point_transactions pt
WHERE pt.user_id = 'your-user-id'
ORDER BY pt.created_at DESC
LIMIT 10;

-- 4. Check if you have any bets
SELECT 
    ub.id,
    ub.match_id,
    ub.points_wagered,
    ub.potential_winnings,
    ub.status,
    ub.created_at
FROM user_bets ub
WHERE ub.user_id = 'your-user-id'
ORDER BY ub.created_at DESC;

-- 5. Check your user profile
SELECT 
    u.id,
    u.email,
    u.display_name,
    u.created_at
FROM users u
WHERE u.id = 'your-user-id';

-- 6. Force refresh your points (if needed)
-- This will ensure your points are properly initialized
INSERT INTO user_points (user_id, betting_points, stream_points, total_betting_points_earned, total_stream_points_earned, total_points_spent)
VALUES ('your-user-id', 80, 50, 80, 50, 0)
ON CONFLICT (user_id) 
DO UPDATE SET 
    betting_points = EXCLUDED.betting_points,
    stream_points = EXCLUDED.stream_points,
    total_betting_points_earned = EXCLUDED.total_betting_points_earned,
    total_stream_points_earned = EXCLUDED.total_stream_points_earned,
    total_points_spent = EXCLUDED.total_points_spent,
    updated_at = NOW(); 