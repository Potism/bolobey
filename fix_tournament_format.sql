-- Fix tournament format constraint to include beyblade_x
-- First, drop the existing constraint
ALTER TABLE tournaments 
DROP CONSTRAINT IF EXISTS tournaments_format_check;

-- Add the new constraint that includes beyblade_x
ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_format_check 
CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'beyblade_x')); 