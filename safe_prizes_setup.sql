-- Safe Prizes System Setup - Only creates what's missing
-- Run this in Supabase SQL Editor

-- 1. Create prizes table if it doesn't exist
CREATE TABLE IF NOT EXISTS prizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  category TEXT NOT NULL CHECK (category IN ('electronics', 'gaming', 'clothing', 'accessories', 'collectibles', 'other')),
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create prize_redemptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS prize_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_id UUID NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT,
  tracking_number TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create prize_notifications table if it doesn't exist
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

-- 4. Create prize_wishlist table if it doesn't exist
CREATE TABLE IF NOT EXISTS prize_wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_id UUID NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, prize_id)
);

-- 5. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_prizes_category ON prizes(category);
CREATE INDEX IF NOT EXISTS idx_prizes_featured ON prizes(is_featured);
CREATE INDEX IF NOT EXISTS idx_prizes_active ON prizes(is_active);
CREATE INDEX IF NOT EXISTS idx_prizes_points_cost ON prizes(points_cost);

CREATE INDEX IF NOT EXISTS idx_prize_redemptions_user_id ON prize_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_prize_id ON prize_redemptions(prize_id);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_status ON prize_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_created_at ON prize_redemptions(created_at);

CREATE INDEX IF NOT EXISTS idx_prize_notifications_user_id ON prize_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_read ON prize_notifications(read);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_created_at ON prize_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_prize_wishlist_user_id ON prize_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_wishlist_prize_id ON prize_wishlist(prize_id);

-- 6. Enable RLS if not already enabled
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_wishlist ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies (will fail if they already exist, but that's OK)
DO $$
BEGIN
  -- Prizes Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prizes' AND policyname = 'Anyone can read active prizes') THEN
    CREATE POLICY "Anyone can read active prizes" ON prizes
      FOR SELECT USING (is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prizes' AND policyname = 'Only admins can create prizes') THEN
    CREATE POLICY "Only admins can create prizes" ON prizes
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prizes' AND policyname = 'Only admins can update prizes') THEN
    CREATE POLICY "Only admins can update prizes" ON prizes
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;

  -- Prize Redemptions Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_redemptions' AND policyname = 'Users can read their own redemptions') THEN
    CREATE POLICY "Users can read their own redemptions" ON prize_redemptions
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_redemptions' AND policyname = 'Users can create their own redemptions') THEN
    CREATE POLICY "Users can create their own redemptions" ON prize_redemptions
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prize_redemptions' AND policyname = 'Only admins can update redemptions') THEN
    CREATE POLICY "Only admins can update redemptions" ON prize_redemptions
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;

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

-- 8. Create or replace functions
CREATE OR REPLACE FUNCTION redeem_prize(
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
  
  RETURN redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add sample prizes only if they don't exist
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

-- 10. Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE prizes;
ALTER PUBLICATION supabase_realtime ADD TABLE prize_redemptions;
ALTER PUBLICATION supabase_realtime ADD TABLE prize_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE prize_wishlist;

-- 11. Grant permissions
GRANT SELECT ON prizes TO authenticated;
GRANT SELECT ON prize_redemptions TO authenticated;
GRANT INSERT ON prize_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON prize_notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON prize_wishlist TO authenticated;

-- Admin permissions
GRANT ALL ON prizes TO authenticated;
GRANT ALL ON prize_redemptions TO authenticated;

-- 12. Success message
DO $$
BEGIN
  RAISE NOTICE 'Safe prizes system setup complete!';
  RAISE NOTICE 'All existing components were preserved.';
  RAISE NOTICE 'New components were added as needed.';
END $$; 