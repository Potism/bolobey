-- Add stream_points_bonus column to user_bets table
-- This column stores the stream points bonus for each bet based on the risk/reward system

-- Add the column
ALTER TABLE user_bets 
ADD COLUMN IF NOT EXISTS stream_points_bonus INTEGER DEFAULT 0;

-- Update existing bets with default stream points bonus
UPDATE user_bets 
SET stream_points_bonus = CASE 
    WHEN points_wagered >= 1000 THEN 350
    WHEN points_wagered >= 500 THEN 150
    WHEN points_wagered >= 100 THEN 50
    ELSE 25
END
WHERE stream_points_bonus = 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_bets_stream_points_bonus ON user_bets(stream_points_bonus);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Added stream_points_bonus column to user_bets table';
  RAISE NOTICE 'Updated existing bets with appropriate stream points bonuses';
END $$; 