-- Simple test script for bet payout system
-- Run this after implementing the main fixes

-- 1. Test the manual payout processing for existing matches
SELECT process_existing_bet_payouts();

-- 2. Check if user points table has the correct structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_points' 
ORDER BY ordinal_position;

-- 3. Check if point_transactions table exists
SELECT COUNT(*) as total_transactions FROM point_transactions;

-- 4. Check recent point transactions
SELECT 
  transaction_type,
  points_type,
  points_amount,
  description,
  created_at
FROM point_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check user bet summary (replace with your user ID)
-- SELECT * FROM get_user_bet_summary('your-user-id-here');

-- 6. Check if the trigger was created successfully
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_process_bet_payouts';

-- 7. Check if functions were created successfully
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('process_bet_payouts', 'process_existing_bet_payouts', 'get_user_bet_summary')
ORDER BY routine_name; 