-- Debug betting data to see why live betting is not appearing
-- Run this in your Supabase SQL Editor

-- 1. Check if current_betting_matches view exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'current_betting_matches';

-- 2. Check if betting_matches table exists and has data
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'betting_matches';

-- 3. If betting_matches table exists, check its structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'betting_matches'
ORDER BY ordinal_position;

-- 4. Check if there are any betting matches in the database
SELECT 
    'betting_matches' as table_name,
    COUNT(*) as record_count
FROM betting_matches
UNION ALL
SELECT 
    'user_bets' as table_name,
    COUNT(*) as record_count
FROM user_bets;

-- 5. Check current_betting_matches view data (if it exists)
SELECT 
    'current_betting_matches' as table_name,
    COUNT(*) as record_count
FROM current_betting_matches;

-- 6. Show sample betting matches data
SELECT 
    id,
    tournament_id,
    player1_id,
    player2_id,
    status,
    betting_start_time,
    betting_end_time,
    created_at
FROM betting_matches
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check if there are any matches with betting status
SELECT 
    status,
    COUNT(*) as count
FROM betting_matches
GROUP BY status;

-- 8. Check if there are any matches for a specific tournament
-- Replace 'your-tournament-id' with an actual tournament ID
SELECT 
    id,
    tournament_id,
    status,
    betting_start_time,
    betting_end_time
FROM betting_matches
WHERE tournament_id = 'your-tournament-id'  -- Replace with actual tournament ID
ORDER BY created_at DESC;

-- 9. Check if current_betting_matches view definition (if it exists)
SELECT 
    view_definition
FROM information_schema.views 
WHERE table_name = 'current_betting_matches';

-- 10. Show all tables that might contain betting data
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%bet%' OR table_name LIKE '%match%'
ORDER BY table_name; 