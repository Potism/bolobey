-- Diagnose Current Database State
-- This will help us understand what users exist and what's missing

-- Step 1: Check auth.users table
SELECT '=== STEP 1: AUTH.USERS TABLE ===' as info;
SELECT 
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 2: Check public.users table
SELECT '=== STEP 2: PUBLIC.USERS TABLE ===' as info;
SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- Step 3: Check user_points table
SELECT '=== STEP 3: USER_POINTS TABLE ===' as info;
SELECT 
    user_id,
    betting_points,
    stream_points,
    created_at
FROM user_points
ORDER BY created_at DESC;

-- Step 4: Check tournament_participants
SELECT '=== STEP 4: TOURNAMENT PARTICIPANTS ===' as info;
SELECT 
    tp.id,
    tp.tournament_id,
    tp.user_id,
    tp.joined_at,
    u.display_name
FROM tournament_participants tp
LEFT JOIN public.users u ON tp.user_id = u.id
ORDER BY tp.joined_at DESC;

-- Step 5: Find missing users (users in participants but not in public.users)
SELECT '=== STEP 5: MISSING USERS ANALYSIS ===' as info;
SELECT 
    tp.user_id,
    tp.joined_at,
    CASE 
        WHEN u.id IS NULL THEN 'MISSING FROM PUBLIC.USERS'
        ELSE 'EXISTS IN PUBLIC.USERS'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users u ON tp.user_id = u.id
WHERE u.id IS NULL
ORDER BY tp.joined_at DESC;

-- Step 6: Check specific user that was causing issues
SELECT '=== STEP 6: SPECIFIC USER CHECK ===' as info;
SELECT 
    'auth.users' as table_name,
    id,
    email,
    created_at
FROM auth.users 
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede'

UNION ALL

SELECT 
    'public.users' as table_name,
    id,
    email,
    created_at
FROM public.users 
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede'

UNION ALL

SELECT 
    'user_points' as table_name,
    user_id as id,
    betting_points::text as email,
    created_at
FROM user_points 
WHERE user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

SELECT '🎯 DIAGNOSIS COMPLETE!' as final_status; 