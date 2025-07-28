-- Test Complete Betting System
-- Run this after implementing the fixes to verify everything works

-- 1. Check current system state
DO $$
BEGIN
    RAISE NOTICE '=== TESTING COMPLETE BETTING SYSTEM ===';
    RAISE NOTICE 'Testing as user: %', auth.uid();
END $$;

-- 2. Check if user_points record exists for current user
SELECT 
    'User Points Check' as test_name,
    user_id,
    betting_points,
    stream_points,
    updated_at
FROM user_points 
WHERE user_id = auth.uid();

-- 3. Check if betting_matches table exists and has data
SELECT 
    'Betting Matches Check' as test_name,
    COUNT(*) as total_matches,
    COUNT(CASE WHEN status = 'betting_open' THEN 1 END) as open_matches,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_matches
FROM betting_matches;

-- 4. Check if user_bets table has stream_points_bonus column
SELECT 
    'User Bets Structure Check' as test_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bets' 
AND column_name = 'stream_points_bonus';

-- 5. Check if functions exist
SELECT 
    'Functions Check' as test_name,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'get_user_points_balance',
    'place_betting_match_bet',
    'process_betting_matches_payouts',
    'add_betting_points',
    'spend_betting_points',
    'add_stream_points'
)
ORDER BY routine_name;

-- 6. Check if triggers exist
SELECT 
    'Triggers Check' as test_name,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name IN (
    'trigger_process_betting_matches_payouts',
    'trigger_process_bet_payouts',
    'trigger_new_user_points'
);

-- 7. Check recent user bets
SELECT 
    'Recent User Bets' as test_name,
    id,
    match_id,
    bet_on_player_id,
    points_wagered,
    potential_winnings,
    stream_points_bonus,
    status,
    created_at
FROM user_bets 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Check recent point transactions
SELECT 
    'Recent Point Transactions' as test_name,
    transaction_type,
    points_amount,
    points_type,
    balance_before,
    balance_after,
    description,
    created_at
FROM point_transactions 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 10;

-- 9. Test get_user_points_balance function
SELECT 
    'Function Test - get_user_points_balance' as test_name,
    *
FROM get_user_points_balance(auth.uid());

-- 10. Check if there are any unprocessed bets
SELECT 
    'Unprocessed Bets Check' as test_name,
    COUNT(*) as unprocessed_bets
FROM user_bets ub
JOIN betting_matches bm ON ub.match_id = bm.id
WHERE bm.status = 'completed' 
AND bm.winner_id IS NOT NULL
AND ub.status = 'pending'
AND ub.user_id = auth.uid();

-- 11. Check real-time subscriptions
SELECT 
    'Realtime Check' as test_name,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('user_points', 'point_transactions', 'user_bets', 'betting_matches')
ORDER BY tablename;

-- 12. Success summary
DO $$
DECLARE
    user_points_count INTEGER;
    betting_matches_count INTEGER;
    user_bets_count INTEGER;
    functions_count INTEGER;
    triggers_count INTEGER;
BEGIN
    -- Count user points records
    SELECT COUNT(*) INTO user_points_count FROM user_points WHERE user_id = auth.uid();
    
    -- Count betting matches
    SELECT COUNT(*) INTO betting_matches_count FROM betting_matches;
    
    -- Count user bets
    SELECT COUNT(*) INTO user_bets_count FROM user_bets WHERE user_id = auth.uid();
    
    -- Count functions
    SELECT COUNT(*) INTO functions_count FROM information_schema.routines 
    WHERE routine_name IN (
        'get_user_points_balance',
        'place_betting_match_bet',
        'process_betting_matches_payouts',
        'add_betting_points',
        'spend_betting_points',
        'add_stream_points'
    );
    
    -- Count triggers
    SELECT COUNT(*) INTO triggers_count FROM information_schema.triggers 
    WHERE trigger_name IN (
        'trigger_process_betting_matches_payouts',
        'trigger_process_bet_payouts',
        'trigger_new_user_points'
    );
    
    RAISE NOTICE '=== TEST SUMMARY ===';
    RAISE NOTICE 'User points record: %', CASE WHEN user_points_count > 0 THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE 'Betting matches: %', betting_matches_count;
    RAISE NOTICE 'User bets: %', user_bets_count;
    RAISE NOTICE 'Functions: %', functions_count;
    RAISE NOTICE 'Triggers: %', triggers_count;
    
    IF user_points_count > 0 AND functions_count >= 6 AND triggers_count >= 2 THEN
        RAISE NOTICE '✅ BETTING SYSTEM IS READY FOR TESTING!';
        RAISE NOTICE 'You can now:';
        RAISE NOTICE '1. Place bets using the live betting interface';
        RAISE NOTICE '2. Win matches to get betting points + stream points';
        RAISE NOTICE '3. Check your points in the avatar/profile';
    ELSE
        RAISE NOTICE '❌ BETTING SYSTEM NEEDS MORE SETUP';
        RAISE NOTICE 'Please run the integration scripts again';
    END IF;
END $$; 