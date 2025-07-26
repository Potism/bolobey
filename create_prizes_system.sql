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