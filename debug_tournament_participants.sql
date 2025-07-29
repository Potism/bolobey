-- Debug script for tournament participants "Unknown Player" issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- Step 1: Check if the tournament exists
SELECT '=== STEP 1: CHECKING TOURNAMENT ===' as info;

SELECT 
    id,
    name,
    status,
    created_at,
    created_by
FROM tournaments 
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

-- Step 2: Check all participants in this tournament
SELECT '=== STEP 2: CHECKING ALL PARTICIPANTS ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    tp.joined_at,
    u.display_name,
    u.email,
    u.created_at as user_created_at,
    CASE 
        WHEN u.display_name = 'Unknown Player' THEN '❌ UNKNOWN PLAYER'
        WHEN u.display_name IS NULL THEN '❌ NULL'
        WHEN u.display_name = '' THEN '❌ EMPTY'
        WHEN u.id IS NULL THEN '❌ USER NOT FOUND'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
ORDER BY tp.joined_at DESC;

-- Step 3: Check if there are any users with "Unknown Player" names
SELECT '=== STEP 3: CHECKING ALL USERS WITH UNKNOWN PLAYER ===' as info;

SELECT 
    id,
    email,
    display_name,
    created_at,
    updated_at
FROM users
WHERE display_name = 'Unknown Player'
   OR display_name IS NULL
   OR display_name = ''
ORDER BY created_at DESC;

-- Step 4: Check the tournament creator
SELECT '=== STEP 4: CHECKING TOURNAMENT CREATOR ===' as info;

SELECT 
    t.id as tournament_id,
    t.name as tournament_name,
    t.created_by as creator_user_id,
    u.display_name as creator_display_name,
    u.email as creator_email,
    CASE 
        WHEN u.display_name = 'Unknown Player' THEN '❌ UNKNOWN PLAYER'
        WHEN u.display_name IS NULL THEN '❌ NULL'
        WHEN u.display_name = '' THEN '❌ EMPTY'
        WHEN u.id IS NULL THEN '❌ USER NOT FOUND'
        ELSE '✅ OK'
    END as creator_status
FROM tournaments t
LEFT JOIN users u ON t.created_by = u.id
WHERE t.id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

-- Step 5: Check if there are any auth.users that don't have corresponding public.users
SELECT '=== STEP 5: CHECKING AUTH.USERS vs PUBLIC.USERS ===' as info;

-- Note: This might not work in Supabase SQL Editor due to permissions
-- But let's try to see if we can identify missing users

SELECT 
    'Checking for users in tournament_participants that might not exist in users table' as note;

SELECT 
    tp.user_id,
    tp.tournament_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ USER NOT FOUND IN PUBLIC.USERS'
        ELSE '✅ USER EXISTS'
    END as user_exists
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
  AND u.id IS NULL;

-- Step 6: Simulate the exact query the frontend uses
SELECT '=== STEP 6: SIMULATING FRONTEND QUERY ===' as info;

-- This simulates what the frontend does:
-- 1. Get participants
-- 2. Get user IDs
-- 3. Fetch users separately

WITH participant_data AS (
    SELECT 
        tp.id,
        tp.user_id,
        tp.tournament_id,
        tp.joined_at
    FROM tournament_participants tp
    WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
),
user_data AS (
    SELECT 
        id,
        display_name,
        avatar_url
    FROM users
    WHERE id IN (
        SELECT user_id FROM participant_data
    )
)
SELECT 
    pd.id as participant_id,
    pd.user_id,
    pd.tournament_id,
    ud.display_name,
    ud.avatar_url,
    CASE 
        WHEN ud.display_name IS NULL OR ud.display_name = '' THEN '❌ MISSING'
        WHEN ud.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        WHEN ud.id IS NULL THEN '❌ USER NOT FOUND'
        ELSE '✅ OK'
    END as status
FROM participant_data pd
LEFT JOIN user_data ud ON pd.user_id = ud.id
ORDER BY pd.joined_at DESC; 