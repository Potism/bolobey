-- Check actual table structure before running optimizations
-- Run this first to see what columns actually exist

-- Check tournaments table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
ORDER BY ordinal_position;

-- Check matches table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'matches' 
ORDER BY ordinal_position;

-- Check tournament_participants table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tournament_participants' 
ORDER BY ordinal_position;

-- Check users table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check betting_matches table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'betting_matches' 
ORDER BY ordinal_position;

-- Check user_bets table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_bets' 
ORDER BY ordinal_position;

-- Check stream_points table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stream_points' 
ORDER BY ordinal_position;

-- Check user_notifications table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_notifications' 
ORDER BY ordinal_position;

-- Check prize_notifications table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prize_notifications' 
ORDER BY ordinal_position;

-- Check chat_messages table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position;

-- Check if tournament_spectators table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'tournament_spectators';

-- List all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name; 