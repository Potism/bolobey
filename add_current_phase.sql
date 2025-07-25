-- Add current_phase column to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'registration' CHECK (current_phase IN ('registration', 'round_robin', 'elimination', 'completed')); 