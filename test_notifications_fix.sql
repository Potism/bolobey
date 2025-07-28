-- Test script for notifications and points fixes
-- Run this after implementing the fixes

-- 1. Test the user points balance function
-- Replace 'your-user-id' with your actual user ID
-- SELECT * FROM get_user_points_balance('your-user-id');

-- 2. Check if user_notifications table exists and has data
SELECT COUNT(*) as total_notifications FROM user_notifications;

-- 3. Check recent notifications
SELECT 
  user_id,
  type,
  title,
  message,
  created_at
FROM user_notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check user_bets table for won bets
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

-- 5. Check user_points table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_points' 
ORDER BY ordinal_position;

-- 6. Check recent point transactions
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

-- 7. Test the notification function manually (replace with your user ID)
-- SELECT create_betting_notification(
--   'your-user-id',
--   'bet_won',
--   50,
--   '{"match_id": "test-match", "potential_winnings": 100, "bet_on_player_id": "player-1"}'::jsonb
-- );

-- 8. Process existing bets with notifications
SELECT process_existing_bets_with_notifications();

-- 9. Check if triggers are working
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_process_bet_payouts', 'bet_notifications_trigger')
ORDER BY trigger_name;

-- 10. Check function permissions
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name IN (
  'create_betting_notification',
  'trigger_bet_notifications', 
  'get_user_points_balance',
  'process_existing_bets_with_notifications'
)
ORDER BY routine_name; 