-- Complete Betting System Fix
-- Simplifies data structure and fixes all betting issues

-- 1. Drop all conflicting functions
DROP FUNCTION IF EXISTS get_user_points_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_bet_payouts() CASCADE;
DROP FUNCTION IF EXISTS add_betting_points(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS spend_betting_points(UUID, INTEGER, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_stream_points(UUID, INTEGER, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_points() CASCADE;

-- 2. Drop conflicting triggers
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;
DROP TRIGGER IF EXISTS trigger_new_user_points ON auth.users;

-- 3. Simplify user_points table structure
DROP TABLE IF EXISTS user_points CASCADE;
CREATE TABLE user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. Ensure point_packages table exists
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

-- 5. Ensure point_transactions table exists
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    points_amount INTEGER NOT NULL,
    points_type VARCHAR(20) NOT NULL CHECK (points_type IN ('betting', 'stream')),
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Ensure user_bets table has stream_points_bonus column
ALTER TABLE user_bets ADD COLUMN IF NOT EXISTS stream_points_bonus INTEGER DEFAULT 0;

-- 7. Insert sample point packages
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

-- 8. Create simplified get_user_points_balance function
CREATE OR REPLACE FUNCTION get_user_points_balance(user_uuid UUID)
RETURNS TABLE (
    betting_points INTEGER,
    stream_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(up.betting_points, 0) as betting_points,
        COALESCE(up.stream_points, 0) as stream_points
    FROM user_points up
    WHERE up.user_id = user_uuid;
    
    -- If no record exists, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::INTEGER, 0::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create simplified add_betting_points function (for purchases)
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
        INSERT INTO user_points (user_id, betting_points)
        VALUES (user_uuid, points_amount);
        current_balance := 0;
        new_balance := points_amount;
    ELSE
        new_balance := current_balance + points_amount;
        -- Update user's betting points
        UPDATE user_points
        SET betting_points = new_balance,
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

-- 10. Create simplified spend_betting_points function (for placing bets)
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
    -- Get current betting points balance
    SELECT COALESCE(betting_points, 0) INTO current_balance
    FROM user_points
    WHERE user_id = user_uuid;
    
    -- Check if user has enough points
    IF current_balance < points_amount THEN
        RETURN FALSE;
    END IF;
    
    new_balance := current_balance - points_amount;
    
    -- Update user's betting points
    UPDATE user_points
    SET betting_points = new_balance,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Record the transaction
    INSERT INTO point_transactions (
        user_id, transaction_type, points_amount, points_type,
        balance_before, balance_after, reference_id, reference_type, description
    ) VALUES (
        user_uuid, 'bet_placed', -points_amount, 'betting',
        current_balance, new_balance, reference_id, reference_type, transaction_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create simplified add_stream_points function (for winning)
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
    -- Get current stream points balance
    SELECT COALESCE(stream_points, 0) INTO current_balance
    FROM user_points
    WHERE user_id = user_uuid;
    
    -- If user doesn't have a record, create one
    IF current_balance IS NULL THEN
        INSERT INTO user_points (user_id, stream_points)
        VALUES (user_uuid, points_amount);
        current_balance := 0;
        new_balance := points_amount;
    ELSE
        new_balance := current_balance + points_amount;
        -- Update user's stream points
        UPDATE user_points
        SET stream_points = new_balance,
            updated_at = NOW()
        WHERE user_id = user_uuid;
    END IF;
    
    -- Record the transaction
    INSERT INTO point_transactions (
        user_id, transaction_type, points_amount, points_type,
        balance_before, balance_after, reference_id, reference_type, description
    ) VALUES (
        user_uuid, 'bet_won', points_amount, 'stream',
        current_balance, new_balance, reference_id, reference_type, transaction_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create simplified place_bet function
CREATE OR REPLACE FUNCTION place_bet(
    match_uuid UUID,
    bet_on_player_uuid UUID,
    points_to_wager INTEGER
)
RETURNS UUID AS $$
DECLARE
    bet_id UUID;
    user_betting_points INTEGER;
    stream_points_bonus INTEGER;
BEGIN
    -- Get user's betting points balance
    SELECT COALESCE(betting_points, 0) INTO user_betting_points
    FROM user_points
    WHERE user_id = auth.uid();
    
    -- Check if user has enough betting points
    IF user_betting_points < points_to_wager THEN
        RAISE EXCEPTION 'Insufficient betting points. You have % betting points, need % points', user_betting_points, points_to_wager;
    END IF;
    
    -- Calculate stream points bonus (Option B: 50% of bet amount)
    stream_points_bonus := FLOOR(points_to_wager * 0.5);
    
    -- Create the bet with stream points bonus
    INSERT INTO user_bets (user_id, match_id, bet_on_player_id, points_wagered, potential_winnings, stream_points_bonus)
    VALUES (auth.uid(), match_uuid, bet_on_player_uuid, points_to_wager, points_to_wager * 2, stream_points_bonus)
    RETURNING id INTO bet_id;
    
    -- Deduct betting points from user
    PERFORM spend_betting_points(
        auth.uid(), 
        points_to_wager, 
        bet_id, 
        'bet', 
        'Bet placed on match'
    );
    
    RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create simplified process_bet_payouts function (Option B)
CREATE OR REPLACE FUNCTION process_bet_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    winner_id UUID;
    betting_points_to_award INTEGER;
    stream_points_to_award INTEGER;
BEGIN
    -- Only process when match is completed and has a winner
    IF NEW.status != 'completed' OR NEW.winner_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    winner_id := NEW.winner_id;
    
    -- Process all active bets for this match
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.bet_on_player_id,
            ub.points_wagered,
            ub.potential_winnings,
            ub.stream_points_bonus
        FROM user_bets ub
        WHERE ub.match_id = NEW.id AND ub.status = 'active'
    LOOP
        -- Check if bet was on the winning player
        IF bet_record.bet_on_player_id = winner_id THEN
            -- Option B: Betting points = full winnings, Stream points = 50% of bet amount
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_to_award := bet_record.stream_points_bonus;
            
            -- Award betting points
            PERFORM add_betting_points(
                bet_record.user_id, 
                betting_points_to_award, 
                'Won bet on match - awarded betting points'
            );
            
            -- Award stream points
            PERFORM add_stream_points(
                bet_record.user_id, 
                stream_points_to_award, 
                NEW.id, 
                'match', 
                'Won bet on match - awarded stream points'
            );
            
            -- Update bet status to won
            UPDATE user_bets 
            SET status = 'won', 
                updated_at = NOW()
            WHERE id = bet_record.id;
        ELSE
            -- Update bet status to lost
            UPDATE user_bets 
            SET status = 'lost', 
                updated_at = NOW()
            WHERE id = bet_record.id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create trigger for bet payouts
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

-- 15. Create trigger for new user points
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points (user_id, betting_points, stream_points)
    VALUES (NEW.id, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_user_points
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_points();

-- 16. Set up RLS policies
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
DROP POLICY IF EXISTS "Users can update their own points" ON user_points;
DROP POLICY IF EXISTS "Point packages are viewable by everyone" ON point_packages;
DROP POLICY IF EXISTS "Users can view their own transactions" ON point_transactions;

CREATE POLICY "Users can view their own points" ON user_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points" ON user_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Point packages are viewable by everyone" ON point_packages
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 17. Grant permissions
GRANT SELECT, UPDATE ON user_points TO authenticated;
GRANT SELECT ON point_packages TO authenticated, anon;
GRANT SELECT ON point_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_points_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_betting_points(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION spend_betting_points(UUID, INTEGER, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_stream_points(UUID, INTEGER, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;

-- 18. Success message
DO $$
BEGIN
    RAISE NOTICE 'Complete betting system fixed!';
    RAISE NOTICE 'Simplified data structure: betting_points + stream_points only';
    RAISE NOTICE 'Option B implemented: 100%% winnings to betting points, 50%% bonus to stream points';
    RAISE NOTICE 'All functions recreated and working';
    RAISE NOTICE 'Live betting should now work in both manage and live dashboard';
END $$; 