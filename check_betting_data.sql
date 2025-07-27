-- Check current betting data
-- This will help us understand why Total Wagered is showing 0

-- 1. Check current betting matches
SELECT 
  id,
  tournament_id,
  player1_id,
  player2_id,
  player1_name,
  player2_name,
  status,
  total_bets,
  total_points_wagered,
  created_at
FROM current_betting_matches
WHERE status IN ('betting_open', 'betting_closed', 'live')
ORDER BY created_at DESC;

-- 2. Check user_bets table
SELECT 
  id,
  user_id,
  match_id,
  bet_on_player_id,
  points_wagered,
  potential_winnings,
  status,
  created_at
FROM user_bets
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there are any bets for the current tournament
SELECT 
  COUNT(*) as total_bets,
  SUM(points_wagered) as total_points_wagered,
  match_id
FROM user_bets
GROUP BY match_id
ORDER BY total_points_wagered DESC;

-- 4. Check betting_matches table (the source table)
SELECT 
  id,
  tournament_id,
  player1_id,
  player2_id,
  status,
  total_bets,
  total_points_wagered
FROM betting_matches
WHERE status IN ('betting_open', 'betting_closed', 'live')
ORDER BY created_at DESC; 