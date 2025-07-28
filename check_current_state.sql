-- Check Current State of Notifications and Points System
-- Run this to see what's currently working and what needs fixing

-- 1. Check if user_notifications table exists and has data
SELECT 
    'user_notifications' as table_name,
    COUNT(*) as record_count
FROM user_notifications
UNION ALL
SELECT 
    'user_notifications (won bets)' as table_name,
    COUNT(*) as record_count
FROM user_notifications 
WHERE type = 'bet_won';

-- 2. Check recent notifications
SELECT 
    type,
    title,
    message,
    created_at
FROM user_notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check user_bets table for won bets
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

-- 4. Check if the notification function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'create_betting_notification';

-- 5. Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'bet_notifications_trigger';

-- 6. Check user_points table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_points' 
ORDER BY ordinal_position;

-- 7. Check recent point transactions
SELECT 
    transaction_type,
    points_type,
    points_amount,
    description,
    created_at
FROM point_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Test the get_user_points_balance function (replace with your user ID)
-- SELECT * FROM get_user_points_balance('your-user-id-here');

-- 9. Check if there are any won bets without notifications
SELECT 
    COUNT(*) as won_bets_without_notifications
FROM user_bets ub
WHERE ub.status = 'won'
AND NOT EXISTS (
    SELECT 1 FROM user_notifications un
    WHERE un.user_id = ub.user_id
    AND un.type = 'bet_won'
    AND (un.data->>'match_id')::UUID = ub.match_id
); 