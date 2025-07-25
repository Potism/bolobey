-- Fix tournament schema by adding missing columns
-- Add current_phase column to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'registration' CHECK (current_phase IN ('registration', 'round_robin', 'elimination', 'completed'));

-- Ensure registration_deadline column exists (it should already exist)
-- If it doesn't exist, this will add it
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;

-- Update existing tournaments to have the default phase
UPDATE tournaments 
SET current_phase = 'registration' 
WHERE current_phase IS NULL; 