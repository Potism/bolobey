-- Point System Database Schema
-- Run this in your Supabase SQL Editor

-- 1. User Points Table
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0,
    stream_points INTEGER DEFAULT 0,
    total_earned_stream_points INTEGER DEFAULT 0,
    total_spent_stream_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Point Transactions Table
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('betting_points', 'stream_points')),
    amount INTEGER NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('purchase', 'bet', 'win', 'redemption', 'bonus', 'refund')),
    description TEXT NOT NULL,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Point Packages Table
CREATE TABLE IF NOT EXISTS point_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    betting_points INTEGER NOT NULL,
    bonus_points INTEGER DEFAULT 0,
    price_eur DECIMAL(10,2) NOT NULL,
    is_popular BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tournament Types Table
CREATE TABLE IF NOT EXISTS tournament_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    has_entry_fee BOOLEAN DEFAULT FALSE,
    entry_fee_eur DECIMAL(10,2),
    has_physical_prizes BOOLEAN DEFAULT FALSE,
    has_stream_prizes BOOLEAN DEFAULT TRUE,
    betting_enabled BOOLEAN DEFAULT TRUE,
    stream_enabled BOOLEAN DEFAULT TRUE,
    max_participants INTEGER,
    icon TEXT DEFAULT '🏆',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    stream_points_reward INTEGER NOT NULL,
    requirement_type TEXT CHECK (requirement_type IN ('first_bet', 'win_streak', 'total_wins', 'total_bets', 'tournament_wins')),
    requirement_value INTEGER NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. User Achievements Table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, achievement_id)
);

-- 7. Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('daily', 'weekly', 'monthly')),
    stream_points_reward INTEGER NOT NULL,
    requirement_type TEXT CHECK (requirement_type IN ('place_bets', 'win_bets', 'earn_stream_points', 'participate_tournaments')),
    requirement_value INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. User Challenges Table
CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, challenge_id)
);

-- 9. Add tournament_type_id to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tournament_type_id UUID REFERENCES tournament_types(id);

-- 10. Add entry_fee_eur to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee_eur DECIMAL(10,2);

-- 11. Add is_stream_only to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_stream_only BOOLEAN DEFAULT FALSE;

-- Insert default tournament types
INSERT INTO tournament_types (name, description, has_entry_fee, entry_fee_eur, has_physical_prizes, has_stream_prizes, betting_enabled, stream_enabled, max_participants, icon) VALUES
('Real Tournament', 'Physical tournament with real prizes and entry fees', TRUE, 15.00, TRUE, TRUE, TRUE, TRUE, 32, '🏆'),
('Stream Tournament', 'Virtual tournament for entertainment and betting only', FALSE, NULL, FALSE, TRUE, TRUE, TRUE, 16, '📺'),
('Community Event', 'Free community tournament with stream prizes', FALSE, NULL, FALSE, TRUE, TRUE, TRUE, 64, '👥'),
('Championship', 'High-stakes tournament with physical and stream prizes', TRUE, 25.00, TRUE, TRUE, TRUE, TRUE, 16, '👑');

-- Insert default point packages
INSERT INTO point_packages (name, betting_points, bonus_points, price_eur, is_popular, is_featured) VALUES
('Starter Pack', 15, 0, 5.00, FALSE, FALSE),
('Popular Pack', 35, 5, 10.00, TRUE, FALSE),
('Value Pack', 75, 15, 20.00, FALSE, TRUE),
('Pro Pack', 200, 50, 50.00, FALSE, FALSE),
('Elite Pack', 450, 150, 100.00, FALSE, FALSE);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, stream_points_reward, requirement_type, requirement_value) VALUES
('First Bet', 'Place your first bet', '🎯', 10, 'first_bet', 1),
('Win Streak', 'Win 5 bets in a row', '🔥', 100, 'win_streak', 5),
('High Roller', 'Win a bet worth 50+ points', '💰', 200, 'total_wins', 50),
('Tournament Champion', 'Win a tournament', '🏆', 500, 'tournament_wins', 1),
('Betting Master', 'Place 100 total bets', '🎲', 300, 'total_bets', 100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User can only see their own points and transactions
CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own points" ON user_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points" ON user_points FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON point_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Everyone can view packages, tournament types, and achievements
CREATE POLICY "Anyone can view packages" ON point_packages FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Anyone can view tournament types" ON tournament_types FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (is_active = TRUE);

-- Users can view their own achievements and challenges
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON user_achievements FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own challenges" ON user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON user_challenges FOR UPDATE USING (auth.uid() = user_id);

-- Everyone can view active challenges
CREATE POLICY "Anyone can view active challenges" ON challenges FOR SELECT USING (is_active = TRUE);

-- Function to create user points when new user signs up
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points (user_id, betting_points, stream_points)
    VALUES (NEW.id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user points
DROP TRIGGER IF EXISTS on_auth_user_created_points ON auth.users;
CREATE TRIGGER on_auth_user_created_points
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_points();

-- Function to add betting points
CREATE OR REPLACE FUNCTION add_betting_points(
    user_uuid UUID,
    amount INTEGER,
    description TEXT,
    transaction_type TEXT DEFAULT 'purchase'
)
RETURNS VOID AS $$
BEGIN
    -- Update user points
    UPDATE user_points 
    SET betting_points = betting_points + amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Insert transaction
    INSERT INTO point_transactions (user_id, type, amount, transaction_type, description)
    VALUES (user_uuid, 'betting_points', amount, transaction_type, description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add stream points
CREATE OR REPLACE FUNCTION add_stream_points(
    user_uuid UUID,
    amount INTEGER,
    description TEXT,
    transaction_type TEXT DEFAULT 'win'
)
RETURNS VOID AS $$
BEGIN
    -- Update user points
    UPDATE user_points 
    SET stream_points = stream_points + amount,
        total_earned_stream_points = total_earned_stream_points + amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Insert transaction
    INSERT INTO point_transactions (user_id, type, amount, transaction_type, description)
    VALUES (user_uuid, 'stream_points', amount, transaction_type, description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to spend betting points
CREATE OR REPLACE FUNCTION spend_betting_points(
    user_uuid UUID,
    amount INTEGER,
    description TEXT,
    tournament_id UUID DEFAULT NULL,
    match_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_points INTEGER;
BEGIN
    -- Get current betting points
    SELECT betting_points INTO current_points
    FROM user_points
    WHERE user_id = user_uuid;
    
    -- Check if user has enough points
    IF current_points < amount THEN
        RETURN FALSE;
    END IF;
    
    -- Update user points
    UPDATE user_points 
    SET betting_points = betting_points - amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Insert transaction
    INSERT INTO point_transactions (user_id, type, amount, transaction_type, description, tournament_id, match_id)
    VALUES (user_uuid, 'betting_points', -amount, 'bet', description, tournament_id, match_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to spend stream points
CREATE OR REPLACE FUNCTION spend_stream_points(
    user_uuid UUID,
    amount INTEGER,
    description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_points INTEGER;
BEGIN
    -- Get current stream points
    SELECT stream_points INTO current_points
    FROM user_points
    WHERE user_id = user_uuid;
    
    -- Check if user has enough points
    IF current_points < amount THEN
        RETURN FALSE;
    END IF;
    
    -- Update user points
    UPDATE user_points 
    SET stream_points = stream_points - amount,
        total_spent_stream_points = total_spent_stream_points + amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Insert transaction
    INSERT INTO point_transactions (user_id, type, amount, transaction_type, description)
    VALUES (user_uuid, 'stream_points', -amount, 'redemption', description);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 