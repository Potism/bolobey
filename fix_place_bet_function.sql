-- Fix the place_bet function to properly deduct betting points
-- The current function is incorrectly deducting from stream_points instead of betting_points

-- Drop the existing function
DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER);

-- Create the corrected place_bet function
CREATE OR REPLACE FUNCTION place_bet(
  match_uuid UUID,
  bet_on_player_uuid UUID,
  points_to_wager INTEGER
)
RETURNS UUID AS $$
DECLARE
  bet_id UUID;
  user_betting_points INTEGER;
BEGIN
  -- Get user's betting points balance
  SELECT betting_points INTO user_betting_points
  FROM user_points
  WHERE user_id = auth.uid();
  
  -- Check if user has enough betting points
  IF user_betting_points IS NULL OR user_betting_points < points_to_wager THEN
    RAISE EXCEPTION 'Insufficient betting points. You have % betting points, need % points', 
      COALESCE(user_betting_points, 0), points_to_wager;
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
  
  -- Deduct betting points from user using the proper function
  PERFORM spend_betting_points(
    auth.uid(), 
    points_to_wager, 
    bet_id, 
    'bet', 
    'Bet placed on match'
  );
  
  RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'place_bet function fixed! Now properly deducts betting points instead of stream points.';
END $$; 