-- Debug spectator tracking system

-- 1. Check if the table exists
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'tournament_spectators';

-- 2. Check if the view exists
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'tournament_spectator_counts';

-- 3. Check if functions exist
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
  'add_tournament_spectator',
  'remove_tournament_spectator', 
  'get_tournament_spectator_count',
  'cleanup_old_spectators'
);

-- 4. Check current spectator data (if any)
SELECT 
  tournament_id,
  user_id,
  session_id,
  is_active,
  last_seen,
  joined_at
FROM tournament_spectators 
ORDER BY joined_at DESC 
LIMIT 10;

-- 5. Check spectator counts view
SELECT * FROM tournament_spectator_counts;

-- 6. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'tournament_spectators';

-- 7. Test adding a spectator manually (replace with actual tournament ID)
-- SELECT add_tournament_spectator(
--   tournament_uuid := 'your-tournament-id-here',
--   user_uuid := NULL,
--   session_id_param := 'test-session-123',
--   user_agent_param := 'Test Browser'
-- );

-- 8. Check if there are any tournaments to test with
SELECT id, name, status FROM tournaments LIMIT 5; 