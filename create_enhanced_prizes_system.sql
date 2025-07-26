-- Enhanced Prizes System with Notifications and Wishlist
-- Run this AFTER the basic prizes system is set up

-- 1. Prize Notifications Table
CREATE TABLE IF NOT EXISTS prize_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('redemption', 'status_update', 'low_stock', 'new_prize', 'wishlist_available')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Prize Wishlist Table
CREATE TABLE IF NOT EXISTS prize_wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_id UUID NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, prize_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prize_notifications_user_id ON prize_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_read ON prize_notifications(read);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_created_at ON prize_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_prize_wishlist_user_id ON prize_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_wishlist_prize_id ON prize_wishlist(prize_id);

-- 4. Enable Row Level Security
ALTER TABLE prize_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_wishlist ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies

-- Prize Notifications Policies
CREATE POLICY "Users can read their own notifications" ON prize_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON prize_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Prize Wishlist Policies
CREATE POLICY "Users can read their own wishlist" ON prize_wishlist
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wishlist items" ON prize_wishlist
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own wishlist items" ON prize_wishlist
  FOR DELETE USING (user_id = auth.uid());

-- 6. Create functions for enhanced features

-- Function to add notification
CREATE OR REPLACE FUNCTION add_prize_notification(
  user_uuid UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO prize_notifications (
    user_id, 
    type, 
    title, 
    message, 
    data
  )
  VALUES (
    user_uuid,
    notification_type,
    notification_title,
    notification_message,
    notification_data
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE prize_notifications 
  SET read = true 
  WHERE id = notification_uuid AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add to wishlist
CREATE OR REPLACE FUNCTION add_to_wishlist(prize_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO prize_wishlist (user_id, prize_id)
  VALUES (auth.uid(), prize_uuid)
  ON CONFLICT (user_id, prize_id) DO NOTHING;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove from wishlist
CREATE OR REPLACE FUNCTION remove_from_wishlist(prize_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM prize_wishlist 
  WHERE user_id = auth.uid() AND prize_id = prize_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if prize is in wishlist
CREATE OR REPLACE FUNCTION is_in_wishlist(prize_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM prize_wishlist 
    WHERE user_id = auth.uid() AND prize_id = prize_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enhanced redemption function with notifications
CREATE OR REPLACE FUNCTION redeem_prize_with_notification(
  prize_uuid UUID,
  user_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  redemption_id UUID;
  prize_record RECORD;
  user_points INTEGER;
BEGIN
  -- Get prize details
  SELECT * INTO prize_record FROM prizes WHERE id = prize_uuid AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prize not found or inactive';
  END IF;
  
  -- Check stock
  IF prize_record.stock_quantity <= 0 THEN
    RAISE EXCEPTION 'Prize is out of stock';
  END IF;
  
  -- Check user points
  user_points := get_user_points_balance(user_uuid);
  
  IF user_points < prize_record.points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You have % points, need % points', user_points, prize_record.points_cost;
  END IF;
  
  -- Create redemption record
  INSERT INTO prize_redemptions (user_id, prize_id, points_spent, status)
  VALUES (user_uuid, prize_uuid, prize_record.points_cost, 'pending')
  RETURNING id INTO redemption_id;
  
  -- Deduct points from user
  INSERT INTO stream_points (user_id, points, transaction_type, description, reference_id, reference_type)
  VALUES (user_uuid, -prize_record.points_cost, 'prize_redemption', 'Redeemed ' || prize_record.name, redemption_id, 'redemption');
  
  -- Update prize stock
  UPDATE prizes 
  SET stock_quantity = stock_quantity - 1,
      updated_at = NOW()
  WHERE id = prize_uuid;
  
  -- Add notification
  PERFORM add_prize_notification(
    user_uuid,
    'redemption',
    'Prize Redemption Successful!',
    'You successfully redeemed ' || prize_record.name || ' for ' || prize_record.points_cost || ' points.',
    jsonb_build_object('redemption_id', redemption_id, 'prize_name', prize_record.name)
  );
  
  -- Check if prize is now low stock and notify wishlist users
  IF prize_record.stock_quantity <= 5 THEN
    PERFORM add_prize_notification(
      w.user_id,
      'low_stock',
      'Prize Low Stock Alert',
      prize_record.name || ' is running low on stock! Only ' || (prize_record.stock_quantity - 1) || ' left.',
      jsonb_build_object('prize_id', prize_uuid, 'prize_name', prize_record.name, 'stock_left', prize_record.stock_quantity - 1)
    )
    FROM prize_wishlist w
    WHERE w.prize_id = prize_uuid AND w.user_id != user_uuid;
  END IF;
  
  RETURN redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get user's wishlist with prize details
CREATE OR REPLACE FUNCTION get_user_wishlist(user_uuid UUID)
RETURNS TABLE(
  wishlist_id UUID,
  prize_id UUID,
  prize_name TEXT,
  description TEXT,
  points_cost INTEGER,
  category TEXT,
  image_url TEXT,
  stock_quantity INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    p.id,
    p.name,
    p.description,
    p.points_cost,
    p.category,
    p.image_url,
    p.stock_quantity,
    p.is_featured,
    w.created_at
  FROM prize_wishlist w
  JOIN prizes p ON w.prize_id = p.id
  WHERE w.user_id = user_uuid AND p.is_active = true
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM prize_notifications 
    WHERE user_id = user_uuid AND read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE prize_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE prize_wishlist;

-- 11. Create triggers for automatic notifications

-- Trigger to notify when prize stock becomes available
CREATE OR REPLACE FUNCTION notify_wishlist_stock_available()
RETURNS TRIGGER AS $$
BEGIN
  -- If stock went from 0 to > 0, notify wishlist users
  IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
    PERFORM add_prize_notification(
      w.user_id,
      'wishlist_available',
      'Prize Back in Stock!',
      NEW.name || ' is back in stock! You can now redeem it.',
      jsonb_build_object('prize_id', NEW.id, 'prize_name', NEW.name, 'stock_available', NEW.stock_quantity)
    )
    FROM prize_wishlist w
    WHERE w.prize_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_wishlist_stock_available_trigger
  AFTER UPDATE ON prizes
  FOR EACH ROW EXECUTE FUNCTION notify_wishlist_stock_available();

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE ON prize_notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON prize_wishlist TO authenticated;

-- 13. Create views for easier querying

-- View for wishlist with availability status
CREATE VIEW wishlist_with_availability AS
SELECT 
  w.id as wishlist_id,
  w.user_id,
  w.created_at as added_to_wishlist,
  p.*,
  CASE 
    WHEN p.stock_quantity > 0 THEN 'available'
    ELSE 'out_of_stock'
  END as availability_status
FROM prize_wishlist w
JOIN prizes p ON w.prize_id = p.id
WHERE p.is_active = true;

-- View for notifications summary
CREATE VIEW notifications_summary AS
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN read = false THEN 1 END) as unread_count,
  MAX(created_at) as latest_notification
FROM prize_notifications
GROUP BY user_id;

-- 14. Add comments for documentation
COMMENT ON TABLE prize_notifications IS 'User notifications for prize-related activities';
COMMENT ON TABLE prize_wishlist IS 'User wishlist of prizes they want to redeem';
COMMENT ON FUNCTION add_prize_notification IS 'Adds a new notification for a user';
COMMENT ON FUNCTION add_to_wishlist IS 'Adds a prize to user wishlist';
COMMENT ON FUNCTION remove_from_wishlist IS 'Removes a prize from user wishlist';
COMMENT ON FUNCTION redeem_prize_with_notification IS 'Enhanced redemption with automatic notifications';

-- 15. Final setup message
DO $$
BEGIN
  RAISE NOTICE 'Enhanced prizes system setup complete!';
  RAISE NOTICE 'Added notifications and wishlist features.';
  RAISE NOTICE 'Users can now save prizes to wishlist and receive notifications.';
END $$; 