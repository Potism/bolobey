-- Database Performance Optimization Script (FIXED VERSION)
-- Run this in your Supabase SQL Editor to improve query performance

-- 1. Add missing indexes for frequently queried columns

-- Tournaments table indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_status_start_date ON tournaments(status, start_date);

-- Matches table indexes
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON matches(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);

-- Tournament participants indexes
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_user ON tournament_participants(tournament_id, user_id);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

-- Betting system indexes
CREATE INDEX IF NOT EXISTS idx_betting_matches_tournament_id ON betting_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_betting_matches_status ON betting_matches(status);
CREATE INDEX IF NOT EXISTS idx_betting_matches_tournament_status ON betting_matches(tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_user_bets_user_id ON user_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_match_id ON user_bets(match_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_status ON user_bets(status);
CREATE INDEX IF NOT EXISTS idx_user_bets_user_match ON user_bets(user_id, match_id);

-- Stream points indexes
CREATE INDEX IF NOT EXISTS idx_stream_points_user_id ON stream_points(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_points_transaction_type ON stream_points(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stream_points_created_at ON stream_points(created_at);
CREATE INDEX IF NOT EXISTS idx_stream_points_user_created ON stream_points(user_id, created_at);

-- Notifications indexes (FIXED - using 'read' instead of 'is_read')
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON user_notifications(user_id, created_at);

-- Prize system indexes
CREATE INDEX IF NOT EXISTS idx_prize_notifications_user_id ON prize_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_status ON prize_notifications(status);
CREATE INDEX IF NOT EXISTS idx_prize_notifications_created_at ON prize_notifications(created_at);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_tournament_id ON chat_messages(tournament_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tournament_created ON chat_messages(tournament_id, created_at);

-- Spectator tracking indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tournament_spectators') THEN
        CREATE INDEX IF NOT EXISTS idx_tournament_spectators_tournament_id ON tournament_spectators(tournament_id);
        CREATE INDEX IF NOT EXISTS idx_tournament_spectators_active ON tournament_spectators(is_active);
        CREATE INDEX IF NOT EXISTS idx_tournament_spectators_last_seen ON tournament_spectators(last_seen);
        CREATE INDEX IF NOT EXISTS idx_tournament_spectators_tournament_active ON tournament_spectators(tournament_id, is_active);
    END IF;
END $$;

-- 2. Create composite indexes for common query patterns

-- Tournament with participants count
CREATE INDEX IF NOT EXISTS idx_tournaments_with_participants ON tournaments(id) 
WHERE status IN ('open', 'in_progress', 'completed');

-- Active betting matches
CREATE INDEX IF NOT EXISTS idx_active_betting_matches ON betting_matches(tournament_id, status) 
WHERE status IN ('betting_open', 'betting_closed', 'live');

-- Recent notifications (FIXED - using 'read' instead of 'is_read')
CREATE INDEX IF NOT EXISTS idx_recent_notifications ON user_notifications(user_id, created_at) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- 3. Analyze tables to update statistics
ANALYZE tournaments;
ANALYZE matches;
ANALYZE tournament_participants;
ANALYZE users;
ANALYZE betting_matches;
ANALYZE user_bets;
ANALYZE stream_points;
ANALYZE user_notifications;
ANALYZE prize_notifications;
ANALYZE chat_messages;

-- 4. Create optimized views for common queries

-- Active tournaments with participant count
CREATE OR REPLACE VIEW active_tournaments AS
SELECT 
    t.*,
    COUNT(tp.id) as participant_count
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
WHERE t.status IN ('open', 'in_progress')
GROUP BY t.id;

-- User points summary
CREATE OR REPLACE VIEW user_points_summary AS
SELECT 
    u.id,
    u.display_name,
    u.email,
    COALESCE(SUM(sp.points), 0) as total_points,
    COUNT(sp.id) as transaction_count,
    MAX(sp.created_at) as last_transaction
FROM users u
LEFT JOIN stream_points sp ON u.id = sp.user_id
GROUP BY u.id, u.display_name, u.email;

-- Recent activity summary (FIXED - using 'read' instead of 'is_read')
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'tournament' as type,
    t.id,
    t.name as title,
    t.created_at,
    t.status
FROM tournaments t
WHERE t.created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'bet' as type,
    ub.id,
    CONCAT('Bet on match ', ub.match_id) as title,
    ub.created_at,
    ub.status
FROM user_bets ub
WHERE ub.created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'notification' as type,
    un.id,
    un.title,
    un.created_at,
    CASE WHEN un.read THEN 'read' ELSE 'unread' END as status
FROM user_notifications un
WHERE un.created_at > NOW() - INTERVAL '7 days'

ORDER BY created_at DESC;

-- 5. Grant permissions on new views
GRANT SELECT ON active_tournaments TO authenticated;
GRANT SELECT ON active_tournaments TO anon;
GRANT SELECT ON user_points_summary TO authenticated;
GRANT SELECT ON recent_activity TO authenticated;

-- 6. Create function to get tournament statistics efficiently
CREATE OR REPLACE FUNCTION get_tournament_stats(tournament_uuid UUID)
RETURNS TABLE(
    total_participants BIGINT,
    total_matches BIGINT,
    completed_matches BIGINT,
    active_bets BIGINT,
    total_points_wagered NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = tournament_uuid) as total_participants,
        (SELECT COUNT(*) FROM matches WHERE tournament_id = tournament_uuid) as total_matches,
        (SELECT COUNT(*) FROM matches WHERE tournament_id = tournament_uuid AND status = 'completed') as completed_matches,
        (SELECT COUNT(*) FROM user_bets ub 
         JOIN betting_matches bm ON ub.match_id = bm.id 
         WHERE bm.tournament_id = tournament_uuid AND ub.status = 'active') as active_bets,
        (SELECT COALESCE(SUM(ub.points_wagered), 0) FROM user_bets ub 
         JOIN betting_matches bm ON ub.match_id = bm.id 
         WHERE bm.tournament_id = tournament_uuid) as total_points_wagered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Performance monitoring query
CREATE OR REPLACE VIEW performance_metrics AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- 8. Show optimization results
SELECT 'Database optimization completed successfully!' as status;

-- Show created indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC; 