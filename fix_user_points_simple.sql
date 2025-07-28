-- Simple fix for user points - avoids column name conflicts
-- For user: 09898bb2-1fb0-4e5e-a30c-027341758a52

-- 1. Check current user points
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

-- 2. Check won bets for this user
SELECT 
    id,
    match_id,
    points_wagered,
    potential_winnings,
    status,
    created_at
FROM user_bets 
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52' 
AND status = 'won'
ORDER BY created_at DESC;

-- 3. Calculate expected points from won bets
SELECT 
    COUNT(*) as total_won_bets,
    SUM(points_wagered) as total_wagered,
    SUM(potential_winnings) as total_winnings,
    SUM(potential_winnings) as expected_betting_points,
    SUM(FLOOR((potential_winnings - points_wagered) * 0.5)) as expected_stream_points
FROM user_bets 
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52' 
AND status = 'won';

-- 4. Fix user points manually
DO $$
DECLARE
    expected_betting_points INTEGER;
    expected_stream_points INTEGER;
    current_user_id UUID := '09898bb2-1fb0-4e5e-a30c-027341758a52';
BEGIN
    -- Calculate expected points from won bets
    SELECT 
        COALESCE(SUM(potential_winnings), 0),
        COALESCE(SUM(FLOOR((potential_winnings - points_wagered) * 0.5)), 0)
    INTO expected_betting_points, expected_stream_points
    FROM user_bets 
    WHERE user_id = current_user_id AND status = 'won';
    
    RAISE NOTICE 'Expected betting points: %, Expected stream points: %', expected_betting_points, expected_stream_points;
    
    -- Update or insert user points
    INSERT INTO user_points (
        user_id, 
        betting_points, 
        stream_points, 
        total_betting_points_earned, 
        total_stream_points_earned,
        total_points_spent
    ) VALUES (
        current_user_id,
        expected_betting_points,
        expected_stream_points,
        expected_betting_points,
        expected_stream_points,
        0
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        betting_points = expected_betting_points,
        stream_points = expected_stream_points,
        total_betting_points_earned = expected_betting_points,
        total_stream_points_earned = expected_stream_points,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated user points successfully!';
END $$;

-- 5. Check final result
SELECT 
    user_id,
    betting_points,
    stream_points,
    total_betting_points_earned,
    total_stream_points_earned,
    total_points_spent,
    updated_at
FROM user_points 
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52';

-- 6. Test the function result
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52'); 