-- Create betting system tables for V2.5
-- Run this in Supabase SQL Editor

-- 1. Betting Matches Table
CREATE TABLE betting_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  betting_start_time TIMESTAMP WITH TIME ZONE,
  betting_end_time TIMESTAMP WITH TIME ZONE,
  match_start_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'betting_open', 'betting_closed', 'live', 'completed', 'cancelled')),
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stream_url TEXT,
  stream_key TEXT, -- For OBS integration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Bets Table
CREATE TABLE user_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES betting_matches(id) ON DELETE CASCADE,
  bet_on_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_wagered INTEGER NOT NULL CHECK (points_wagered > 0),
  potential_winnings INTEGER NOT NULL CHECK (potential_winnings >= points_wagered),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stream Points Table
CREATE TABLE stream_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bet_won', 'bet_lost', 'admin_award', 'prize_claimed', 'tournament_entry', 'daily_bonus', 'streak_bonus')),
  description TEXT,
  reference_id UUID, -- For linking to specific bets, matches, etc.
  reference_type TEXT, -- 'bet', 'match', 'tournament', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX idx_betting_matches_tournament_id ON betting_matches(tournament_id);
CREATE INDEX idx_betting_matches_status ON betting_matches(status);
CREATE INDEX idx_betting_matches_betting_times ON betting_matches(betting_start_time, betting_end_time);
CREATE INDEX idx_betting_matches_match_time ON betting_matches(match_start_time);

CREATE INDEX idx_user_bets_user_id ON user_bets(user_id);
CREATE INDEX idx_user_bets_match_id ON user_bets(match_id);
CREATE INDEX idx_user_bets_status ON user_bets(status);
CREATE INDEX idx_user_bets_created_at ON user_bets(created_at);

CREATE INDEX idx_stream_points_user_id ON stream_points(user_id);
CREATE INDEX idx_stream_points_transaction_type ON stream_points(transaction_type);
CREATE INDEX idx_stream_points_created_at ON stream_points(created_at);

-- 5. Enable Row Level Security
ALTER TABLE betting_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_points ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Betting Matches Policies
-- Anyone can read betting matches
CREATE POLICY "Anyone can read betting matches" ON betting_matches
  FOR SELECT USING (true);

-- Only admins can create/update betting matches
CREATE POLICY "Only admins can create betting matches" ON betting_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update betting matches" ON betting_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- User Bets Policies
-- Users can read their own bets
CREATE POLICY "Users can read their own bets" ON user_bets
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own bets
CREATE POLICY "Users can create their own bets" ON user_bets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own pending bets
CREATE POLICY "Users can update their own pending bets" ON user_bets
  FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

-- Stream Points Policies
-- Users can read their own points
CREATE POLICY "Users can read their own stream points" ON stream_points
  FOR SELECT USING (user_id = auth.uid());

-- System can create points transactions
CREATE POLICY "System can create stream points" ON stream_points
  FOR INSERT WITH CHECK (true);

-- Only admins can update points
CREATE POLICY "Only admins can update stream points" ON stream_points
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 7. Create functions for common operations

-- Function to get user's current points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(points) FROM stream_points WHERE user_id = user_uuid), 
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to place a bet
CREATE OR REPLACE FUNCTION place_bet(
  match_uuid UUID,
  bet_on_player_uuid UUID,
  points_to_wager INTEGER
)
RETURNS UUID AS $$
DECLARE
  bet_id UUID;
  user_points INTEGER;
BEGIN
  -- Check if user has enough points
  user_points := get_user_points_balance(auth.uid());
  
  IF user_points < points_to_wager THEN
    RAISE EXCEPTION 'Insufficient points. You have % points, need % points', user_points, points_to_wager;
  END IF;
  
  -- Check if betting is still open
  IF NOT EXISTS (
    SELECT 1 FROM betting_matches 
    WHERE id = match_uuid 
    AND status = 'betting_open'
    AND NOW() BETWEEN betting_start_time AND betting_end_time
  ) THEN
    RAISE EXCEPTION 'Betting is not open for this match';
  END IF;
  
  -- Create the bet
  INSERT INTO user_bets (user_id, match_id, bet_on_player_id, points_wagered, potential_winnings)
  VALUES (auth.uid(), match_uuid, bet_on_player_uuid, points_to_wager, points_to_wager * 2)
  RETURNING id INTO bet_id;
  
  -- Deduct points from user
  INSERT INTO stream_points (user_id, points, transaction_type, description, reference_id, reference_type)
  VALUES (auth.uid(), -points_to_wager, 'bet_lost', 'Bet placed', bet_id, 'bet');
  
  RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE betting_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE user_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_points;

-- 9. Create a view for current betting matches
CREATE VIEW current_betting_matches AS
SELECT 
  bm.*,
  p1.display_name as player1_name,
  p2.display_name as player2_name,
  w.display_name as winner_name,
  COUNT(ub.id) as total_bets,
  SUM(ub.points_wagered) as total_points_wagered
FROM betting_matches bm
LEFT JOIN users p1 ON bm.player1_id = p1.id
LEFT JOIN users p2 ON bm.player2_id = p2.id
LEFT JOIN users w ON bm.winner_id = w.id
LEFT JOIN user_bets ub ON bm.id = ub.match_id
GROUP BY bm.id, p1.display_name, p2.display_name, w.display_name;

-- 10. Create function to give new users 50 points
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stream_points (user_id, points, transaction_type, description)
  VALUES (NEW.id, 50, 'admin_award', 'Welcome bonus for new user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger to automatically give points to new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 12. Add some sample data (optional - remove in production)
-- INSERT INTO stream_points (user_id, points, transaction_type, description)
-- SELECT id, 1000, 'admin_award', 'Welcome bonus' FROM users LIMIT 5; 