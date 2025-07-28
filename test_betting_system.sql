-- Test script to verify the betting system is working
-- Run this after applying fix_complete_betting_system.sql

-- 1. Check if all functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'get_user_points_balance',
    'add_betting_points',
    'spend_betting_points',
    'add_stream_points',
    'place_bet',
    'process_bet_payouts'
)
AND routine_schema = 'public';

-- 2. Check if tables exist and have correct structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('user_points', 'point_packages', 'point_transactions', 'user_bets')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_process_bet_payouts', 'trigger_new_user_points')
AND trigger_schema = 'public';

-- 4. Check point packages
SELECT * FROM point_packages WHERE is_active = true ORDER BY price_eur;

-- 5. Check user points (replace 'your-user-id' with actual user ID)
-- SELECT * FROM user_points WHERE user_id = 'your-user-id';

-- 6. Test the get_user_points_balance function (replace 'your-user-id' with actual user ID)
-- SELECT * FROM get_user_points_balance('your-user-id');

-- 7. Check recent transactions (replace 'your-user-id' with actual user ID)
-- SELECT 
--     transaction_type,
--     points_amount,
--     points_type,
--     description,
--     created_at
-- FROM point_transactions 
-- WHERE user_id = 'your-user-id'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Betting system test completed!';
    RAISE NOTICE '📊 Check the results above to verify everything is working.';
    RAISE NOTICE '🎮 You can now test:';
    RAISE NOTICE '   - Purchase betting points';
    RAISE NOTICE '   - Place bets';
    RAISE NOTICE '   - Win stream points';
    RAISE NOTICE '   - Live betting in manage and dashboard';
END $$; 