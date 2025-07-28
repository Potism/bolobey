-- Optimized Database Views and Indexes
-- This script creates optimized views and indexes for better performance

-- 1. Create optimized tournament view with all related data
CREATE OR REPLACE VIEW tournament_complete_data AS
SELECT 
  t.*,
  COUNT(DISTINCT tp.id) as participant_count,
  COUNT(DISTINCT m.id) as match_count,
  COUNT(DISTINCT bm.id) as betting_match_count,
  MAX(m.created_at) as last_match_date,
  MAX(bm.created_at) as last_betting_match_date
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
LEFT JOIN matches m ON t.id = m.tournament_id
LEFT JOIN betting_matches bm ON t.id = bm.tournament_id
GROUP BY t.id;

-- 2. Create optimized participant view with user data
CREATE OR REPLACE VIEW participant_with_user_data AS
SELECT 
  tp.*,
  u.display_name,
  u.avatar_url,
  u.email,
  up.betting_points,
  up.stream_points
FROM tournament_participants tp
JOIN users u ON tp.user_id = u.id
LEFT JOIN user_points up ON tp.user_id = up.user_id;

-- 3. Create optimized match view with player names
CREATE OR REPLACE VIEW match_with_players AS
SELECT 
  m.*,
  p1.display_name as player1_name,
  p1.avatar_url as player1_avatar,
  p2.display_name as player2_name,
  p2.avatar_url as player2_avatar,
  winner.display_name as winner_name
FROM matches m
JOIN users p1 ON m.player1_id = p1.id
JOIN users p2 ON m.player2_id = p2.id
LEFT JOIN users winner ON m.winner_id = winner.id;

-- 4. Create optimized betting match view
CREATE OR REPLACE VIEW betting_match_with_players AS
SELECT 
  bm.*,
  p1.display_name as player1_name,
  p1.avatar_url as player1_avatar,
  p2.display_name as player2_name,
  p2.avatar_url as player2_avatar,
  winner.display_name as winner_name,
  COUNT(ub.id) as total_bets,
  COALESCE(SUM(ub.points_wagered), 0) as total_points_wagered
FROM betting_matches bm
JOIN users p1 ON bm.player1_id = p1.id
JOIN users p2 ON bm.player2_id = p2.id
LEFT JOIN users winner ON bm.winner_id = winner.id
LEFT JOIN user_bets ub ON bm.id = ub.match_id
GROUP BY bm.id, p1.display_name, p1.avatar_url, p2.display_name, p2.avatar_url, winner.display_name;

-- 5. Create optimized user points view
CREATE OR REPLACE VIEW user_points_summary AS
SELECT 
  up.*,
  u.display_name,
  u.avatar_url,
  u.email,
  COUNT(pt.id) as total_transactions,
  SUM(CASE WHEN pt.points_amount > 0 THEN pt.points_amount ELSE 0 END) as total_earned,
  SUM(CASE WHEN pt.points_amount < 0 THEN ABS(pt.points_amount) ELSE 0 END) as total_spent
FROM user_points up
JOIN users u ON up.user_id = u.id
LEFT JOIN point_transactions pt ON up.user_id = pt.user_id
GROUP BY up.id, u.display_name, u.avatar_url, u.email;

-- 6. Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tournaments_status_created ON tournaments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_type_status ON tournaments(tournament_type_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON matches(tournament_id, round, match_number);
CREATE INDEX IF NOT EXISTS idx_matches_status_winner ON matches(status, winner_id);
CREATE INDEX IF NOT EXISTS idx_betting_matches_tournament_status ON betting_matches(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_betting_matches_time_range ON betting_matches(betting_start_time, betting_end_time);
CREATE INDEX IF NOT EXISTS idx_participants_tournament_points ON tournament_participants(tournament_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_bets_match_status ON user_bets(match_id, status);
CREATE INDEX IF NOT EXISTS idx_user_bets_user_match ON user_bets(user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_type ON point_transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);

-- 7. Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status_round ON matches(tournament_id, status, round);
CREATE INDEX IF NOT EXISTS idx_betting_matches_tournament_status_time ON betting_matches(tournament_id, status, betting_start_time);
CREATE INDEX IF NOT EXISTS idx_user_bets_user_status_created ON user_bets(user_id, status, created_at DESC);

-- 8. Create function to get tournament statistics
CREATE OR REPLACE FUNCTION get_tournament_stats(tournament_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'tournament', t,
    'participants', COALESCE(p.participants, '[]'::json),
    'matches', COALESCE(m.matches, '[]'::json),
    'betting_matches', COALESCE(bm.betting_matches, '[]'::json),
    'stats', json_build_object(
      'participant_count', COUNT(DISTINCT tp.id),
      'match_count', COUNT(DISTINCT mat.id),
      'betting_match_count', COUNT(DISTINCT bm_matches.id),
      'total_bets_placed', COALESCE(SUM(ub.points_wagered), 0),
      'total_points_wagered', COALESCE(SUM(ub.points_wagered), 0)
    )
  ) INTO result
  FROM tournaments t
  LEFT JOIN (
    SELECT 
      tournament_id,
      json_agg(
        json_build_object(
          'id', tp.id,
          'user_id', tp.user_id,
          'username', u.display_name,
          'avatar_url', u.avatar_url,
          'total_points', tp.total_points
        )
      ) as participants
    FROM tournament_participants tp
    JOIN users u ON tp.user_id = u.id
    WHERE tp.tournament_id = tournament_uuid
    GROUP BY tournament_id
  ) p ON t.id = p.tournament_id
  LEFT JOIN (
    SELECT 
      tournament_id,
      json_agg(
        json_build_object(
          'id', m.id,
          'player1_id', m.player1_id,
          'player2_id', m.player2_id,
          'winner_id', m.winner_id,
          'status', m.status,
          'round', m.round,
          'match_number', m.match_number
        )
      ) as matches
    FROM matches m
    WHERE m.tournament_id = tournament_uuid
    GROUP BY tournament_id
  ) m ON t.id = m.tournament_id
  LEFT JOIN (
    SELECT 
      tournament_id,
      json_agg(
        json_build_object(
          'id', bm.id,
          'player1_id', bm.player1_id,
          'player2_id', bm.player2_id,
          'status', bm.status,
          'betting_start_time', bm.betting_start_time,
          'betting_end_time', bm.betting_end_time
        )
      ) as betting_matches
    FROM betting_matches bm
    WHERE bm.tournament_id = tournament_uuid
    GROUP BY tournament_id
  ) bm ON t.id = bm.tournament_id
  LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
  LEFT JOIN matches mat ON t.id = mat.tournament_id
  LEFT JOIN betting_matches bm_matches ON t.id = bm_matches.tournament_id
  LEFT JOIN user_bets ub ON bm_matches.id = ub.match_id
  WHERE t.id = tournament_uuid
  GROUP BY t.id, p.participants, m.matches, bm.betting_matches;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT SELECT ON tournament_complete_data TO authenticated;
GRANT SELECT ON participant_with_user_data TO authenticated;
GRANT SELECT ON match_with_players TO authenticated;
GRANT SELECT ON betting_match_with_players TO authenticated;
GRANT SELECT ON user_points_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_tournament_stats(UUID) TO authenticated;

-- 10. Success message
DO $$
BEGIN
  RAISE NOTICE '=== DATABASE OPTIMIZATION COMPLETE ===';
  RAISE NOTICE 'Created optimized views for better performance';
  RAISE NOTICE 'Added performance indexes for common queries';
  RAISE NOTICE 'Created get_tournament_stats function for efficient data fetching';
  RAISE NOTICE 'All optimizations are ready to use!';
END $$; 