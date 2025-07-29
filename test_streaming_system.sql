-- Test script for streaming system
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check the specific tournament
SELECT '=== TOURNAMENT CHECK ===' as info;
SELECT 
    id,
    name,
    status,
    created_by,
    created_at
FROM tournaments 
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

-- 2. Check all participants
SELECT '=== PARTICIPANTS CHECK ===' as info;
SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    tp.joined_at,
    u.display_name,
    u.email,
    CASE 
        WHEN u.display_name IS NULL THEN '❌ NULL'
        WHEN u.display_name = '' THEN '❌ EMPTY'
        WHEN u.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
ORDER BY tp.joined_at DESC;

-- 3. Check all matches
SELECT '=== MATCHES CHECK ===' as info;
SELECT 
    id,
    tournament_id,
    player1_id,
    player2_id,
    player1_score,
    player2_score,
    status,
    round,
    match_number,
    created_at
FROM matches 
WHERE tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
ORDER BY created_at DESC;

-- 4. Check active matches specifically
SELECT '=== ACTIVE MATCHES CHECK ===' as info;
SELECT 
    id,
    tournament_id,
    player1_id,
    player2_id,
    player1_score,
    player2_score,
    status,
    round,
    match_number,
    created_at
FROM matches 
WHERE tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
  AND status = 'in_progress'
ORDER BY created_at DESC;

-- 5. Test creating a match (if no active match exists)
SELECT '=== TEST MATCH CREATION ===' as info;

-- Check if there's already an active match
DO $$
DECLARE
    active_match_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_match_count
    FROM matches 
    WHERE tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
      AND status = 'in_progress';
    
    IF active_match_count = 0 THEN
        RAISE NOTICE 'No active matches found. You can create a new match.';
    ELSE
        RAISE NOTICE 'Active match found. No need to create a new one.';
    END IF;
END $$;

-- 6. Check RLS policies
SELECT '=== RLS POLICIES CHECK ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'tournaments', 'tournament_participants', 'matches')
ORDER BY tablename; 