-- Fix battles table by dropping and recreating it with all required columns

-- First, drop the existing battles table (this will also drop any foreign key constraints)
DROP TABLE IF EXISTS battles CASCADE;

-- Recreate the battles table with all required columns
CREATE TABLE battles (
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

-- Enable RLS on battles table
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for battles
DROP POLICY IF EXISTS "Enable read access for all users" ON battles;
DROP POLICY IF EXISTS "Enable insert for tournament creators" ON battles;

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

-- Create indexes
CREATE INDEX idx_battles_match_id ON battles(match_id);
CREATE INDEX idx_battles_round_robin_match_id ON battles(round_robin_match_id); 