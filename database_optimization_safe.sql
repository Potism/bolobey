-- Database Performance Optimization Script (SAFE VERSION)
-- This script checks for column existence before creating indexes
-- Run this in your Supabase SQL Editor to improve query performance

-- 1. Add missing indexes for frequently queried columns (with safety checks)

-- Tournaments table indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'created_by') THEN
        CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'start_date') THEN
        CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'status') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'start_date') THEN
        CREATE INDEX IF NOT EXISTS idx_tournaments_status_start_date ON tournaments(status, start_date);
    END IF;
END $$;

-- Matches table indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'tournament_id') THEN
        CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'round') THEN
        CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'tournament_id') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON matches(tournament_id, status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'tournament_id') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'round') THEN
        CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON matches(tournament_id, round);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'player1_id') THEN
        CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'player2_id') THEN
        CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
    END IF;
END $$;

-- Tournament participants indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_participants' AND column_name = 'tournament_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_participants' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_participants' AND column_name = 'tournament_id') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_participants' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_user ON tournament_participants(tournament_id, user_id);
    END IF;
END $$;

-- Users table indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'display_name') THEN
        CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
    END IF;
END $$;

-- Betting system indexes (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'betting_matches') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'betting_matches' AND column_name = 'tournament_id') THEN
            CREATE INDEX IF NOT EXISTS idx_betting_matches_tournament_id ON betting_matches(tournament_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'betting_matches' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_betting_matches_status ON betting_matches(status);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'betting_matches' AND column_name = 'tournament_id') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'betting_matches' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_betting_matches_tournament_status ON betting_matches(tournament_id, status);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bets') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bets' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_user_bets_user_id ON user_bets(user_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bets' AND column_name = 'match_id') THEN
            CREATE INDEX IF NOT EXISTS idx_user_bets_match_id ON user_bets(match_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bets' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_user_bets_status ON user_bets(status);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bets' AND column_name = 'user_id') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bets' AND column_name = 'match_id') THEN
            CREATE INDEX IF NOT EXISTS idx_user_bets_user_match ON user_bets(user_id, match_id);
        END IF;
    END IF;
END $$;

-- Stream points indexes (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_points') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stream_points' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_stream_points_user_id ON stream_points(user_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stream_points' AND column_name = 'transaction_type') THEN
            CREATE INDEX IF NOT EXISTS idx_stream_points_transaction_type ON stream_points(transaction_type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stream_points' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_stream_points_created_at ON stream_points(created_at);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stream_points' AND column_name = 'user_id') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stream_points' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_stream_points_user_created ON stream_points(user_id, created_at);
        END IF;
    END IF;
END $$;

-- Notifications indexes (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'read') THEN
            CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'type') THEN
            CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'user_id') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'read') THEN
            CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, read);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'user_id') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON user_notifications(user_id, created_at);
        END IF;
    END IF;
END $$;

-- Prize system indexes (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prize_notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prize_notifications' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_prize_notifications_user_id ON prize_notifications(user_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prize_notifications' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_prize_notifications_status ON prize_notifications(status);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prize_notifications' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_prize_notifications_created_at ON prize_notifications(created_at);
        END IF;
    END IF;
END $$;

-- Chat messages indexes (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'tournament_id') THEN
            CREATE INDEX IF NOT EXISTS idx_chat_messages_tournament_id ON chat_messages(tournament_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'tournament_id') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_chat_messages_tournament_created ON chat_messages(tournament_id, created_at);
        END IF;
    END IF;
END $$;

-- Spectator tracking indexes (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_spectators') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_spectators' AND column_name = 'tournament_id') THEN
            CREATE INDEX IF NOT EXISTS idx_tournament_spectators_tournament_id ON tournament_spectators(tournament_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_spectators' AND column_name = 'is_active') THEN
            CREATE INDEX IF NOT EXISTS idx_tournament_spectators_active ON tournament_spectators(is_active);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_spectators' AND column_name = 'last_seen') THEN
            CREATE INDEX IF NOT EXISTS idx_tournament_spectators_last_seen ON tournament_spectators(last_seen);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_spectators' AND column_name = 'tournament_id') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_spectators' AND column_name = 'is_active') THEN
            CREATE INDEX IF NOT EXISTS idx_tournament_spectators_tournament_active ON tournament_spectators(tournament_id, is_active);
        END IF;
    END IF;
END $$;

-- 2. Analyze tables to update statistics (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments') THEN
        ANALYZE tournaments;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
        ANALYZE matches;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_participants') THEN
        ANALYZE tournament_participants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ANALYZE users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'betting_matches') THEN
        ANALYZE betting_matches;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bets') THEN
        ANALYZE user_bets;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_points') THEN
        ANALYZE stream_points;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN
        ANALYZE user_notifications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prize_notifications') THEN
        ANALYZE prize_notifications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        ANALYZE chat_messages;
    END IF;
END $$;

-- 3. Show optimization results
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