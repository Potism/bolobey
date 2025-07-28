-- Restore betting points that were incorrectly deducted from stream points
-- This script will analyze the transaction history and restore betting points

-- First, let's see what transactions we have
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
WHERE transaction_type = 'bet_placed' 
ORDER BY created_at DESC;

-- Check current user points
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52');

-- Calculate how much should be restored
-- We need to find all bet transactions and restore the betting points
WITH bet_transactions AS (
    SELECT 
        user_id,
        SUM(ABS(points_amount)) as total_bet_amount
    FROM point_transactions 
    WHERE transaction_type = 'bet_placed' 
    AND points_type = 'betting'
    GROUP BY user_id
)
UPDATE user_points 
SET 
    betting_points = betting_points + bt.total_bet_amount,
    total_points_spent = total_points_spent - bt.total_bet_amount,
    updated_at = NOW()
FROM bet_transactions bt
WHERE user_points.user_id = bt.user_id;

-- Check the result
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Betting points restored! Check the results above.';
END $$; 