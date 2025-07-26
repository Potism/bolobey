-- Minimal Prizes System Setup - Only adds what's missing
-- Run this in Supabase SQL Editor

-- 1. Create missing tables (only if they don't exist)
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

CREATE TABLE IF NOT EXISTS prize_wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_id UUID NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, prize_id)
);

-- 2. Create missing indexes
CREATE INDEX IF NOT EXISTS idx_prize_notifications_user_id ON prize_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_read ON prize_notifications(read);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_created_at ON prize_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_prize_wishlist_user_id ON prize_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_wishlist_prize_id ON prize_wishlist(prize_id);

-- 3. Enable RLS for new tables
ALTER TABLE prize_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_wishlist ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for new tables
DO $$
BEGIN
  -- Prize Notifications Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_notifications' AND policyname = 'Users can read their own notifications') THEN
    CREATE POLICY "Users can read their own notifications" ON prize_notifications
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_notifications' AND policyname = 'Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications" ON prize_notifications
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- Prize Wishlist Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_wishlist' AND policyname = 'Users can read their own wishlist') THEN
    CREATE POLICY "Users can read their own wishlist" ON prize_wishlist
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_wishlist' AND policyname = 'Users can insert their own wishlist items') THEN
    CREATE POLICY "Users can insert their own wishlist items" ON prize_wishlist
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_wishlist' AND policyname = 'Users can delete their own wishlist items') THEN
    CREATE POLICY "Users can delete their own wishlist items" ON prize_wishlist
      FOR DELETE USING (user_id = auth.uid());
  END IF;

END $$;

-- 5. Create enhanced functions
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

CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE prize_notifications 
  SET read = true 
  WHERE id = notification_uuid AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_to_wishlist(prize_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO prize_wishlist (user_id, prize_id)
  VALUES (auth.uid(), prize_uuid)
  ON CONFLICT (user_id, prize_id) DO NOTHING;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_from_wishlist(prize_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM prize_wishlist 
  WHERE user_id = auth.uid() AND prize_id = prize_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_in_wishlist(prize_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM prize_wishlist 
    WHERE user_id = auth.uid() AND prize_id = prize_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add sample prizes only if they don't exist
INSERT INTO prizes (name, description, points_cost, category, stock_quantity, is_featured)
SELECT * FROM (VALUES
  ('Beyblade Burst Pro Series', 'Limited edition Beyblade with custom launcher', 500, 'gaming', 10, true),
  ('Gaming Headset', 'High-quality wireless gaming headset', 1000, 'electronics', 5, true),
  ('Tournament T-Shirt', 'Exclusive tournament participant t-shirt', 200, 'clothing', 50, false),
  ('Beyblade Stadium', 'Official tournament-grade stadium', 800, 'gaming', 8, true),
  ('Gaming Mouse', 'Precision gaming mouse with RGB', 750, 'electronics', 12, false),
  ('Collector Pin Set', 'Limited edition tournament pins', 150, 'collectibles', 25, false),
  ('Gaming Keyboard', 'Mechanical gaming keyboard', 1200, 'electronics', 3, true),
  ('Hoodie', 'Comfortable tournament hoodie', 400, 'clothing', 20, false),
  ('Beyblade Parts Kit', 'Custom parts for building', 300, 'gaming', 15, false),
  ('Gaming Chair', 'Ergonomic gaming chair', 2000, 'electronics', 2, true)
) AS v(name, description, points_cost, category, stock_quantity, is_featured)
WHERE NOT EXISTS (SELECT 1 FROM prizes WHERE prizes.name = v.name);

-- 7. Add new tables to realtime (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prize_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prize_notifications;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prize_wishlist') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prize_wishlist;
  END IF;
END $$;

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE ON prize_notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON prize_wishlist TO authenticated;

-- 9. Create views for easier querying
CREATE OR REPLACE VIEW wishlist_with_availability AS
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

CREATE OR REPLACE VIEW notifications_summary AS
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN read = false THEN 1 END) as unread_count,
  MAX(created_at) as latest_notification
FROM prize_notifications
GROUP BY user_id;

-- 10. Success message
DO $$
BEGIN
  RAISE NOTICE 'Minimal prizes system setup complete!';
  RAISE NOTICE 'Enhanced features (notifications, wishlist) have been added.';
  RAISE NOTICE 'Sample prizes have been added (if they were missing).';
END $$; 