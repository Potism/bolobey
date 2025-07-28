-- Diagnostic Script: Check Betting System Status
-- This will help us understand why points aren't being awarded

-- 1. Check if the required functions exist
SELECT 'Checking functions...' as info;

SELECT routine_name, routine_type, data_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('place_bet', 'process_bet_payouts', 'spend_betting_points', 'add_stream_points')
ORDER BY routine_name;

-- 2. Check if triggers exist
SELECT 'Checking triggers...' as info;

SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'matches'
ORDER BY trigger_name;

-- 3. Check current user points structure
SELECT 'Checking user_points table...' as info;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_points' 
ORDER BY ordinal_position;

-- 4. Check if user_bets table has stream_points_bonus column
SELECT 'Checking user_bets table...' as info;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bets' 
ORDER BY ordinal_position;

-- 5. Check recent bets and their status
SELECT 'Checking recent bets...' as info;

SELECT 
    ub.id,
    ub.user_id,
    ub.match_id,
    ub.points_wagered,
    ub.potential_winnings,
    ub.status,
    ub.stream_points_bonus,
    ub.created_at,
    m.status as match_status,
    m.winner_id
FROM user_bets ub
LEFT JOIN matches m ON ub.match_id = m.id
ORDER BY ub.created_at DESC 
LIMIT 10;

-- 6. Check recent point transactions
SELECT 'Checking recent transactions...' as info;

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

-- 7. Check a specific user's points (replace with your user ID)
SELECT 'Checking user points...' as info;

-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT * FROM get_user_points_balance('YOUR_USER_ID');

-- 8. Check if there are any completed matches with bets that should have been processed
SELECT 'Checking completed matches with bets...' as info;

SELECT 
    m.id as match_id,
    m.status,
    m.winner_id,
    COUNT(ub.id) as total_bets,
    COUNT(CASE WHEN ub.status = 'active' THEN 1 END) as active_bets,
    COUNT(CASE WHEN ub.status = 'won' THEN 1 END) as won_bets,
    COUNT(CASE WHEN ub.status = 'lost' THEN 1 END) as lost_bets
FROM matches m
LEFT JOIN user_bets ub ON m.id = ub.match_id
WHERE m.status = 'completed' AND m.winner_id IS NOT NULL
GROUP BY m.id, m.status, m.winner_id
ORDER BY m.created_at DESC;

-- 9. Test the place_bet function (if it exists)
SELECT 'Testing place_bet function...' as info;

-- This will show the function signature
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'place_bet' 
LIMIT 1;

-- 10. Check if the betting system tables exist
SELECT 'Checking betting system tables...' as info;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_win_streaks',
    'challenges', 
    'user_challenge_progress',
    'tournament_bonuses'
)
ORDER BY table_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Diagnostic complete! Check the results above to identify the issue.';
  RAISE NOTICE 'Common issues:';
  RAISE NOTICE '1. Missing functions (place_bet, process_bet_payouts)';
  RAISE NOTICE '2. Missing triggers (trigger_process_bet_payouts)';
  RAISE NOTICE '3. Missing stream_points_bonus column in user_bets';
  RAISE NOTICE '4. Incorrect function logic';
  RAISE NOTICE '5. Missing user_points table structure';
END $$; 