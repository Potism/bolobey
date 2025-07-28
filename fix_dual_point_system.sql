-- Fix Dual-Point System - Drop existing functions first
-- Run this script to safely update the dual-point system

-- 1. Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_points_balance(UUID);
DROP FUNCTION IF EXISTS add_betting_points(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS spend_betting_points(UUID, INTEGER, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_stream_points(UUID, INTEGER, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS spend_stream_points(UUID, INTEGER, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS handle_new_user_points();

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_new_user_points ON users;

-- 3. Drop existing views if they exist
DROP VIEW IF EXISTS user_points_summary;
DROP VIEW IF EXISTS point_transaction_history;

-- 4. Drop existing tables if they exist (WARNING: This will delete all data!)
-- Uncomment the following lines if you want to start fresh:
-- DROP TABLE IF EXISTS point_transactions CASCADE;
-- DROP TABLE IF EXISTS user_points CASCADE;
-- DROP TABLE IF EXISTS point_packages CASCADE;

-- 5. Create tables (only if they don't exist)
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    total_betting_points_earned INTEGER DEFAULT 0,
    total_stream_points_earned INTEGER DEFAULT 0,
    total_points_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

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

CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'purchase_betting_points',
        'bet_placed',
        'bet_won',
        'bet_lost',
        'stream_points_earned',
        'stream_points_redeemed',
        'admin_adjustment',
        'tournament_entry_fee',
        'tournament_prize'
    )),
    points_amount INTEGER NOT NULL,
    points_type VARCHAR(20) NOT NULL CHECK (points_type IN ('betting', 'stream')),
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert point packages (only if table is empty)
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

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_packages_active ON point_packages(is_active);

-- 8. Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
DROP POLICY IF EXISTS "Users can update their own points" ON user_points;
DROP POLICY IF EXISTS "Point packages are viewable by everyone" ON point_packages;
DROP POLICY IF EXISTS "Users can view their own transactions" ON point_transactions;

-- 10. Create RLS policies
CREATE POLICY "Users can view their own points" ON user_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points" ON user_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Point packages are viewable by everyone" ON point_packages
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 11. Grant permissions
GRANT SELECT, UPDATE ON user_points TO authenticated;
GRANT SELECT ON point_packages TO authenticated, anon;
GRANT SELECT ON point_transactions TO authenticated;

-- 12. Create functions
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points (user_id, betting_points, stream_points)
    VALUES (NEW.id, 100, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_betting_points(
    user_uuid UUID,
    points_amount INTEGER,
    transaction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    SELECT betting_points INTO current_balance
    FROM user_points
    WHERE user_id = user_uuid;
    
    IF current_balance IS NULL THEN
        INSERT INTO user_points (user_id, betting_points)
        VALUES (user_uuid, points_amount);
        current_balance := 0;
        new_balance := points_amount;
    ELSE
        new_balance := current_balance + points_amount;
        UPDATE user_points
        SET betting_points = new_balance,
            total_betting_points_earned = total_betting_points_earned + points_amount,
            updated_at = NOW()
        WHERE user_id = user_uuid;
    END IF;
    
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

CREATE OR REPLACE FUNCTION spend_betting_points(
    user_uuid UUID,
    points_amount INTEGER,
    reference_id UUID DEFAULT NULL,
    reference_type TEXT DEFAULT NULL,
    transaction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    SELECT betting_points INTO current_balance
    FROM user_points
    WHERE user_id = user_uuid;
    
    IF current_balance IS NULL OR current_balance < points_amount THEN
        RETURN FALSE;
    END IF;
    
    new_balance := current_balance - points_amount;
    
    UPDATE user_points
    SET betting_points = new_balance,
        total_points_spent = total_points_spent + points_amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    INSERT INTO point_transactions (
        user_id, transaction_type, points_amount, points_type,
        balance_before, balance_after, reference_id, reference_type, description
    ) VALUES (
        user_uuid, 'bet_placed', points_amount, 'betting',
        current_balance, new_balance, reference_id, reference_type, transaction_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_stream_points(
    user_uuid UUID,
    points_amount INTEGER,
    reference_id UUID DEFAULT NULL,
    reference_type TEXT DEFAULT NULL,
    transaction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    SELECT stream_points INTO current_balance
    FROM user_points
    WHERE user_id = user_uuid;
    
    IF current_balance IS NULL THEN
        current_balance := 0;
    END IF;
    
    new_balance := current_balance + points_amount;
    
    UPDATE user_points
    SET stream_points = new_balance,
        total_stream_points_earned = total_stream_points_earned + points_amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    INSERT INTO point_transactions (
        user_id, transaction_type, points_amount, points_type,
        balance_before, balance_after, reference_id, reference_type, description
    ) VALUES (
        user_uuid, 'stream_points_earned', points_amount, 'stream',
        current_balance, new_balance, reference_id, reference_type, transaction_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION spend_stream_points(
    user_uuid UUID,
    points_amount INTEGER,
    reference_id UUID DEFAULT NULL,
    reference_type TEXT DEFAULT NULL,
    transaction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    SELECT stream_points INTO current_balance
    FROM user_points
    WHERE user_id = user_uuid;
    
    IF current_balance IS NULL OR current_balance < points_amount THEN
        RETURN FALSE;
    END IF;
    
    new_balance := current_balance - points_amount;
    
    UPDATE user_points
    SET stream_points = new_balance,
        total_points_spent = total_points_spent + points_amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    INSERT INTO point_transactions (
        user_id, transaction_type, points_amount, points_type,
        balance_before, balance_after, reference_id, reference_type, description
    ) VALUES (
        user_uuid, 'stream_points_redeemed', points_amount, 'stream',
        current_balance, new_balance, reference_id, reference_type, transaction_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_points_balance(user_uuid UUID)
RETURNS TABLE (
    betting_points INTEGER,
    stream_points INTEGER,
    total_betting_points_earned INTEGER,
    total_stream_points_earned INTEGER,
    total_points_spent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.betting_points,
        up.stream_points,
        up.total_betting_points_earned,
        up.total_stream_points_earned,
        up.total_points_spent
    FROM user_points up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger
CREATE TRIGGER trigger_new_user_points
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_points();

-- 14. Create views
CREATE OR REPLACE VIEW user_points_summary AS
SELECT 
    u.id as user_id,
    u.display_name,
    u.email,
    COALESCE(up.betting_points, 0) as betting_points,
    COALESCE(up.stream_points, 0) as stream_points,
    COALESCE(up.total_betting_points_earned, 0) as total_betting_points_earned,
    COALESCE(up.total_stream_points_earned, 0) as total_stream_points_earned,
    COALESCE(up.total_points_spent, 0) as total_points_spent,
    up.created_at as points_created_at,
    up.updated_at as points_updated_at
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id;

CREATE OR REPLACE VIEW point_transaction_history AS
SELECT 
    pt.id,
    pt.user_id,
    u.display_name,
    pt.transaction_type,
    pt.points_amount,
    pt.points_type,
    pt.balance_before,
    pt.balance_after,
    pt.reference_id,
    pt.reference_type,
    pt.description,
    pt.created_at
FROM point_transactions pt
JOIN users u ON pt.user_id = u.id
ORDER BY pt.created_at DESC;

-- 15. Grant view permissions
GRANT SELECT ON user_points_summary TO authenticated;
GRANT SELECT ON point_transaction_history TO authenticated;

-- 16. Success message
DO $$
BEGIN
    RAISE NOTICE 'Dual-point system fixed and ready!';
    RAISE NOTICE 'All functions, tables, and policies updated successfully.';
    RAISE NOTICE 'New users will get 100 free betting points automatically.';
END $$; 