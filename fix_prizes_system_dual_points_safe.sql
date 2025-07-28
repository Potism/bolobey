-- Fix Prizes System for Dual-Point System (Safe Version)
-- Run this in Supabase SQL Editor

-- 1. Ensure prizes table exists
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

-- 2. Ensure prize_redemptions table exists
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

-- 3. Create function to redeem prizes using the new dual-point system
CREATE OR REPLACE FUNCTION redeem_prize_dual_points(
    prize_uuid UUID,
    user_uuid UUID
) RETURNS JSON AS $$
DECLARE
    prize_record RECORD;
    user_stream_points INTEGER;
    redemption_id UUID;
    result JSON;
BEGIN
    -- Get prize details
    SELECT * INTO prize_record FROM prizes WHERE id = prize_uuid AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Prize not found or inactive');
    END IF;
    
    -- Check stock
    IF prize_record.stock_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Prize is out of stock');
    END IF;
    
    -- Get user's stream points
    SELECT stream_points INTO user_stream_points 
    FROM user_points 
    WHERE user_id = user_uuid;
    
    IF user_stream_points IS NULL THEN
        user_stream_points := 0;
    END IF;
    
    -- Check if user has enough stream points
    IF user_stream_points < prize_record.points_cost THEN
        RETURN json_build_object(
            'success', false, 
            'message', format('Insufficient stream points. You have %s, need %s', user_stream_points, prize_record.points_cost)
        );
    END IF;
    
    -- Create redemption record
    INSERT INTO prize_redemptions (user_id, prize_id, points_spent, status)
    VALUES (user_uuid, prize_uuid, prize_record.points_cost, 'pending')
    RETURNING id INTO redemption_id;
    
    -- Deduct stream points from user_points table
    UPDATE user_points 
    SET stream_points = stream_points - prize_record.points_cost,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Record transaction in point_transactions table
    INSERT INTO point_transactions (
        user_id, 
        transaction_type, 
        points_amount, 
        points_type,
        balance_before,
        balance_after,
        reference_id, 
        reference_type, 
        description
    ) VALUES (
        user_uuid, 
        'stream_points_redeemed', 
        -prize_record.points_cost, 
        'stream',
        user_stream_points,
        user_stream_points - prize_record.points_cost,
        redemption_id, 
        'redemption', 
        'Redeemed ' || prize_record.name
    );
    
    -- Update prize stock
    UPDATE prizes 
    SET stock_quantity = stock_quantity - 1,
        updated_at = NOW()
    WHERE id = prize_uuid;
    
    -- Create notification (if user_notifications table exists)
    BEGIN
        INSERT INTO user_notifications (user_id, type, title, message, data, priority)
        VALUES (
            user_uuid,
            'prize_redemption',
            '🎁 Prize Redemption Successful!',
            format('You successfully redeemed %s for %s stream points!', prize_record.name, prize_record.points_cost),
            jsonb_build_object(
                'prize_name', prize_record.name,
                'points_spent', prize_record.points_cost,
                'redemption_id', redemption_id,
                'timestamp', NOW()
            ),
            'normal'
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- user_notifications table doesn't exist, skip notification
            NULL;
    END;
    
    result := json_build_object(
        'success', true,
        'message', format('Successfully redeemed %s!', prize_record.name),
        'redemption_id', redemption_id,
        'points_spent', prize_record.points_cost,
        'remaining_points', user_stream_points - prize_record.points_cost
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get user's redemption history
CREATE OR REPLACE FUNCTION get_user_redemptions_dual_points(user_uuid UUID)
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

-- 5. Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_prizes_category ON prizes(category);
CREATE INDEX IF NOT EXISTS idx_prizes_featured ON prizes(is_featured);
CREATE INDEX IF NOT EXISTS idx_prizes_active ON prizes(is_active);
CREATE INDEX IF NOT EXISTS idx_prizes_points_cost ON prizes(points_cost);

CREATE INDEX IF NOT EXISTS idx_prize_redemptions_user_id ON prize_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_prize_id ON prize_redemptions(prize_id);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_status ON prize_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_prize_redemptions_created_at ON prize_redemptions(created_at);

-- 6. Enable Row Level Security
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_redemptions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies (only if they don't exist)
DO $$
BEGIN
    -- Prizes Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prizes' 
        AND policyname = 'Anyone can read active prizes'
    ) THEN
        CREATE POLICY "Anyone can read active prizes" ON prizes
        FOR SELECT USING (is_active = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prizes' 
        AND policyname = 'Admins can manage prizes'
    ) THEN
        CREATE POLICY "Admins can manage prizes" ON prizes
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    END IF;

    -- Prize Redemptions Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prize_redemptions' 
        AND policyname = 'Users can read their own redemptions'
    ) THEN
        CREATE POLICY "Users can read their own redemptions" ON prize_redemptions
        FOR SELECT USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prize_redemptions' 
        AND policyname = 'Users can create their own redemptions'
    ) THEN
        CREATE POLICY "Users can create their own redemptions" ON prize_redemptions
        FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prize_redemptions' 
        AND policyname = 'Admins can manage all redemptions'
    ) THEN
        CREATE POLICY "Admins can manage all redemptions" ON prize_redemptions
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
END $$;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION redeem_prize_dual_points(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_redemptions_dual_points(UUID) TO authenticated;

-- 9. Insert sample prizes if table is empty
INSERT INTO prizes (name, description, points_cost, category, stock_quantity, is_featured)
SELECT * FROM (VALUES
    ('Gaming Mouse', 'High-performance gaming mouse with RGB lighting', 500, 'gaming', 10, true),
    ('Gaming Headset', 'Wireless gaming headset with noise cancellation', 750, 'gaming', 8, true),
    ('Gaming Keyboard', 'Mechanical gaming keyboard with customizable keys', 1000, 'gaming', 5, true),
    ('Gaming Chair', 'Ergonomic gaming chair with lumbar support', 2500, 'gaming', 3, false),
    ('Gaming Monitor', '27-inch 144Hz gaming monitor', 5000, 'electronics', 2, false),
    ('Gaming Laptop', 'High-end gaming laptop with RTX graphics', 15000, 'electronics', 1, true),
    ('Bolobey T-Shirt', 'Official Bolobey tournament t-shirt', 200, 'clothing', 50, false),
    ('Bolobey Hoodie', 'Comfortable Bolobey branded hoodie', 400, 'clothing', 25, false),
    ('Gaming Mousepad', 'Large RGB gaming mousepad', 150, 'accessories', 30, false),
    ('Gaming Controller', 'Wireless gaming controller', 300, 'gaming', 15, false)
) AS v(name, description, points_cost, category, stock_quantity, is_featured)
WHERE NOT EXISTS (SELECT 1 FROM prizes);

-- 10. Enable realtime for these tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'prizes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prizes;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'prize_redemptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prize_redemptions;
  END IF;
END $$;

-- 11. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Prizes system updated for dual-point system!';
  RAISE NOTICE '🎁 Prizes now use stream_points from user_points table';
  RAISE NOTICE '💰 Redemptions are tracked in point_transactions table';
  RAISE NOTICE '📦 Sample prizes added to catalog';
  RAISE NOTICE '🚀 Ready to use!';
END $$; 