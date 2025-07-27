-- Test spectator tracking system after fix

-- 1. Check if everything was created
SELECT 'Checking setup...' as test_step;

SELECT 'Tables:' as info;
SELECT table_name FROM information_schema.tables WHERE table_name = 'tournament_spectators';

SELECT 'Functions:' as info;
SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%spectator%';

SELECT 'Views:' as info;
SELECT table_name FROM information_schema.views WHERE table_name = 'tournament_spectator_counts';

-- 2. Get a tournament ID to test with
SELECT 'Available tournaments:' as test_step;
SELECT id, name, status FROM tournaments LIMIT 3;

-- 3. Test adding a spectator (replace 'your-tournament-id' with actual ID)
-- Uncomment the line below and replace with a real tournament ID:
/*
SELECT add_tournament_spectator(
  tournament_uuid := 'your-tournament-id-here',
  session_id_param := 'test-session-123',
  user_uuid := NULL,
  user_agent_param := 'Test Browser'
);
*/

-- 4. Check if spectator was added
SELECT 'Current spectators:' as test_step;
SELECT 
  tournament_id,
  user_id,
  session_id,
  is_active,
  last_seen
FROM tournament_spectators 
ORDER BY joined_at DESC 
LIMIT 5;

-- 5. Check spectator counts
SELECT 'Spectator counts:' as test_step;
SELECT * FROM tournament_spectator_counts;

-- 6. Test the count function (replace with actual tournament ID)
-- Uncomment and replace the tournament ID:
/*
SELECT get_tournament_spectator_count('your-tournament-id-here') as spectator_count;
*/ 