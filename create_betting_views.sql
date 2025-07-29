-- Create betting views for the components
-- This script creates the views that the betting components are trying to query

-- Create current_betting_matches view
CREATE OR REPLACE VIEW current_betting_matches AS
SELECT 
    bm.*,
    p1.display_name as player1_name,
    p2.display_name as player2_name,
    COALESCE(bet_stats.total_bets, 0) as total_bets,
    COALESCE(bet_stats.total_points_wagered, 0) as total_points_wagered
FROM betting_matches bm
LEFT JOIN users p1 ON bm.player1_id = p1.id
LEFT JOIN users p2 ON bm.player2_id = p2.id
LEFT JOIN (
    SELECT 
        match_id,
        COUNT(*) as total_bets,
        SUM(points_wagered) as total_points_wagered
    FROM user_bets
    GROUP BY match_id
) bet_stats ON bm.id = bet_stats.match_id
WHERE bm.status IN ('betting_open', 'betting_closed', 'live');

-- Create current_betting_matches_v3 view (enhanced version)
CREATE OR REPLACE VIEW current_betting_matches_v3 AS
SELECT 
    bm.*,
    p1.display_name as player1_name,
    p2.display_name as player2_name,
    COALESCE(bet_stats.total_bets, 0) as total_bets,
    COALESCE(bet_stats.total_points_wagered, 0) as total_points_wagered,
    COALESCE(p1_bets.bet_count, 0) as player1_bet_count,
    COALESCE(p1_bets.total_points, 0) as player1_total_points,
    COALESCE(p2_bets.bet_count, 0) as player2_bet_count,
    COALESCE(p2_bets.total_points, 0) as player2_total_points,
    CASE 
        WHEN COALESCE(p1_bets.total_points, 0) > 0 
        THEN GREATEST(1.1, LEAST(10, COALESCE(bet_stats.total_points_wagered, 0) / p1_bets.total_points))
        ELSE 2.0 
    END as player1_odds,
    CASE 
        WHEN COALESCE(p2_bets.total_points, 0) > 0 
        THEN GREATEST(1.1, LEAST(10, COALESCE(bet_stats.total_points_wagered, 0) / p2_bets.total_points))
        ELSE 2.0 
    END as player2_odds,
    CASE 
        WHEN bm.status = 'betting_open' 
        THEN EXTRACT(EPOCH FROM (bm.betting_end_time::timestamp - NOW()))
        ELSE 0 
    END as seconds_until_betting_ends,
    CASE 
        WHEN bm.status = 'betting_open' 
        THEN EXTRACT(EPOCH FROM (bm.match_start_time::timestamp - NOW()))
        ELSE 0 
    END as seconds_until_match_starts
FROM betting_matches bm
LEFT JOIN users p1 ON bm.player1_id = p1.id
LEFT JOIN users p2 ON bm.player2_id = p2.id
LEFT JOIN (
    SELECT 
        match_id,
        COUNT(*) as total_bets,
        SUM(points_wagered) as total_points_wagered
    FROM user_bets
    GROUP BY match_id
) bet_stats ON bm.id = bet_stats.match_id
LEFT JOIN (
    SELECT 
        match_id,
        bet_on_player_id,
        COUNT(*) as bet_count,
        SUM(points_wagered) as total_points
    FROM user_bets
    GROUP BY match_id, bet_on_player_id
) p1_bets ON bm.id = p1_bets.match_id AND bm.player1_id = p1_bets.bet_on_player_id
LEFT JOIN (
    SELECT 
        match_id,
        bet_on_player_id,
        COUNT(*) as bet_count,
        SUM(points_wagered) as total_points
    FROM user_bets
    GROUP BY match_id, bet_on_player_id
) p2_bets ON bm.id = p2_bets.match_id AND bm.player2_id = p2_bets.bet_on_player_id
WHERE bm.status IN ('pending', 'betting_open', 'betting_closed', 'live');

-- Grant permissions on views
GRANT SELECT ON current_betting_matches TO authenticated;
GRANT SELECT ON current_betting_matches TO anon;
GRANT SELECT ON current_betting_matches_v3 TO authenticated;
GRANT SELECT ON current_betting_matches_v3 TO anon;

-- Test the views
SELECT 'Testing current_betting_matches view...' as status;
SELECT COUNT(*) as count FROM current_betting_matches;

SELECT 'Testing current_betting_matches_v3 view...' as status;
SELECT COUNT(*) as count FROM current_betting_matches_v3;

SELECT 'Betting views created successfully!' as result; 