-- Check current betting match status
SELECT 
    id,
    status,
    betting_start_time,
    betting_end_time,
    match_start_time,
    NOW() as current_time
FROM betting_matches 
WHERE tournament_id = 'YOUR_TOURNAMENT_ID'
ORDER BY created_at DESC 
LIMIT 1;

-- Check if place_bet function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'place_bet';

-- Fix the place_bet function to properly check betting status
CREATE OR REPLACE FUNCTION place_bet(
  match_uuid UUID,
  bet_on_player_uuid UUID,
  points_to_wager INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  match_status TEXT;
  betting_start TIMESTAMP;
  betting_end TIMESTAMP;
  current_time TIMESTAMP;
BEGIN
  -- Get match details
  SELECT status, betting_start_time, betting_end_time 
  INTO match_status, betting_start, betting_end
  FROM betting_matches 
  WHERE id = match_uuid;
  
  -- Check if match exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Check if betting is open
  IF match_status != 'betting_open' THEN
    RAISE EXCEPTION 'Betting is not open for this match';
  END IF;
  
  -- Check betting time window
  current_time := NOW();
  IF current_time < betting_start OR current_time > betting_end THEN
    RAISE EXCEPTION 'Betting is not open for this match';
  END IF;
  
  -- Insert the bet
  INSERT INTO user_bets (
    user_id, 
    match_id, 
    bet_on_player_id, 
    points_wagered, 
    potential_winnings,
    status
  ) VALUES (
    auth.uid(),
    match_uuid,
    bet_on_player_uuid,
    points_to_wager,
    points_to_wager * 2, -- Simple 2x payout
    'pending'
  );
  
  -- Deduct points from user
  INSERT INTO stream_points (
    user_id, 
    points, 
    transaction_type, 
    description
  ) VALUES (
    auth.uid(),
    -points_to_wager,
    'bet_placed',
    'Bet placed on match ' || match_uuid
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 