-- Fix Stream Points Constraint for Prize Redemption
-- Run this in Supabase SQL Editor

-- 1. First, let's see what transaction types are currently allowed
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'stream_points'::regclass 
AND contype = 'c';

-- 2. Drop the existing constraint
ALTER TABLE stream_points DROP CONSTRAINT IF EXISTS stream_points_transaction_type_check;

-- 3. Create a new constraint that includes prize redemption
ALTER TABLE stream_points ADD CONSTRAINT stream_points_transaction_type_check 
CHECK (transaction_type IN (
    'bet_placed', 
    'bet_won', 
    'bet_lost', 
    'tournament_join', 
    'tournament_win', 
    'admin_adjustment',
    'prize_redemption',  -- Add this for prize redemptions
    'prize_refund'       -- Add this for prize refunds
));

-- 4. Update the redeem_prize function to use the correct transaction type
CREATE OR REPLACE FUNCTION redeem_prize(
    prize_uuid UUID,
    user_uuid UUID
) RETURNS JSON AS $$
DECLARE
    prize_record RECORD;
    user_points INTEGER;
    result JSON;
BEGIN
    -- Get prize details
    SELECT * INTO prize_record FROM prizes WHERE id = prize_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Prize not found');
    END IF;
    
    -- Check if prize is active
    IF NOT prize_record.is_active THEN
        RETURN json_build_object('success', false, 'message', 'Prize is not available');
    END IF;
    
    -- Check stock
    IF prize_record.stock_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Prize is out of stock');
    END IF;
    
    -- Get user's current points
    SELECT COALESCE(SUM(points), 0) INTO user_points 
    FROM stream_points 
    WHERE user_id = user_uuid;
    
    -- Check if user has enough points
    IF user_points < prize_record.points_cost THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient points');
    END IF;
    
    -- Check if user already has a pending redemption for this prize
    IF EXISTS (
        SELECT 1 FROM prize_redemptions 
        WHERE user_id = user_uuid 
        AND prize_id = prize_uuid 
        AND status = 'pending'
    ) THEN
        RETURN json_build_object('success', false, 'message', 'You already have a pending redemption for this prize');
    END IF;
    
    -- Start transaction
    BEGIN
        -- Deduct points from user
        INSERT INTO stream_points (user_id, points, transaction_type, description)
        VALUES (user_uuid, -prize_record.points_cost, 'prize_redemption', 
                'Redeemed: ' || prize_record.name);
        
        -- Reduce prize stock
        UPDATE prizes 
        SET stock_quantity = stock_quantity - 1,
            total_redemptions = total_redemptions + 1
        WHERE id = prize_uuid;
        
        -- Create redemption record
        INSERT INTO prize_redemptions (user_id, prize_id, points_spent, status)
        VALUES (user_uuid, prize_uuid, prize_record.points_cost, 'pending');
        
        -- Return success
        result := json_build_object(
            'success', true,
            'message', 'Prize redeemed successfully! Awaiting admin approval.',
            'redemption_id', currval('prize_redemptions_id_seq'),
            'points_spent', prize_record.points_cost,
            'remaining_points', user_points - prize_record.points_cost
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback on error
        RAISE EXCEPTION 'Error redeeming prize: %', SQLERRM;
    END;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Stream points constraint updated successfully!';
    RAISE NOTICE '🎉 Prize redemption transactions are now allowed.';
    RAISE NOTICE '🔄 The redeem_prize function has been updated.';
END $$; 