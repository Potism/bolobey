-- Check current user points data
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
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52';

-- Check the get_user_points_balance function
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52');

-- Update user points to correct values if needed
UPDATE user_points 
SET 
    betting_points = 1344,
    stream_points = 335,
    total_betting_points_earned = 1344,
    total_stream_points_earned = 335,
    updated_at = NOW()
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52';

-- Verify the update
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52'); 