-- Debug Specific User Issue
-- This script will help us understand why user 0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede shows as "Unknown Player"

-- Step 1: Check the specific user in all tables
SELECT '=== STEP 1: CHECKING SPECIFIC USER ===' as info;

SELECT 
    'User ID to check:' as info1, '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede' as user_id;

-- Check in auth.users
SELECT '=== AUTH.USERS ===' as info;

SELECT 
    id,
    email,
    raw_user_meta_data->>'display_name' as auth_display_name,
    created_at
FROM auth.users 
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Check in public.users
SELECT '=== PUBLIC.USERS ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at
FROM public.users 
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Check in user_points
SELECT '=== USER_POINTS ===' as info;

SELECT 
    user_id,
    betting_points,
    stream_points,
    created_at
FROM public.user_points 
WHERE user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Step 2: Check tournament participation
SELECT '=== STEP 2: TOURNAMENT PARTICIPATION ===' as info;

SELECT 
    tp.id as participant_id,
    tp.tournament_id,
    t.name as tournament_name,
    tp.joined_at,
    pu.display_name as user_display_name,
    pu.email as user_email
FROM tournament_participants tp
LEFT JOIN tournaments t ON tp.tournament_id = t.id
LEFT JOIN public.users pu ON tp.user_id = pu.id
WHERE tp.user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Step 3: Simulate the exact frontend query
SELECT '=== STEP 3: FRONTEND QUERY SIMULATION ===' as info;

-- This simulates what the frontend does:
-- 1. Get participant IDs for a specific tournament
-- 2. Fetch users for those IDs
-- 3. Map them together

-- First, let's find the tournament this user is participating in
WITH user_tournament AS (
    SELECT 
        tp.tournament_id,
        t.name as tournament_name
    FROM tournament_participants tp
    LEFT JOIN tournaments t ON tp.tournament_id = t.id
    WHERE tp.user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede'
    LIMIT 1
),
participant_ids AS (
    SELECT DISTINCT user_id 
    FROM tournament_participants 
    WHERE tournament_id = (SELECT tournament_id FROM user_tournament)
),
user_data AS (
    SELECT 
        id,
        display_name,
        avatar_url
    FROM public.users
    WHERE id IN (SELECT user_id FROM participant_ids)
)
SELECT 
    'Tournament:' as info1, (SELECT tournament_name FROM user_tournament) as tournament_name;

SELECT 
    'Participant IDs found:' as info2, COUNT(*) as count
FROM participant_ids;

SELECT 
    'Users found in public.users:' as info3, COUNT(*) as count
FROM user_data;

-- Step 4: Show the exact mapping result
SELECT '=== STEP 4: EXACT MAPPING RESULT ===' as info;

WITH user_tournament AS (
    SELECT 
        tp.tournament_id,
        t.name as tournament_name
    FROM tournament_participants tp
    LEFT JOIN tournaments t ON tp.tournament_id = t.id
    WHERE tp.user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede'
    LIMIT 1
),
participant_data AS (
    SELECT 
        tp.id as participant_id,
        tp.user_id,
        tp.tournament_id,
        tp.joined_at
    FROM tournament_participants tp
    WHERE tp.tournament_id = (SELECT tournament_id FROM user_tournament)
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
    pd.participant_id,
    pd.user_id,
    ud.display_name as user_display_name,
    ud.avatar_url,
    CASE 
        WHEN ud.display_name IS NULL THEN '❌ NULL - Will show "Unknown Player"'
        WHEN ud.display_name = '' THEN '❌ EMPTY - Will show "Unknown Player"'
        WHEN ud.display_name = 'Unknown Player' THEN '❌ UNKNOWN - Will show "Unknown Player"'
        ELSE '✅ OK - Will show "' || ud.display_name || '"'
    END as mapping_result
FROM participant_data pd
LEFT JOIN user_data ud ON pd.user_id = ud.id
ORDER BY pd.joined_at DESC;

-- Step 5: Check if there are any RLS (Row Level Security) issues
SELECT '=== STEP 5: RLS CHECK ===' as info;

-- Check if the user can access their own data
SELECT 
    'Can user access their own data:' as info1,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede'
        ) THEN '✅ YES'
        ELSE '❌ NO'
    END as can_access;

-- Step 6: Force refresh the user data
SELECT '=== STEP 6: FORCE REFRESH USER ===' as info;

-- Update the user to ensure latest data
UPDATE public.users
SET
    updated_at = NOW(),
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        display_name
    )
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Verify the update
SELECT 
    'After force refresh:' as info1,
    display_name,
    updated_at
FROM public.users 
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

SELECT '🎉 DIAGNOSTIC COMPLETED!' as final_status; 