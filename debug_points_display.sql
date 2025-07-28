-- Debug Points Display Issue
-- Check why betting points show 0 while stream points work

-- 1. Check your current user points (replace with your user ID)
-- SELECT * FROM user_points WHERE user_id = 'your-user-id-here';

-- 2. Check recent point transactions to see what was actually awarded
SELECT 
    user_id,
    transaction_type,
    points_type,
    points_amount,
    description,
    created_at
FROM point_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if the get_user_points_balance function is working correctly
-- SELECT * FROM get_user_points_balance('your-user-id-here');

-- 4. Check the user_points table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_points' 
ORDER BY ordinal_position;

-- 5. Check if there are any recent user_bets that were won
SELECT 
    user_id,
    match_id,
    points_wagered,
    potential_winnings,
    status,
    created_at
FROM user_bets 
WHERE status = 'won'
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Check if the process_bet_payouts function exists and is working
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'process_bet_payouts';

-- 7. Check if the trigger is working
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_process_bet_payouts';

-- 8. Manually check what should be in user_points for a specific user
-- Replace 'your-user-id' with your actual user ID
-- SELECT 
--     user_id,
--     betting_points,
--     stream_points,
--     total_betting_points_earned,
--     total_stream_points_earned,
--     total_points_spent,
--     created_at,
--     updated_at
-- FROM user_points 
-- WHERE user_id = 'your-user-id-here'; 