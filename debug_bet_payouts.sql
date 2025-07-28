-- Debug script to check why bet payouts aren't working
-- Run this after winning a bet to see what's happening

-- 1. Check if the trigger exists and is working
SELECT 
    'Trigger Status' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_process_bet_payouts';

-- 2. Check recent matches to see if any are completed
SELECT 
    'Recent Matches' as info,
    id,
    player1_id,
    player2_id,
    winner_id,
    status,
    created_at
FROM matches 
WHERE status = 'completed'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if there are any user_bets that should have been processed
SELECT 
    'User Bets Status' as info,
    ub.id,
    ub.user_id,
    ub.match_id,
    ub.bet_on_player_id,
    ub.points_wagered,
    ub.potential_winnings,
    ub.stream_points_bonus,
    ub.status as bet_status,
    m.winner_id,
    m.status as match_status,
    CASE 
        WHEN m.winner_id = ub.bet_on_player_id THEN 'WON'
        WHEN m.winner_id IS NOT NULL AND m.winner_id != ub.bet_on_player_id THEN 'LOST'
        ELSE 'PENDING'
    END as bet_result
FROM user_bets ub
LEFT JOIN matches m ON ub.match_id = m.id
WHERE ub.user_id = auth.uid()
ORDER BY ub.created_at DESC 
LIMIT 10;

-- 4. Check if the process_bet_payouts function exists
SELECT 
    'Function Check' as info,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'process_bet_payouts';

-- 5. Manually test the process_bet_payouts function
-- This will show if there are any errors
DO $$
DECLARE
    bet_record RECORD;
BEGIN
    RAISE NOTICE 'Checking for unprocessed winning bets...';
    
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.match_id,
            ub.bet_on_player_id,
            ub.points_wagered,
            ub.potential_winnings,
            ub.stream_points_bonus,
            m.winner_id,
            m.status
        FROM user_bets ub
        JOIN matches m ON ub.match_id = m.id
        WHERE ub.user_id = auth.uid()
        AND m.status = 'completed'
        AND m.winner_id IS NOT NULL
        AND ub.status = 'pending'
    LOOP
        RAISE NOTICE 'Found bet: ID=%, Match=%, Bet on=%, Winner=%, Status=%', 
            bet_record.id, 
            bet_record.match_id, 
            bet_record.bet_on_player_id, 
            bet_record.winner_id,
            bet_record.status;
            
        IF bet_record.bet_on_player_id = bet_record.winner_id THEN
            RAISE NOTICE 'This bet should have WON! Points: %, Stream Bonus: %', 
                bet_record.potential_winnings, 
                bet_record.stream_points_bonus;
        ELSE
            RAISE NOTICE 'This bet LOST';
        END IF;
    END LOOP;
END $$;

-- 6. Check current user points
SELECT 
    'Current Points' as info,
    user_id,
    betting_points,
    stream_points,
    updated_at
FROM user_points 
WHERE user_id = auth.uid(); 