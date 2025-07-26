-- Fix Redemption Status Update Function
-- Run this in Supabase SQL Editor

-- Drop the function if it exists
DROP FUNCTION IF EXISTS update_redemption_status(UUID, TEXT);

-- Create the update_redemption_status function
CREATE OR REPLACE FUNCTION update_redemption_status(
    redemption_uuid UUID,
    new_status TEXT
) RETURNS JSON AS $$
DECLARE
    redemption_record RECORD;
    prize_record RECORD;
    result JSON;
BEGIN
    -- Get redemption details
    SELECT * INTO redemption_record FROM prize_redemptions WHERE id = redemption_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Redemption not found');
    END IF;
    
    -- Validate status
    IF new_status NOT IN ('pending', 'approved', 'rejected', 'completed') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid status');
    END IF;
    
    -- Get prize details
    SELECT * INTO prize_record FROM prizes WHERE id = redemption_record.prize_id;
    
    -- Start transaction
    BEGIN
        -- Update redemption status
        UPDATE prize_redemptions 
        SET status = new_status,
            updated_at = NOW()
        WHERE id = redemption_uuid;
        
        -- If rejecting, refund points and restore stock
        IF new_status = 'rejected' THEN
            -- Refund points to user
            INSERT INTO stream_points (user_id, points, transaction_type, description)
            VALUES (redemption_record.user_id, redemption_record.points_spent, 'prize_refund', 
                    'Refund for rejected: ' || prize_record.name);
            
            -- Restore prize stock
            UPDATE prizes 
            SET stock_quantity = stock_quantity + 1,
                total_redemptions = total_redemptions - 1
            WHERE id = redemption_record.prize_id;
        END IF;
        
        -- Return success
        result := json_build_object(
            'success', true,
            'message', 'Redemption status updated successfully',
            'redemption_id', redemption_uuid,
            'new_status', new_status
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback on error
        RAISE EXCEPTION 'Error updating redemption status: %', SQLERRM;
    END;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_redemption_status(UUID, TEXT) TO authenticated;

-- Success message
SELECT '✅ Redemption status update function created successfully!' as status; 