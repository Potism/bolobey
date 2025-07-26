# 🚀 Copy-Paste Database Setup Guide

## 📋 **Step 1: Basic Prizes System**

### **1. Open Supabase Dashboard**

- Go to your Supabase project
- Click **"SQL Editor"** in left sidebar
- Click **"New Query"**
- Name it: **"Setup Basic Prizes System"**

### **2. Copy This Entire Content:**

```sql
-- Create prizes system tables for V2.6
-- Run this in Supabase SQL Editor

-- 1. Prizes Table
CREATE TABLE prizes (
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

-- 2. Prize Redemptions Table
CREATE TABLE prize_redemptions (
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

-- 3. Create indexes for better performance
CREATE INDEX idx_prizes_category ON prizes(category);
CREATE INDEX idx_prizes_featured ON prizes(is_featured);
CREATE INDEX idx_prizes_active ON prizes(is_active);
CREATE INDEX idx_prizes_points_cost ON prizes(points_cost);

CREATE INDEX idx_prize_redemptions_user_id ON prize_redemptions(user_id);
CREATE INDEX idx_prize_redemptions_prize_id ON prize_redemptions(prize_id);
CREATE INDEX idx_prize_redemptions_status ON prize_redemptions(status);
CREATE INDEX idx_prize_redemptions_created_at ON prize_redemptions(created_at);

-- 4. Enable Row Level Security
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_redemptions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies

-- Prizes Policies
-- Anyone can read active prizes
CREATE POLICY "Anyone can read active prizes" ON prizes
  FOR SELECT USING (is_active = true);

-- Only admins can create/update prizes
CREATE POLICY "Only admins can create prizes" ON prizes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update prizes" ON prizes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Prize Redemptions Policies
-- Users can read their own redemptions
CREATE POLICY "Users can read their own redemptions" ON prize_redemptions
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own redemptions
CREATE POLICY "Users can create their own redemptions" ON prize_redemptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Only admins can update redemptions (for status changes)
CREATE POLICY "Only admins can update redemptions" ON prize_redemptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 6. Create functions for common operations

-- Function to redeem a prize
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

-- Function to get user's redemption history
CREATE OR REPLACE FUNCTION get_user_redemptions(user_uuid UUID)
RETURNS TABLE(
  redemption_id UUID,
  prize_name TEXT,
  points_spent INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    p.name,
    pr.points_spent,
    pr.status,
    pr.created_at
  FROM prize_redemptions pr
  JOIN prizes p ON pr.prize_id = p.id
  WHERE pr.user_id = user_uuid
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE prizes;
ALTER PUBLICATION supabase_realtime ADD TABLE prize_redemptions;

-- 8. Create views for easier querying

-- View for prizes with redemption counts
CREATE VIEW prizes_with_stats AS
SELECT
  p.*,
  COUNT(pr.id) as total_redemptions,
  COUNT(CASE WHEN pr.status = 'delivered' THEN 1 END) as delivered_count
FROM prizes p
LEFT JOIN prize_redemptions pr ON p.id = pr.prize_id
GROUP BY p.id;

-- View for user redemption history with prize details
CREATE VIEW user_redemption_history AS
SELECT
  pr.id,
  pr.user_id,
  pr.prize_id,
  pr.points_spent,
  pr.status,
  pr.created_at,
  p.name as prize_name,
  p.description as prize_description,
  p.category as prize_category
FROM prize_redemptions pr
JOIN prizes p ON pr.prize_id = p.id;

-- 9. Insert sample prizes
INSERT INTO prizes (name, description, points_cost, category, stock_quantity, is_featured) VALUES
('Beyblade Burst Pro Series', 'Limited edition Beyblade with custom launcher', 500, 'gaming', 10, true),
('Gaming Headset', 'High-quality wireless gaming headset', 1000, 'electronics', 5, true),
('Tournament T-Shirt', 'Exclusive tournament participant t-shirt', 200, 'clothing', 50, false),
('Beyblade Stadium', 'Official tournament-grade stadium', 800, 'gaming', 8, true),
('Gaming Mouse', 'Precision gaming mouse with RGB', 750, 'electronics', 12, false),
('Collector Pin Set', 'Limited edition tournament pins', 150, 'collectibles', 25, false),
('Gaming Keyboard', 'Mechanical gaming keyboard', 1200, 'electronics', 3, true),
('Hoodie', 'Comfortable tournament hoodie', 400, 'clothing', 20, false),
('Beyblade Parts Kit', 'Custom parts for building', 300, 'gaming', 15, false),
('Gaming Chair', 'Ergonomic gaming chair', 2000, 'electronics', 2, true);

-- 10. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prizes_updated_at
  BEFORE UPDATE ON prizes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prize_redemptions_updated_at
  BEFORE UPDATE ON prize_redemptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Create admin functions for prize management

-- Function to add new prize (admin only)
CREATE OR REPLACE FUNCTION add_prize(
  prize_name TEXT,
  prize_description TEXT,
  points_cost INTEGER,
  prize_category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  prize_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can add prizes';
  END IF;

  INSERT INTO prizes (name, description, points_cost, category, stock_quantity, is_featured)
  VALUES (prize_name, prize_description, points_cost, prize_category, stock_quantity, is_featured)
  RETURNING id INTO prize_id;

  RETURN prize_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update redemption status (admin only)
CREATE OR REPLACE FUNCTION update_redemption_status(
  redemption_uuid UUID,
  new_status TEXT,
  admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update redemption status';
  END IF;

  UPDATE prize_redemptions
  SET status = new_status,
      admin_notes = COALESCE(admin_notes, admin_notes),
      updated_at = NOW()
  WHERE id = redemption_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create notification system for prize redemptions

-- Function to notify admin of new redemption
CREATE OR REPLACE FUNCTION notify_admin_of_redemption()
RETURNS TRIGGER AS $$
BEGIN
  -- This could be extended to send emails or push notifications
  -- For now, we'll just log it
  RAISE NOTICE 'New prize redemption: User % redeemed prize % for % points',
    NEW.user_id, NEW.prize_id, NEW.points_spent;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_admin_redemption
  AFTER INSERT ON prize_redemptions
  FOR EACH ROW EXECUTE FUNCTION notify_admin_of_redemption();

-- 13. Create analytics functions

-- Function to get prize popularity stats
CREATE OR REPLACE FUNCTION get_prize_popularity_stats()
RETURNS TABLE(
  prize_name TEXT,
  total_redemptions INTEGER,
  total_points_spent INTEGER,
  average_points_per_redemption DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.name,
    COUNT(pr.id) as total_redemptions,
    COALESCE(SUM(pr.points_spent), 0) as total_points_spent,
    COALESCE(AVG(pr.points_spent), 0) as average_points_per_redemption
  FROM prizes p
  LEFT JOIN prize_redemptions pr ON p.id = pr.prize_id
  GROUP BY p.id, p.name
  ORDER BY total_redemptions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user spending stats
CREATE OR REPLACE FUNCTION get_user_spending_stats(user_uuid UUID)
RETURNS TABLE(
  total_redemptions INTEGER,
  total_points_spent INTEGER,
  favorite_category TEXT,
  last_redemption_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(pr.id) as total_redemptions,
    COALESCE(SUM(pr.points_spent), 0) as total_points_spent,
    p.category as favorite_category,
    MAX(pr.created_at) as last_redemption_date
  FROM prize_redemptions pr
  JOIN prizes p ON pr.prize_id = p.id
  WHERE pr.user_id = user_uuid
  GROUP BY p.category
  ORDER BY COUNT(pr.id) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create indexes for analytics queries
CREATE INDEX idx_prize_redemptions_user_status ON prize_redemptions(user_id, status);
CREATE INDEX idx_prize_redemptions_created_status ON prize_redemptions(created_at, status);
CREATE INDEX idx_prizes_category_featured ON prizes(category, is_featured);

-- 15. Add comments for documentation
COMMENT ON TABLE prizes IS 'Catalog of prizes available for redemption with stream points';
COMMENT ON TABLE prize_redemptions IS 'Records of user prize redemptions and their status';
COMMENT ON FUNCTION redeem_prize IS 'Processes a prize redemption, deducts points, and updates stock';
COMMENT ON FUNCTION get_user_redemptions IS 'Returns a user''s redemption history';
COMMENT ON FUNCTION add_prize IS 'Admin function to add new prizes to the catalog';
COMMENT ON FUNCTION update_redemption_status IS 'Admin function to update redemption status and add notes';

-- 16. Grant necessary permissions
GRANT SELECT ON prizes TO authenticated;
GRANT SELECT ON prize_redemptions TO authenticated;
GRANT INSERT ON prize_redemptions TO authenticated;
GRANT SELECT ON prizes_with_stats TO authenticated;
GRANT SELECT ON user_redemption_history TO authenticated;

-- Admin permissions
GRANT ALL ON prizes TO authenticated;
GRANT ALL ON prize_redemptions TO authenticated;

-- 17. Create a function to get available prizes for a user
CREATE OR REPLACE FUNCTION get_available_prizes_for_user(user_uuid UUID)
RETURNS TABLE(
  prize_id UUID,
  prize_name TEXT,
  description TEXT,
  points_cost INTEGER,
  category TEXT,
  stock_quantity INTEGER,
  is_featured BOOLEAN,
  can_afford BOOLEAN
) AS $$
DECLARE
  user_points INTEGER;
BEGIN
  user_points := get_user_points_balance(user_uuid);

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.points_cost,
    p.category,
    p.stock_quantity,
    p.is_featured,
    (p.points_cost <= user_points) as can_afford
  FROM prizes p
  WHERE p.is_active = true AND p.stock_quantity > 0
  ORDER BY p.is_featured DESC, p.points_cost ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create a function to get redemption analytics for admins
CREATE OR REPLACE FUNCTION get_redemption_analytics()
RETURNS TABLE(
  total_redemptions INTEGER,
  total_points_spent INTEGER,
  pending_redemptions INTEGER,
  delivered_redemptions INTEGER,
  average_points_per_redemption DECIMAL,
  most_popular_category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(pr.id) as total_redemptions,
    COALESCE(SUM(pr.points_spent), 0) as total_points_spent,
    COUNT(CASE WHEN pr.status = 'pending' THEN 1 END) as pending_redemptions,
    COUNT(CASE WHEN pr.status = 'delivered' THEN 1 END) as delivered_redemptions,
    COALESCE(AVG(pr.points_spent), 0) as average_points_per_redemption,
    p.category as most_popular_category
  FROM prize_redemptions pr
  JOIN prizes p ON pr.prize_id = p.id
  GROUP BY p.category
  ORDER BY COUNT(pr.id) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Create a function to get low stock alerts
CREATE OR REPLACE FUNCTION get_low_stock_alerts(threshold INTEGER DEFAULT 5)
RETURNS TABLE(
  prize_id UUID,
  prize_name TEXT,
  current_stock INTEGER,
  total_redemptions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.stock_quantity,
    COUNT(pr.id) as total_redemptions
  FROM prizes p
  LEFT JOIN prize_redemptions pr ON p.id = pr.prize_id
  WHERE p.stock_quantity <= threshold AND p.is_active = true
  GROUP BY p.id, p.name, p.stock_quantity
  ORDER BY p.stock_quantity ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Final setup complete message
DO $$
BEGIN
  RAISE NOTICE 'Prizes system setup complete!';
  RAISE NOTICE 'Sample prizes have been added to the catalog.';
  RAISE NOTICE 'Users can now redeem prizes with their stream points.';
  RAISE NOTICE 'Admins can manage prizes and redemption status.';
END $$;
```

### **3. Click "Run"**

- Click the **"Run"** button or press **Ctrl+Enter**
- Wait for completion (should take 10-30 seconds)
- You should see success messages

---

## 📋 **Step 2: Enhanced Features**

### **1. Create New Query**

- Click **"New Query"** again
- Name it: **"Setup Enhanced Features"**

### **2. Copy This Content:**

```sql
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
```

### **3. Click "Run"**

- Click the **"Run"** button
- Wait for completion
- You should see success messages

---

## ✅ **Success Indicators**

After running both scripts, you should see:

### **Database Success:**

- ✅ No errors in Supabase SQL Editor
- ✅ Tables created: `prizes`, `prize_redemptions`, `prize_notifications`, `prize_wishlist`
- ✅ Functions created and working
- ✅ Sample prizes inserted (10 items)

### **Frontend Success:**

- ✅ `/prizes` page loads without errors
- ✅ Prize catalog displays correctly
- ✅ Filtering and search work
- ✅ Admin dashboard accessible

---

## 🎯 **Next Steps After Database Setup**

1. **Test the System** - Visit `/prizes` in your app
2. **Browse Prizes** - See all 10 sample prizes
3. **Test Filtering** - Try category and search filters
4. **Admin Access** - Log in as admin to manage prizes

---

**Ready to run! Copy and paste the SQL scripts in Supabase! 🚀**
