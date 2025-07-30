-- Setup Leaderboard Views for Supabase
-- This script creates the necessary views in the Supabase database

-- Drop existing views if they exist
DROP VIEW IF EXISTS player_stats;
DROP VIEW IF EXISTS simple_player_stats;

-- Create the main player_stats view
CREATE VIEW player_stats AS
SELECT 
  u.id,
  u.display_name,
  COALESCE(COUNT(DISTINCT tp.tournament_id), 0) as tournaments_played,
  COALESCE(COUNT(DISTINCT CASE WHEN t.winner_id = u.id THEN t.id END), 0) as tournaments_won,
  COALESCE(COUNT(CASE WHEN m.winner_id = u.id THEN 1 END), 0) + 
  COALESCE(COUNT(CASE WHEN rrm.winner_id = u.id THEN 1 END), 0) as matches_won,
  COALESCE(COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END), 0) +
  COALESCE(COUNT(CASE WHEN (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed' THEN 1 END), 0) as total_matches,
  COALESCE(SUM(tp.total_points), 0) as total_points,
  COALESCE(SUM(tp.burst_points), 0) as total_burst_points,
  COALESCE(SUM(tp.ringout_points), 0) as total_ringout_points,
  COALESCE(SUM(tp.spinout_points), 0) as total_spinout_points,
  CASE 
    WHEN (COALESCE(COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END), 0) +
          COALESCE(COUNT(CASE WHEN (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed' THEN 1 END), 0)) > 0 
    THEN ROUND(
      (COALESCE(COUNT(CASE WHEN m.winner_id = u.id THEN 1 END), 0) + 
       COALESCE(COUNT(CASE WHEN rrm.winner_id = u.id THEN 1 END), 0))::DECIMAL / 
      (COALESCE(COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END), 0) +
       COALESCE(COUNT(CASE WHEN (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed' THEN 1 END), 0)) * 100, 
      2
    )
    ELSE 0 
  END as win_percentage
FROM users u
LEFT JOIN tournament_participants tp ON u.id = tp.user_id
LEFT JOIN tournaments t ON tp.tournament_id = t.id
LEFT JOIN matches m ON (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed'
LEFT JOIN round_robin_matches rrm ON (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed'
WHERE u.role = 'player' OR u.role = 'admin'
GROUP BY u.id, u.display_name
HAVING 
  COUNT(DISTINCT tp.tournament_id) > 0 OR 
  COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END) > 0 OR
  COUNT(CASE WHEN (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed' THEN 1 END) > 0
ORDER BY tournaments_won DESC, total_points DESC, win_percentage DESC;

-- Create the simple fallback view
CREATE VIEW simple_player_stats AS
SELECT 
  u.id,
  u.display_name,
  COALESCE(COUNT(DISTINCT tp.tournament_id), 0) as tournaments_played,
  COALESCE(COUNT(DISTINCT CASE WHEN t.winner_id = u.id THEN t.id END), 0) as tournaments_won,
  COALESCE(SUM(tp.matches_played), 0) as total_matches,
  COALESCE(SUM(tp.matches_won), 0) as matches_won,
  COALESCE(SUM(tp.total_points), 0) as total_points,
  CASE 
    WHEN COALESCE(SUM(tp.matches_played), 0) > 0 
    THEN ROUND((COALESCE(SUM(tp.matches_won), 0)::DECIMAL / COALESCE(SUM(tp.matches_played), 1)) * 100, 2)
    ELSE 0 
  END as win_percentage,
  COALESCE(SUM(tp.burst_points), 0) as total_burst_points,
  COALESCE(SUM(tp.ringout_points), 0) as total_ringout_points,
  COALESCE(SUM(tp.spinout_points), 0) as total_spinout_points
FROM users u
LEFT JOIN tournament_participants tp ON u.id = tp.user_id
LEFT JOIN tournaments t ON tp.tournament_id = t.id
WHERE (u.role = 'player' OR u.role = 'admin')
GROUP BY u.id, u.display_name
HAVING COALESCE(COUNT(DISTINCT tp.tournament_id), 0) > 0
ORDER BY tournaments_won DESC, total_points DESC, win_percentage DESC;

-- Grant permissions for Supabase
GRANT SELECT ON player_stats TO anon;
GRANT SELECT ON player_stats TO authenticated;
GRANT SELECT ON simple_player_stats TO anon;
GRANT SELECT ON simple_player_stats TO authenticated;

-- Also grant permissions to underlying tables
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON tournaments TO anon;
GRANT SELECT ON tournaments TO authenticated;
GRANT SELECT ON tournament_participants TO anon;
GRANT SELECT ON tournament_participants TO authenticated;
GRANT SELECT ON matches TO anon;
GRANT SELECT ON matches TO authenticated;
GRANT SELECT ON round_robin_matches TO anon;
GRANT SELECT ON round_robin_matches TO authenticated;

-- Test the views
SELECT '=== TESTING VIEWS ===' as section;
SELECT COUNT(*) as player_stats_count FROM player_stats;
SELECT COUNT(*) as simple_player_stats_count FROM simple_player_stats; 