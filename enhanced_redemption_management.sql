-- Enhanced Redemption Management System
-- Run this in Supabase SQL Editor to add advanced redemption features

-- 1. Create enhanced redemption status update function
CREATE OR REPLACE FUNCTION update_redemption_status_enhanced(
  redemption_uuid UUID,
  new_status TEXT,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  redemption_record RECORD;
  user_record RECORD;
  prize_record RECORD;
  result JSON;
BEGIN
  -- Get redemption details
  SELECT pr.*, p.name as prize_name, p.points_cost, u.email as user_email, u.display_name as user_display_name
  INTO redemption_record
  FROM prize_redemptions pr
  JOIN prizes p ON pr.prize_id = p.id
  JOIN users u ON pr.user_id = u.id
  WHERE pr.id = redemption_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Redemption not found');
  END IF;

  -- Validate status transition
  IF redemption_record.status = 'delivered' AND new_status != 'delivered' THEN
    RETURN json_build_object('success', false, 'message', 'Cannot change status of delivered redemption');
  END IF;

  IF redemption_record.status = 'cancelled' AND new_status != 'cancelled' THEN
    RETURN json_build_object('success', false, 'message', 'Cannot change status of cancelled redemption');
  END IF;

  -- Update redemption status
  UPDATE prize_redemptions 
  SET 
    status = new_status,
    admin_notes = COALESCE(admin_notes, admin_notes),
    updated_at = NOW()
  WHERE id = redemption_uuid;

  -- Handle status-specific actions
  CASE new_status
    WHEN 'approved' THEN
      -- Send notification to user
      INSERT INTO user_notifications (user_id, title, message, type)
      VALUES (
        redemption_record.user_id,
        'Prize Redemption Approved! 🎉',
        'Your redemption for "' || redemption_record.prize_name || '" has been approved and is being processed.',
        'prize_approved'
      );
      
    WHEN 'shipped' THEN
      -- Send shipping notification
      INSERT INTO user_notifications (user_id, title, message, type)
      VALUES (
        redemption_record.user_id,
        'Prize Shipped! 📦',
        'Your "' || redemption_record.prize_name || '" has been shipped and is on its way to you.',
        'prize_shipped'
      );
      
    WHEN 'delivered' THEN
      -- Send delivery confirmation
      INSERT INTO user_notifications (user_id, title, message, type)
      VALUES (
        redemption_record.user_id,
        'Prize Delivered! 🎁',
        'Your "' || redemption_record.prize_name || '" has been delivered. Enjoy your prize!',
        'prize_delivered'
      );
      
    WHEN 'cancelled' THEN
      -- Refund stream points
      UPDATE user_points 
      SET stream_points = stream_points + redemption_record.points_spent
      WHERE user_id = redemption_record.user_id;
      
      -- Record refund transaction
      INSERT INTO point_transactions (
        user_id, 
        transaction_type, 
        amount, 
        description,
        related_id
      ) VALUES (
        redemption_record.user_id,
        'stream_points_refunded',
        redemption_record.points_spent,
        'Refund for cancelled redemption: ' || redemption_record.prize_name,
        redemption_uuid
      );
      
      -- Send cancellation notification
      INSERT INTO user_notifications (user_id, title, message, type)
      VALUES (
        redemption_record.user_id,
        'Redemption Cancelled',
        'Your redemption for "' || redemption_record.prize_name || '" has been cancelled. ' || 
        redemption_record.points_spent || ' stream points have been refunded to your account.',
        'prize_cancelled'
      );
      
    WHEN 'rejected' THEN
      -- Refund stream points
      UPDATE user_points 
      SET stream_points = stream_points + redemption_record.points_spent
      WHERE user_id = redemption_record.user_id;
      
      -- Record refund transaction
      INSERT INTO point_transactions (
        user_id, 
        transaction_type, 
        amount, 
        description,
        related_id
      ) VALUES (
        redemption_record.user_id,
        'stream_points_refunded',
        redemption_record.points_spent,
        'Refund for rejected redemption: ' || redemption_record.prize_name,
        redemption_uuid
      );
      
      -- Send rejection notification
      INSERT INTO user_notifications (user_id, title, message, type)
      VALUES (
        redemption_record.user_id,
        'Redemption Rejected',
        'Your redemption for "' || redemption_record.prize_name || '" has been rejected. ' || 
        redemption_record.points_spent || ' stream points have been refunded to your account.',
        'prize_rejected'
      );
  END CASE;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Redemption status updated successfully',
    'redemption_id', redemption_uuid,
    'new_status', new_status,
    'user_email', redemption_record.user_email,
    'prize_name', redemption_record.prize_name,
    'points_spent', redemption_record.points_spent
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error updating redemption status: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to get redemption details with user info
CREATE OR REPLACE FUNCTION get_redemption_details_admin(redemption_uuid UUID)
RETURNS TABLE(
  redemption_id UUID,
  user_id UUID,
  user_display_name TEXT,
  user_email TEXT,
  prize_id UUID,
  prize_name TEXT,
  prize_category TEXT,
  points_spent INTEGER,
  status TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.user_id,
    u.display_name,
    u.email,
    pr.prize_id,
    p.name,
    p.category,
    pr.points_spent,
    pr.status,
    pr.admin_notes,
    pr.created_at,
    pr.updated_at
  FROM prize_redemptions pr
  JOIN prizes p ON pr.prize_id = p.id
  JOIN users u ON pr.user_id = u.id
  WHERE pr.id = redemption_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to get redemption statistics
CREATE OR REPLACE FUNCTION get_redemption_stats_admin()
RETURNS TABLE(
  total_redemptions BIGINT,
  pending_redemptions BIGINT,
  approved_redemptions BIGINT,
  shipped_redemptions BIGINT,
  delivered_redemptions BIGINT,
  cancelled_redemptions BIGINT,
  total_points_spent BIGINT,
  avg_processing_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_redemptions,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_redemptions,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_redemptions,
    COUNT(*) FILTER (WHERE status = 'shipped') as shipped_redemptions,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_redemptions,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_redemptions,
    SUM(points_spent) as total_points_spent,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_processing_time_hours
  FROM prize_redemptions
  WHERE status IN ('delivered', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add admin_notes column to prize_redemptions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prize_redemptions' AND column_name = 'admin_notes') THEN
    ALTER TABLE prize_redemptions ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

-- 5. Add updated_at column to prize_redemptions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prize_redemptions' AND column_name = 'updated_at') THEN
    ALTER TABLE prize_redemptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 6. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_redemption_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_redemption_updated_at ON prize_redemptions;
CREATE TRIGGER trigger_update_redemption_updated_at
  BEFORE UPDATE ON prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION update_redemption_updated_at();

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION update_redemption_status_enhanced(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_redemption_details_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_redemption_stats_admin() TO authenticated;

-- 8. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Redemption Management System created!';
  RAISE NOTICE '🎯 New features:';
  RAISE NOTICE '   - Enhanced status updates with notifications';
  RAISE NOTICE '   - Automatic point refunds for cancellations/rejections';
  RAISE NOTICE '   - Admin notes support';
  RAISE NOTICE '   - Redemption statistics';
  RAISE NOTICE '   - Detailed redemption information';
  RAISE NOTICE '🚀 Ready to use!';
END $$; 