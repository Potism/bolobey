-- Debug Unknown Player Issue
-- This script will help identify why "Unknown Player" is still showing

-- Step 1: Check all users in public.users
SELECT '=== STEP 1: ALL USERS IN PUBLIC.USERS ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- Step 2: Check all auth.users
SELECT '=== STEP 2: ALL USERS IN AUTH.USERS ===' as info;

SELECT 
    id,
    email,
    raw_user_meta_data->>'display_name' as auth_display_name,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 3: Check tournament participants specifically
SELECT '=== STEP 3: TOURNAMENT PARTICIPANTS DETAILED ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    t.name as tournament_name,
    pu.display_name as user_display_name,
    pu.email as user_email,
    au.raw_user_meta_data->>'display_name' as auth_display_name,
    CASE 
        WHEN pu.display_name IS NULL OR pu.display_name = '' THEN '❌ MISSING NAME'
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
LEFT JOIN auth.users au ON tp.user_id = au.id
LEFT JOIN tournaments t ON tp.tournament_id = t.id
ORDER BY tp.joined_at DESC;

-- Step 4: Check if there are any users in auth but not in public
SELECT '=== STEP 4: USERS IN AUTH BUT NOT IN PUBLIC ===' as info;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'display_name' as auth_display_name,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MISSING FROM PUBLIC'
        ELSE '✅ EXISTS IN PUBLIC'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = au.id
WHERE pu.id IS NULL;

-- Step 5: Test the exact query that the frontend uses
SELECT '=== STEP 5: FRONTEND QUERY SIMULATION ===' as info;

-- Simulate what the live betting component does
WITH participant_data AS (
    SELECT 
        tp.id,
        tp.user_id,
        tp.tournament_id,
        tp.joined_at
    FROM tournament_participants tp
    WHERE tp.tournament_id = (
        SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1
    )
),
user_data AS (
    SELECT 
        id,
        display_name,
        avatar_url
    FROM public.users
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
        ELSE '✅ OK'
    END as status
FROM participant_data pd
LEFT JOIN user_data ud ON pd.user_id = ud.id
ORDER BY pd.joined_at DESC; 