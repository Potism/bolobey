-- Live Betting V3 Upgrade
-- Comprehensive upgrade for better performance, data structure, and user experience

-- 1. Drop and recreate the current_betting_matches view with better structure
DROP VIEW IF EXISTS current_betting_matches;

CREATE VIEW current_betting_matches AS
SELECT 
    bm.id,
    bm.tournament_id,
    bm.player1_id,
    bm.player2_id,
    p1.display_name as player1_name,
    p2.display_name as player2_name,
    bm.betting_start_time,
    bm.betting_end_time,
    bm.match_start_time,
    bm.status,
    bm.winner_id,
    winner.display_name as winner_name,
    bm.stream_url,
    bm.stream_key,
    bm.created_at,
    bm.updated_at,
    -- Enhanced statistics
    COALESCE(bet_stats.total_bets, 0) as total_bets,
    COALESCE(bet_stats.total_points_wagered, 0) as total_points_wagered,
    COALESCE(player1_stats.bet_count, 0) as player1_bet_count,
    COALESCE(player1_stats.total_points, 0) as player1_total_points,
    COALESCE(player2_stats.bet_count, 0) as player2_bet_count,
    COALESCE(player2_stats.total_points, 0) as player2_total_points,
    -- Dynamic odds calculation
    CASE 
        WHEN COALESCE(player1_stats.total_points, 0) > 0 
        THEN ROUND((COALESCE(bet_stats.total_points_wagered, 0) / player1_stats.total_points)::numeric, 2)
        ELSE 2.0 
    END as player1_odds,
    CASE 
        WHEN COALESCE(player2_stats.total_points, 0) > 0 
        THEN ROUND((COALESCE(bet_stats.total_points_wagered, 0) / player2_stats.total_points)::numeric, 2)
        ELSE 2.0 
    END as player2_odds,
    -- Time-based status
    CASE 
        WHEN bm.status = 'betting_open' AND NOW() > bm.betting_end_time THEN 'betting_closed'
        WHEN bm.status = 'betting_closed' AND NOW() > bm.match_start_time THEN 'live'
        ELSE bm.status 
    END as computed_status
FROM betting_matches bm
LEFT JOIN users p1 ON bm.player1_id = p1.id
LEFT JOIN users p2 ON bm.player2_id = p2.id
LEFT JOIN users winner ON bm.winner_id = winner.id
LEFT JOIN (
    SELECT 
        match_id,
        COUNT(*) as total_bets,
        SUM(points_wagered) as total_points_wagered
    FROM user_bets 
    WHERE status = 'pending'
    GROUP BY match_id
) bet_stats ON bm.id = bet_stats.match_id
LEFT JOIN (
    SELECT 
        match_id,
        bet_on_player_id,
        COUNT(*) as bet_count,
        SUM(points_wagered) as total_points
    FROM user_bets 
    WHERE status = 'pending'
    GROUP BY match_id, bet_on_player_id
) player1_stats ON bm.id = player1_stats.match_id AND bm.player1_id = player1_stats.bet_on_player_id
LEFT JOIN (
    SELECT 
        match_id,
        bet_on_player_id,
        COUNT(*) as bet_count,
        SUM(points_wagered) as total_points
    FROM user_bets 
    WHERE status = 'pending'
    GROUP BY match_id, bet_on_player_id
) player2_stats ON bm.id = player2_stats.match_id AND bm.player2_id = player2_stats.bet_on_player_id;

-- 2. Create enhanced user betting statistics view
DROP VIEW IF EXISTS user_betting_stats;

CREATE VIEW user_betting_stats AS
SELECT 
    ub.user_id,
    u.display_name,
    COUNT(*) as total_bets_placed,
    SUM(CASE WHEN ub.status = 'won' THEN 1 ELSE 0 END) as bets_won,
    SUM(CASE WHEN ub.status = 'lost' THEN 1 ELSE 0 END) as bets_lost,
    SUM(ub.points_wagered) as total_points_wagered,
    SUM(CASE WHEN ub.status = 'won' THEN ub.potential_winnings ELSE 0 END) as total_winnings,
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 
            THEN (SUM(CASE WHEN ub.status = 'won' THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100
            ELSE 0 
        END, 2
    ) as win_percentage,
    MAX(ub.created_at) as last_bet_date
FROM user_bets ub
JOIN users u ON ub.user_id = u.id
GROUP BY ub.user_id, u.display_name;

-- 3. Create enhanced betting match statistics view
DROP VIEW IF EXISTS betting_match_stats;

CREATE VIEW betting_match_stats AS
SELECT 
    bm.id as match_id,
    bm.tournament_id,
    bm.player1_id,
    bm.player2_id,
    p1.display_name as player1_name,
    p2.display_name as player2_name,
    bm.status,
    -- Betting statistics
    COALESCE(bet_stats.total_bets, 0) as total_bets,
    COALESCE(bet_stats.total_points_wagered, 0) as total_points_wagered,
    COALESCE(player1_stats.bet_count, 0) as player1_bet_count,
    COALESCE(player1_stats.total_points, 0) as player1_total_points,
    COALESCE(player2_stats.bet_count, 0) as player2_bet_count,
    COALESCE(player2_stats.total_points, 0) as player2_total_points,
    -- Recent activity
    COALESCE(recent_stats.bets_last_5min, 0) as bets_last_5min,
    COALESCE(recent_stats.points_last_5min, 0) as points_last_5min,
    -- Winner information
    bm.winner_id,
    winner.display_name as winner_name,
    -- Time information
    bm.betting_start_time,
    bm.betting_end_time,
    bm.match_start_time,
    EXTRACT(EPOCH FROM (bm.betting_end_time - NOW())) as seconds_until_betting_ends,
    EXTRACT(EPOCH FROM (bm.match_start_time - NOW())) as seconds_until_match_starts
FROM betting_matches bm
LEFT JOIN users p1 ON bm.player1_id = p1.id
LEFT JOIN users p2 ON bm.player2_id = p2.id
LEFT JOIN users winner ON bm.winner_id = winner.id
LEFT JOIN (
    SELECT 
        match_id,
        COUNT(*) as total_bets,
        SUM(points_wagered) as total_points_wagered
    FROM user_bets 
    WHERE status = 'pending'
    GROUP BY match_id
) bet_stats ON bm.id = bet_stats.match_id
LEFT JOIN (
    SELECT 
        match_id,
        bet_on_player_id,
        COUNT(*) as bet_count,
        SUM(points_wagered) as total_points
    FROM user_bets 
    WHERE status = 'pending'
    GROUP BY match_id, bet_on_player_id
) player1_stats ON bm.id = player1_stats.match_id AND bm.player1_id = player1_stats.bet_on_player_id
LEFT JOIN (
    SELECT 
        match_id,
        bet_on_player_id,
        COUNT(*) as bet_count,
        SUM(points_wagered) as total_points
    FROM user_bets 
    WHERE status = 'pending'
    GROUP BY match_id, bet_on_player_id
) player2_stats ON bm.id = player2_stats.match_id AND bm.player2_id = player2_stats.bet_on_player_id
LEFT JOIN (
    SELECT 
        match_id,
        COUNT(*) as bets_last_5min,
        SUM(points_wagered) as points_last_5min
    FROM user_bets 
    WHERE status = 'pending' 
    AND created_at > NOW() - INTERVAL '5 minutes'
    GROUP BY match_id
) recent_stats ON bm.id = recent_stats.match_id;

-- 4. Create enhanced function for placing bets with better validation
CREATE OR REPLACE FUNCTION place_betting_match_bet_v3(
    match_uuid UUID,
    bet_on_player_uuid UUID,
    points_to_wager INTEGER
)
RETURNS JSON AS $$
DECLARE
    bet_id UUID;
    user_betting_points INTEGER;
    stream_points_bonus INTEGER;
    match_data RECORD;
    user_data RECORD;
    result JSON;
BEGIN
    -- Get match data with validation
    SELECT * INTO match_data
    FROM betting_match_stats
    WHERE match_id = match_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Match not found'
        );
    END IF;
    
    -- Check if betting is open
    IF match_data.status != 'betting_open' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Betting is not open for this match'
        );
    END IF;
    
    -- Check if betting time has expired
    IF match_data.seconds_until_betting_ends <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Betting period has ended'
        );
    END IF;
    
    -- Validate bet amount
    IF points_to_wager <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Bet amount must be greater than 0'
        );
    END IF;
    
    -- Get user data
    SELECT * INTO user_data
    FROM user_points
    WHERE user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User points record not found'
        );
    END IF;
    
    user_betting_points := COALESCE(user_data.betting_points, 0);
    
    -- Check if user has enough points
    IF user_betting_points < points_to_wager THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Insufficient betting points. You have %s, need %s', user_betting_points, points_to_wager)
        );
    END IF;
    
    -- Check if user already placed a bet on this match
    IF EXISTS (
        SELECT 1 FROM user_bets 
        WHERE user_id = auth.uid() 
        AND match_id = match_uuid 
        AND status = 'pending'
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You have already placed a bet on this match'
        );
    END IF;
    
    -- Calculate stream points bonus (50% of bet amount)
    stream_points_bonus := FLOOR(points_to_wager * 0.5);
    
    -- Create the bet
    INSERT INTO user_bets (
        user_id, 
        match_id, 
        bet_on_player_id, 
        points_wagered, 
        potential_winnings, 
        stream_points_bonus
    ) VALUES (
        auth.uid(), 
        match_uuid, 
        bet_on_player_uuid, 
        points_to_wager, 
        points_to_wager * 2, 
        stream_points_bonus
    ) RETURNING id INTO bet_id;
    
    -- Deduct betting points from user
    UPDATE user_points
    SET 
        betting_points = betting_points - points_to_wager,
        updated_at = NOW()
    WHERE user_id = auth.uid();
    
    -- Record the transaction
    INSERT INTO point_transactions (
        user_id, 
        transaction_type, 
        points_amount, 
        points_type,
        balance_before, 
        balance_after, 
        reference_id, 
        reference_type, 
        description
    ) VALUES (
        auth.uid(), 
        'bet_placed', 
        -points_to_wager, 
        'betting',
        user_betting_points, 
        user_betting_points - points_to_wager,
        bet_id, 
        'bet', 
        format('Bet placed on %s vs %s', match_data.player1_name, match_data.player2_name)
    );
    
    -- Return success response with bet details
    result := json_build_object(
        'success', true,
        'bet_id', bet_id,
        'points_wagered', points_to_wager,
        'potential_winnings', points_to_wager * 2,
        'stream_points_bonus', stream_points_bonus,
        'remaining_points', user_betting_points - points_to_wager,
        'message', format('Bet placed successfully! %s points wagered, potential winnings: %s points', points_to_wager, points_to_wager * 2)
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An unexpected error occurred: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create enhanced function for getting user betting history
CREATE OR REPLACE FUNCTION get_user_betting_history_v3(
    user_uuid UUID DEFAULT auth.uid(),
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
    bet_id UUID,
    match_id UUID,
    tournament_name TEXT,
    player1_name TEXT,
    player2_name TEXT,
    bet_on_player_name TEXT,
    points_wagered INTEGER,
    potential_winnings INTEGER,
    stream_points_bonus INTEGER,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    winner_name TEXT,
    actual_winnings INTEGER,
    profit_loss INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id as bet_id,
        ub.match_id,
        t.name as tournament_name,
        p1.display_name as player1_name,
        p2.display_name as player2_name,
        bet_on.display_name as bet_on_player_name,
        ub.points_wagered,
        ub.potential_winnings,
        ub.stream_points_bonus,
        ub.status,
        ub.created_at,
        winner.display_name as winner_name,
        CASE 
            WHEN ub.status = 'won' THEN ub.potential_winnings
            ELSE 0 
        END as actual_winnings,
        CASE 
            WHEN ub.status = 'won' THEN ub.potential_winnings - ub.points_wagered
            WHEN ub.status = 'lost' THEN -ub.points_wagered
            ELSE 0 
        END as profit_loss
    FROM user_bets ub
    JOIN betting_matches bm ON ub.match_id = bm.id
    JOIN tournaments t ON bm.tournament_id = t.id
    JOIN users p1 ON bm.player1_id = p1.id
    JOIN users p2 ON bm.player2_id = p2.id
    JOIN users bet_on ON ub.bet_on_player_id = bet_on.id
    LEFT JOIN users winner ON bm.winner_id = winner.id
    WHERE ub.user_id = user_uuid
    ORDER BY ub.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create enhanced function for getting tournament betting statistics
CREATE OR REPLACE FUNCTION get_tournament_betting_stats_v3(
    tournament_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'tournament_id', t.id,
        'tournament_name', t.name,
        'total_matches', COUNT(bm.id),
        'total_bets_placed', COALESCE(SUM(bet_stats.total_bets), 0),
        'total_points_wagered', COALESCE(SUM(bet_stats.total_points_wagered), 0),
        'active_matches', COUNT(CASE WHEN bm.status IN ('betting_open', 'betting_closed', 'live') THEN 1 END),
        'completed_matches', COUNT(CASE WHEN bm.status = 'completed' THEN 1 END),
        'total_winners', COUNT(CASE WHEN bm.winner_id IS NOT NULL THEN 1 END),
        'average_bets_per_match', CASE 
            WHEN COUNT(bm.id) > 0 
            THEN ROUND(COALESCE(SUM(bet_stats.total_bets), 0)::float / COUNT(bm.id)::float, 2)
            ELSE 0 
        END,
        'average_points_per_match', CASE 
            WHEN COUNT(bm.id) > 0 
            THEN ROUND(COALESCE(SUM(bet_stats.total_points_wagered), 0)::float / COUNT(bm.id)::float, 2)
            ELSE 0 
        END,
        'most_active_players', (
            SELECT json_agg(player_stats)
            FROM (
                SELECT 
                    u.display_name,
                    COUNT(*) as bet_count,
                    SUM(ub.points_wagered) as total_points_wagered
                FROM user_bets ub
                JOIN betting_matches bm2 ON ub.match_id = bm2.id
                JOIN users u ON ub.user_id = u.id
                WHERE bm2.tournament_id = tournament_uuid
                GROUP BY u.id, u.display_name
                ORDER BY COUNT(*) DESC
                LIMIT 5
            ) player_stats
        ),
        'recent_activity', (
            SELECT json_agg(recent_bets)
            FROM (
                SELECT 
                    ub.created_at,
                    u.display_name as bettor_name,
                    ub.points_wagered,
                    p1.display_name as player1_name,
                    p2.display_name as player2_name,
                    bet_on.display_name as bet_on_player_name
                FROM user_bets ub
                JOIN betting_matches bm2 ON ub.match_id = bm2.id
                JOIN users u ON ub.user_id = u.id
                JOIN users p1 ON bm2.player1_id = p1.id
                JOIN users p2 ON bm2.player2_id = p2.id
                JOIN users bet_on ON ub.bet_on_player_id = bet_on.id
                WHERE bm2.tournament_id = tournament_uuid
                ORDER BY ub.created_at DESC
                LIMIT 10
            ) recent_bets
        )
    ) INTO result
    FROM tournaments t
    LEFT JOIN betting_matches bm ON t.id = bm.tournament_id
    LEFT JOIN (
        SELECT 
            match_id,
            COUNT(*) as total_bets,
            SUM(points_wagered) as total_points_wagered
        FROM user_bets 
        WHERE status = 'pending'
        GROUP BY match_id
    ) bet_stats ON bm.id = bet_stats.match_id
    WHERE t.id = tournament_uuid
    GROUP BY t.id, t.name;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT SELECT ON current_betting_matches TO authenticated;
GRANT SELECT ON user_betting_stats TO authenticated;
GRANT SELECT ON betting_match_stats TO authenticated;
GRANT EXECUTE ON FUNCTION place_betting_match_bet_v3(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_betting_history_v3(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tournament_betting_stats_v3(UUID) TO authenticated;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_bets_match_status ON user_bets(match_id, status);
CREATE INDEX IF NOT EXISTS idx_user_bets_user_match ON user_bets(user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_created_at ON user_bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_betting_matches_tournament_status ON betting_matches(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_betting_matches_betting_end_time ON betting_matches(betting_end_time);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_type ON point_transactions(user_id, transaction_type);

-- 9. Success message
DO $$
BEGIN
  RAISE NOTICE '🎉 Live Betting V3 Upgrade Complete!';
  RAISE NOTICE '✅ Enhanced Views Created:';
  RAISE NOTICE '   - current_betting_matches (with real-time stats)';
  RAISE NOTICE '   - user_betting_stats (user performance tracking)';
  RAISE NOTICE '   - betting_match_stats (comprehensive match data)';
  RAISE NOTICE '🚀 New Functions Available:';
  RAISE NOTICE '   - place_betting_match_bet_v3 (enhanced validation)';
  RAISE NOTICE '   - get_user_betting_history_v3 (detailed history)';
  RAISE NOTICE '   - get_tournament_betting_stats_v3 (tournament analytics)';
  RAISE NOTICE '⚡ Performance Improvements:';
  RAISE NOTICE '   - Optimized indexes for faster queries';
  RAISE NOTICE '   - Real-time statistics calculation';
  RAISE NOTICE '   - Better error handling and validation';
  RAISE NOTICE '📊 Enhanced Features:';
  RAISE NOTICE '   - Dynamic odds calculation';
  RAISE NOTICE '   - User betting history with profit/loss';
  RAISE NOTICE '   - Tournament-wide statistics';
  RAISE NOTICE '   - Recent activity tracking';
END $$; 