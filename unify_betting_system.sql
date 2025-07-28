-- Unify Betting System - Fix Points Awarding Issue
-- This script will unify the old and new betting systems

-- 1. First, let's check what tables exist and their current state
DO $$
BEGIN
    RAISE NOTICE '=== CHECKING CURRENT SYSTEM STATE ===';
    
    -- Check if betting_matches table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'betting_matches') THEN
        RAISE NOTICE 'betting_matches table EXISTS';
    ELSE
        RAISE NOTICE 'betting_matches table DOES NOT EXIST';
    END IF;
    
    -- Check if matches table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
        RAISE NOTICE 'matches table EXISTS';
    ELSE
        RAISE NOTICE 'matches table DOES NOT EXIST';
    END IF;
    
    -- Check if user_points table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') THEN
        RAISE NOTICE 'user_points table EXISTS';
    ELSE
        RAISE NOTICE 'user_points table DOES NOT EXIST';
    END IF;
    
    -- Check if stream_points table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_points') THEN
        RAISE NOTICE 'stream_points table EXISTS';
    ELSE
        RAISE NOTICE 'stream_points table DOES NOT EXIST';
    END IF;
END $$;

-- 2. Create unified betting system using matches table
-- We'll use the matches table for betting and user_points for dual points

-- Ensure user_points table exists with correct structure
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Ensure point_transactions table exists
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    points_amount INTEGER NOT NULL,
    points_type TEXT NOT NULL CHECK (points_type IN ('betting', 'stream')),
    balance_before INTEGER,
    balance_after INTEGER,
    reference_id UUID,
    reference_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_bets table exists with stream_points_bonus column
CREATE TABLE IF NOT EXISTS user_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    bet_on_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_wagered INTEGER NOT NULL CHECK (points_wagered > 0),
    potential_winnings INTEGER NOT NULL CHECK (potential_winnings >= points_wagered),
    stream_points_bonus INTEGER DEFAULT 0 CHECK (stream_points_bonus >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Drop all conflicting functions and recreate them
DROP FUNCTION IF EXISTS get_user_points_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_bet_payouts() CASCADE;
DROP FUNCTION IF EXISTS add_betting_points(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS spend_betting_points(UUID, INTEGER, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_stream_points(UUID, INTEGER, UUID, TEXT, TEXT) CASCADE;
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;
DROP TRIGGER IF EXISTS trigger_new_user_points ON auth.users;

-- 4. Create unified functions

-- Function to get user points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_uuid UUID)
RETURNS TABLE(betting_points INTEGER, stream_points INTEGER) AS $$
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

-- Function to add betting points (for purchases)
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

-- Function to spend betting points (for placing bets)
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

-- Function to add stream points (for winning)
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

-- Function to place bet (unified)
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
        RAISE EXCEPTION 'Insufficient betting points. You have % betting points, need % points', 
            user_betting_points, points_to_wager;
    END IF;
    
    -- Check if betting is still open (match status should be 'in_progress' for betting)
    IF NOT EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_uuid 
        AND status = 'in_progress'
    ) THEN
        RAISE EXCEPTION 'Betting is not open for this match';
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
    
    RAISE NOTICE 'Bet placed: % points wagered, % stream points bonus', points_to_wager, stream_points_bonus;
    
    RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process bet payouts (unified)
CREATE OR REPLACE FUNCTION process_bet_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    user_betting_points INTEGER;
    user_stream_points INTEGER;
BEGIN
    -- Only process when a match is completed and has a winner
    IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL THEN
        RAISE NOTICE 'Processing payouts for match % with winner %', NEW.id, NEW.winner_id;
        
        -- Process all bets for this match
        FOR bet_record IN 
            SELECT 
                ub.id,
                ub.user_id,
                ub.bet_on_player_id,
                ub.points_wagered,
                ub.potential_winnings,
                ub.stream_points_bonus,
                ub.status
            FROM user_bets ub
            WHERE ub.match_id = NEW.id
            AND ub.status = 'pending'
        LOOP
            RAISE NOTICE 'Processing bet % for user %', bet_record.id, bet_record.user_id;
            
            -- Check if bet won
            IF bet_record.bet_on_player_id = NEW.winner_id THEN
                RAISE NOTICE 'Bet WON! Awarding % betting points and % stream points', 
                    bet_record.potential_winnings, bet_record.stream_points_bonus;
                
                -- Get current user points
                SELECT COALESCE(betting_points, 0), COALESCE(stream_points, 0)
                INTO user_betting_points, user_stream_points
                FROM user_points
                WHERE user_id = bet_record.user_id;
                
                -- Update user points
                UPDATE user_points
                SET 
                    betting_points = user_betting_points + bet_record.potential_winnings,
                    stream_points = user_stream_points + bet_record.stream_points_bonus,
                    updated_at = NOW()
                WHERE user_id = bet_record.user_id;
                
                -- Record transactions
                INSERT INTO point_transactions (
                    user_id, transaction_type, points_amount, points_type,
                    balance_before, balance_after, reference_id, reference_type, description
                ) VALUES (
                    bet_record.user_id, 'bet_won', bet_record.potential_winnings, 'betting',
                    user_betting_points, user_betting_points + bet_record.potential_winnings,
                    bet_record.id, 'bet', 'Won bet on match'
                );
                
                INSERT INTO point_transactions (
                    user_id, transaction_type, points_amount, points_type,
                    balance_before, balance_after, reference_id, reference_type, description
                ) VALUES (
                    bet_record.user_id, 'stream_points_earned', bet_record.stream_points_bonus, 'stream',
                    user_stream_points, user_stream_points + bet_record.stream_points_bonus,
                    bet_record.id, 'bet', 'Stream points bonus for winning bet'
                );
                
                -- Update bet status to won
                UPDATE user_bets
                SET status = 'won'
                WHERE id = bet_record.id;
                
                RAISE NOTICE 'Successfully awarded points to user %', bet_record.user_id;
            ELSE
                RAISE NOTICE 'Bet LOST for user %', bet_record.user_id;
                
                -- Update bet status to lost
                UPDATE user_bets
                SET status = 'lost'
                WHERE id = bet_record.id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create triggers
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

-- Trigger for new users
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user_points record for new users
    INSERT INTO user_points (user_id, betting_points, stream_points)
    VALUES (NEW.id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_user_points
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_points();

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION get_user_points_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_betting_points(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION spend_betting_points(UUID, INTEGER, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_stream_points(UUID, INTEGER, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_points() TO authenticated;

-- 7. Enable RLS and create policies (handle existing policies)
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;

-- User points policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_points' AND policyname = 'Users can read their own points') THEN
        CREATE POLICY "Users can read their own points" ON user_points
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_points' AND policyname = 'System can manage points') THEN
        CREATE POLICY "System can manage points" ON user_points
            FOR ALL USING (true);
    END IF;
END $$;

-- Point transactions policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'point_transactions' AND policyname = 'Users can read their own transactions') THEN
        CREATE POLICY "Users can read their own transactions" ON point_transactions
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'point_transactions' AND policyname = 'System can create transactions') THEN
        CREATE POLICY "System can create transactions" ON point_transactions
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- User bets policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_bets' AND policyname = 'Users can read their own bets') THEN
        CREATE POLICY "Users can read their own bets" ON user_bets
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_bets' AND policyname = 'Users can create their own bets') THEN
        CREATE POLICY "Users can create their own bets" ON user_bets
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_bets' AND policyname = 'System can update bets') THEN
        CREATE POLICY "System can update bets" ON user_bets
            FOR UPDATE USING (true);
    END IF;
END $$;

-- 8. Enable real-time
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_points') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_points;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'point_transactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE point_transactions;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_bets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_bets;
    END IF;
END $$;

-- 9. Success message
DO $$
BEGIN
    RAISE NOTICE '=== BETTING SYSTEM UNIFIED SUCCESSFULLY ===';
    RAISE NOTICE 'Now using: matches table + user_points table (dual points)';
    RAISE NOTICE 'Betting points: for placing bets';
    RAISE NOTICE 'Stream points: for redeeming prizes';
    RAISE NOTICE 'Option B implemented: 100%% winnings to betting points, 50%% bonus to stream points';
END $$; 