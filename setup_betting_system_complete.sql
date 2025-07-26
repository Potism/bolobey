-- Complete Betting System Setup
-- Run this in Supabase SQL Editor

-- 1. Create betting_matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS betting_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'betting_open' CHECK (status IN ('betting_open', 'betting_closed', 'live', 'completed')),
  betting_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  betting_end_time TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  match_start_time TIMESTAMP WITH TIME ZONE,
  match_end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_bets table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES betting_matches(id) ON DELETE CASCADE,
  bet_on_player_id UUID REFERENCES users(id),
  points_wagered INTEGER NOT NULL CHECK (points_wagered > 0),
  potential_winnings INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create stream_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS stream_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('admin_award', 'bet_won', 'bet_lost', 'prize_redemption', 'tournament_reward')),
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_betting_matches_tournament_id') THEN
    CREATE INDEX idx_betting_matches_tournament_id ON betting_matches(tournament_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_betting_matches_status') THEN
    CREATE INDEX idx_betting_matches_status ON betting_matches(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_betting_matches_betting_times') THEN
    CREATE INDEX idx_betting_matches_betting_times ON betting_matches(betting_start_time, betting_end_time);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_betting_matches_match_time') THEN
    CREATE INDEX idx_betting_matches_match_time ON betting_matches(match_start_time);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_bets_user_id') THEN
    CREATE INDEX idx_user_bets_user_id ON user_bets(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_bets_match_id') THEN
    CREATE INDEX idx_user_bets_match_id ON user_bets(match_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_bets_status') THEN
    CREATE INDEX idx_user_bets_status ON user_bets(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_bets_created_at') THEN
    CREATE INDEX idx_user_bets_created_at ON user_bets(created_at);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stream_points_user_id') THEN
    CREATE INDEX idx_stream_points_user_id ON stream_points(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stream_points_transaction_type') THEN
    CREATE INDEX idx_stream_points_transaction_type ON stream_points(transaction_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stream_points_created_at') THEN
    CREATE INDEX idx_stream_points_created_at ON stream_points(created_at);
  END IF;
END $$;

-- 5. Enable Row Level Security
ALTER TABLE betting_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_points ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
DO $$ 
BEGIN
  -- Betting matches policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'betting_matches' AND policyname = 'Anyone can read betting matches') THEN
    CREATE POLICY "Anyone can read betting matches" ON betting_matches
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'betting_matches' AND policyname = 'Admins can manage betting matches') THEN
    CREATE POLICY "Admins can manage betting matches" ON betting_matches
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;

  -- User bets policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_bets' AND policyname = 'Users can read their own bets') THEN
    CREATE POLICY "Users can read their own bets" ON user_bets
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_bets' AND policyname = 'Users can create their own bets') THEN
    CREATE POLICY "Users can create their own bets" ON user_bets
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_bets' AND policyname = 'Admins can manage all bets') THEN
    CREATE POLICY "Admins can manage all bets" ON user_bets
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;

  -- Stream points policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stream_points' AND policyname = 'Users can read their own points') THEN
    CREATE POLICY "Users can read their own points" ON stream_points
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stream_points' AND policyname = 'System can manage points') THEN
    CREATE POLICY "System can manage points" ON stream_points
      FOR ALL USING (true);
  END IF;
END $$;

-- 7. Create functions for common operations
CREATE OR REPLACE FUNCTION get_user_points_balance(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(points) FROM stream_points WHERE user_id = user_uuid), 
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'betting_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE betting_matches;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_bets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_bets;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'stream_points'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stream_points;
  END IF;
END $$;

-- 9. Create the current_betting_matches view
DROP VIEW IF EXISTS current_betting_matches;
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

-- Grant permissions to authenticated users
GRANT SELECT ON current_betting_matches TO authenticated;

-- 10. Create function to give new users 50 points (if not already exists)
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stream_points (user_id, points, transaction_type, description)
  VALUES (NEW.id, 50, 'admin_award', 'Welcome bonus for new user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger to automatically give points to new users (if not already exists)
DROP TRIGGER IF EXISTS on_auth_user_created_points ON auth.users;
CREATE TRIGGER on_auth_user_created_points
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_points();

-- Success message
SELECT 'Betting system setup completed successfully!' as status; 