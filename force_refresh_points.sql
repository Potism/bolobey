-- Force refresh user points for live dashboard
-- For user: 09898bb2-1fb0-4e5e-a30c-027341758a52

-- 1. Check current database values
SELECT 
    'Current Database Values' as info,
    user_id,
    betting_points,
    stream_points,
    total_betting_points_earned,
    total_stream_points_earned,
    total_points_spent,
    updated_at
FROM user_points 
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52';

-- 2. Force update with correct values
UPDATE user_points 
SET 
    betting_points = 1344,
    stream_points = 335,
    total_betting_points_earned = 1344,
    total_stream_points_earned = 335,
    total_points_spent = 0,
    updated_at = NOW()
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52';

-- 3. Test the function
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52');

-- 4. Verify the update
SELECT 
    'After Update' as info,
    user_id,
    betting_points,
    stream_points,
    total_betting_points_earned,
    total_stream_points_earned,
    total_points_spent,
    updated_at
FROM user_points 
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52';

-- 5. Clear any potential cache by updating timestamp
UPDATE user_points 
SET updated_at = NOW()
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52'; 