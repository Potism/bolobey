-- Debug script to check foreign key constraint names
-- Run this in Supabase SQL Editor

-- Check foreign key constraints for tournament_participants table
SELECT '=== FOREIGN KEY CONSTRAINTS FOR TOURNAMENT_PARTICIPANTS ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tournament_participants'
ORDER BY tc.constraint_name;

-- Check foreign key constraints for matches table
SELECT '=== FOREIGN KEY CONSTRAINTS FOR MATCHES ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'matches'
ORDER BY tc.constraint_name;

-- Test the current query that's failing
SELECT '=== TESTING CURRENT QUERY ===' as info;

SELECT 
    tp.id,
    tp.user_id,
    tp.tournament_id,
    tp.joined_at,
    u.display_name,
    u.email
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
ORDER BY tp.joined_at DESC;

-- Test with explicit join syntax
SELECT '=== TESTING WITH EXPLICIT JOIN ===' as info;

SELECT 
    tp.*,
    u.display_name,
    u.avatar_url,
    u.email
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
ORDER BY tp.joined_at DESC; 