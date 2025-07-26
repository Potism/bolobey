-- Create the missing current_betting_matches view
-- Run this in Supabase SQL Editor

-- Drop the view if it exists to recreate it
DROP VIEW IF EXISTS current_betting_matches;

-- Create the view for current betting matches
CREATE VIEW current_betting_matches AS
SELECT 
  bm.*,
  p1.display_name as player1_name,
  p2.display_name as player2_name,
  w.display_name as winner_name,
  COUNT(ub.id) as total_bets,
  SUM(ub.points_wagered) as total_points_wagered
FROM betting_matches bm
LEFT JOIN users p1 ON bm.player1_id = p1.id
LEFT JOIN users p2 ON bm.player2_id = p2.id
LEFT JOIN users w ON bm.winner_id = w.id
LEFT JOIN user_bets ub ON bm.id = ub.match_id
GROUP BY bm.id, p1.display_name, p2.display_name, w.display_name;

-- Grant permissions to authenticated users
GRANT SELECT ON current_betting_matches TO authenticated;

-- Success message
SELECT 'current_betting_matches view created successfully!' as status; 