-- Add missing column to battles table
ALTER TABLE battles 
ADD COLUMN IF NOT EXISTS round_robin_match_id UUID REFERENCES round_robin_matches(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_battles_round_robin_match_id ON battles(round_robin_match_id); 