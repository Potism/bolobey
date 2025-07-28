-- Test script for bet payout system
-- Run this after implementing the main fixes

-- 1. Test the notification function
SELECT create_betting_notification(
  'your-user-id-here', -- Replace with actual user ID
  'bet_won',
  100, -- bet amount
  '{"potential_winnings": 200, "match_id": "test-match"}'::jsonb
);

-- 2. Test the daily login bonus
SELECT award_daily_login_bonus('your-user-id-here'); -- Replace with actual user ID

-- 3. Test getting user login streak info
SELECT get_user_login_streak('your-user-id-here'); -- Replace with actual user ID

-- 4. Test getting user bet summary
SELECT * FROM get_user_bet_summary('your-user-id-here'); -- Replace with actual user ID

-- 5. Check if notifications table exists and has data
SELECT COUNT(*) as total_notifications FROM user_notifications;

-- 6. Check if daily logins table exists and has data
SELECT COUNT(*) as total_daily_logins FROM user_daily_logins;

-- 7. Check user points structure
SELECT 
  betting_points,
  stream_points,
  total_betting_points_earned,
  total_stream_points_earned
FROM user_points 
WHERE user_id = 'your-user-id-here'; -- Replace with actual user ID

-- 8. Check recent point transactions
SELECT 
  transaction_type,
  points_type,
  points_amount,
  description,
  created_at
FROM point_transactions 
WHERE user_id = 'your-user-id-here' -- Replace with actual user ID
ORDER BY created_at DESC 
LIMIT 10; 