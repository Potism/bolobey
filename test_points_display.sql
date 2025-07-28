-- Test script to check user points display
-- Replace 'your-user-id' with your actual user ID

-- 1. Check if user_points table has data
SELECT 
    user_id,
    betting_points,
    stream_points,
    total_betting_points_earned,
    total_stream_points_earned,
    total_points_spent,
    created_at,
    updated_at
FROM user_points 
LIMIT 5;

-- 2. Test the get_user_points_balance function
-- Replace 'your-user-id' with your actual user ID
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52');

-- 3. Check if there are any recent transactions
SELECT 
    user_id,
    transaction_type,
    points_amount,
    points_type,
    balance_before,
    balance_after,
    description,
    created_at
FROM point_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check user_points_summary view
SELECT * FROM user_points_summary LIMIT 5; 