-- Fix the missing add_betting_points function
-- This function was dropped by fix_all_conflicts_final.sql but is needed for purchasing points

-- Drop any existing conflicting versions
DROP FUNCTION IF EXISTS add_betting_points(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_betting_points(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_betting_points(UUID, INTEGER, TEXT, TEXT, TEXT) CASCADE;

-- Create the correct add_betting_points function for purchasing points
CREATE OR REPLACE FUNCTION add_betting_points(
    user_uuid UUID,
    points_amount INTEGER,
    transaction_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current betting points balance
    SELECT COALESCE(betting_points, 0) INTO current_balance
    FROM user_points
    WHERE user_id = user_uuid;
    
    -- If user doesn't have a record, create one
    IF current_balance IS NULL THEN
        INSERT INTO user_points (user_id, betting_points, total_betting_points_earned)
        VALUES (user_uuid, points_amount, points_amount);
        current_balance := 0;
        new_balance := points_amount;
    ELSE
        new_balance := current_balance + points_amount;
        -- Update user's betting points
        UPDATE user_points
        SET betting_points = new_balance,
            total_betting_points_earned = total_betting_points_earned + points_amount,
            updated_at = NOW()
        WHERE user_id = user_uuid;
    END IF;
    
    -- Record the transaction
    INSERT INTO point_transactions (
        user_id, transaction_type, points_amount, points_type,
        balance_before, balance_after, description
    ) VALUES (
        user_uuid, 'purchase_betting_points', points_amount, 'betting',
        current_balance, new_balance, transaction_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_betting_points(UUID, INTEGER, TEXT) TO authenticated;

-- Ensure point_packages table exists and has data
CREATE TABLE IF NOT EXISTS point_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    betting_points INTEGER NOT NULL CHECK (betting_points > 0),
    price_eur DECIMAL(10,2) NOT NULL CHECK (price_eur > 0),
    bonus_points INTEGER DEFAULT 0 CHECK (bonus_points >= 0),
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample point packages if they don't exist
INSERT INTO point_packages (name, betting_points, price_eur, bonus_points, is_featured)
SELECT * FROM (VALUES
    ('Starter Pack', 100, 5.00, 0, false),
    ('Popular Pack', 500, 20.00, 50, true),
    ('Pro Pack', 1000, 35.00, 150, false),
    ('Champion Pack', 2500, 75.00, 500, true),
    ('Elite Pack', 5000, 125.00, 1250, false),
    ('Legendary Pack', 10000, 200.00, 3000, true)
) AS v(name, betting_points, price_eur, bonus_points, is_featured)
WHERE NOT EXISTS (SELECT 1 FROM point_packages);

-- Ensure RLS policies exist
ALTER TABLE point_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Point packages are viewable by everyone" ON point_packages;
CREATE POLICY "Point packages are viewable by everyone" ON point_packages
    FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON point_packages TO authenticated, anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'add_betting_points function created successfully!';
    RAISE NOTICE 'Function signature: add_betting_points(user_uuid UUID, points_amount INTEGER, transaction_description TEXT)';
    RAISE NOTICE 'Point packages table created/updated with sample data!';
    RAISE NOTICE 'You can now purchase betting points!';
END $$; 