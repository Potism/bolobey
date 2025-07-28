-- Test script to check if points are being awarded correctly
-- Run this after winning a bet to see if the database is updated

-- 1. Check current user points
SELECT 
    'Current User Points' as info,
    user_id,
    betting_points,
    stream_points,
    updated_at
FROM user_points 
WHERE user_id = auth.uid();

-- 2. Check recent point transactions
SELECT 
    'Recent Point Transactions' as info,
    user_id,
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

-- 3. Check recent user bets
SELECT 
    'Recent User Bets' as info,
    user_id,
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

-- 4. Check if process_bet_payouts trigger exists
SELECT 
    'Trigger Check' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_process_bet_payouts';

-- 5. Test the get_user_points_balance function
SELECT 
    'Function Test' as info,
    *
FROM get_user_points_balance(auth.uid()); 