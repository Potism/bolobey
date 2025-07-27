-- Manual test for spectator tracking
-- Replace 'your-tournament-id-here' with an actual tournament ID from your database

-- 1. First, let's see what tournaments exist
SELECT id, name, status FROM tournaments LIMIT 5;

-- 2. Pick a tournament ID and test adding a spectator
-- Uncomment and replace the tournament ID below:
/*
SELECT add_tournament_spectator(
  tournament_uuid := 'your-tournament-id-here',
  user_uuid := NULL,
  session_id_param := 'test-session-manual',
  user_agent_param := 'Test Browser Manual'
);
*/

-- 3. Check if the spectator was added
SELECT 
  tournament_id,
  user_id,
  session_id,
  is_active,
  last_seen,
  joined_at
FROM tournament_spectators 
ORDER BY joined_at DESC 
LIMIT 5;

-- 4. Check the spectator count
SELECT * FROM tournament_spectator_counts;

-- 5. Test the count function
-- Uncomment and replace the tournament ID below:
/*
SELECT get_tournament_spectator_count('your-tournament-id-here');
*/ 