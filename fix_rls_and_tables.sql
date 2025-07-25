-- Fix RLS policies and ensure tables exist for Beyblade X tournaments

-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_robin_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_phases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON tournaments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tournaments;
DROP POLICY IF EXISTS "Enable update for tournament creators" ON tournaments;
DROP POLICY IF EXISTS "Enable read access for all users" ON tournament_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tournament_participants;
DROP POLICY IF EXISTS "Enable update for participants" ON tournament_participants;
DROP POLICY IF EXISTS "Enable read access for all users" ON matches;
DROP POLICY IF EXISTS "Enable insert for tournament creators" ON matches;
DROP POLICY IF EXISTS "Enable update for tournament creators" ON matches;
DROP POLICY IF EXISTS "Enable read access for all users" ON round_robin_matches;
DROP POLICY IF EXISTS "Enable insert for tournament creators" ON round_robin_matches;
DROP POLICY IF EXISTS "Enable update for tournament creators" ON round_robin_matches;
DROP POLICY IF EXISTS "Enable read access for all users" ON battles;
DROP POLICY IF EXISTS "Enable insert for tournament creators" ON battles;
DROP POLICY IF EXISTS "Enable read access for all users" ON tournament_phases;
DROP POLICY IF EXISTS "Enable insert for tournament creators" ON tournament_phases;
DROP POLICY IF EXISTS "Enable update for tournament creators" ON tournament_phases;

-- Tournaments policies
CREATE POLICY "Enable read access for all users" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON tournaments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for tournament creators" ON tournaments
  FOR UPDATE USING (auth.uid() = created_by);

-- Tournament participants policies
CREATE POLICY "Enable read access for all users" ON tournament_participants
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON tournament_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for participants" ON tournament_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Enable read access for all users" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for tournament creators" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Enable update for tournament creators" ON matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

-- Round robin matches policies
CREATE POLICY "Enable read access for all users" ON round_robin_matches
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for tournament creators" ON round_robin_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Enable update for tournament creators" ON round_robin_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

-- Battles policies
CREATE POLICY "Enable read access for all users" ON battles
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for tournament creators" ON battles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      LEFT JOIN matches m ON m.id = battles.match_id
      LEFT JOIN round_robin_matches rrm ON rrm.id = battles.round_robin_match_id
      WHERE (m.tournament_id = t.id OR rrm.tournament_id = t.id) 
      AND t.created_by = auth.uid()
    )
  );

-- Tournament phases policies
CREATE POLICY "Enable read access for all users" ON tournament_phases
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for tournament creators" ON tournament_phases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Enable update for tournament creators" ON tournament_phases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

-- Ensure tables exist
CREATE TABLE IF NOT EXISTS round_robin_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES users(id),
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  round_robin_match_id UUID REFERENCES round_robin_matches(id) ON DELETE CASCADE,
  battle_number INTEGER NOT NULL,
  winner_id UUID REFERENCES users(id),
  finish_type TEXT CHECK (finish_type IN ('burst', 'ringout', 'spinout')),
  player1_points INTEGER DEFAULT 0,
  player2_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('round_robin', 'elimination')),
  phase_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'registration' CHECK (current_phase IN ('registration', 'round_robin', 'elimination', 'completed'));

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS burst_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ringout_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spinout_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0;

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS bracket_type TEXT DEFAULT 'upper' CHECK (bracket_type IN ('upper', 'lower', 'final')),
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES tournament_phases(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_round_robin_matches_tournament_id ON round_robin_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_round_robin_matches_status ON round_robin_matches(status);
CREATE INDEX IF NOT EXISTS idx_battles_match_id ON battles(match_id);
CREATE INDEX IF NOT EXISTS idx_battles_round_robin_match_id ON battles(round_robin_match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_phases_tournament_id ON tournament_phases(tournament_id); 