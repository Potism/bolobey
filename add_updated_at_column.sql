-- Add updated_at column to prize_redemptions table
-- Run this in Supabase SQL Editor

-- Add updated_at column if it doesn't exist
ALTER TABLE prize_redemptions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have updated_at = created_at
UPDATE prize_redemptions 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Success message
SELECT '✅ Updated_at column added to prize_redemptions table!' as status; 