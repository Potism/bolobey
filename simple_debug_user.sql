-- Simple Debug for User Issue
-- This script will help us understand why user 0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede shows as "Unknown Player"

-- Step 1: Check the specific user in all tables
SELECT '=== STEP 1: CHECKING SPECIFIC USER ===' as info;

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

-- Step 3: Find the tournament this user is participating in
SELECT '=== STEP 3: FIND USER TOURNAMENT ===' as info;

SELECT 
    tp.tournament_id,
    t.name as tournament_name
FROM tournament_participants tp
LEFT JOIN tournaments t ON tp.tournament_id = t.id
WHERE tp.user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede'
LIMIT 1;

-- Step 4: Get all participants in that tournament
SELECT '=== STEP 4: ALL PARTICIPANTS IN TOURNAMENT ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    tp.joined_at
FROM tournament_participants tp
WHERE tp.tournament_id = (
    SELECT tp2.tournament_id 
    FROM tournament_participants tp2 
    WHERE tp2.user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede' 
    LIMIT 1
);

-- Step 5: Check if these users exist in public.users
SELECT '=== STEP 5: USERS IN PUBLIC.USERS ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
WHERE id IN (
    SELECT tp.user_id
    FROM tournament_participants tp
    WHERE tp.tournament_id = (
        SELECT tp2.tournament_id 
        FROM tournament_participants tp2 
        WHERE tp2.user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede' 
        LIMIT 1
    )
);

-- Step 6: Simulate the frontend query result
SELECT '=== STEP 6: FRONTEND QUERY SIMULATION ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    tp.joined_at,
    pu.display_name as user_display_name,
    pu.avatar_url,
    CASE 
        WHEN pu.display_name IS NULL THEN '❌ NULL - Will show "Unknown Player"'
        WHEN pu.display_name = '' THEN '❌ EMPTY - Will show "Unknown Player"'
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN - Will show "Unknown Player"'
        ELSE '✅ OK - Will show "' || pu.display_name || '"'
    END as mapping_result
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
WHERE tp.tournament_id = (
    SELECT tp2.tournament_id 
    FROM tournament_participants tp2 
    WHERE tp2.user_id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede' 
    LIMIT 1
)
ORDER BY tp.joined_at DESC;

-- Step 7: Force refresh the user data
SELECT '=== STEP 7: FORCE REFRESH USER ===' as info;

-- Update the user to ensure latest data
UPDATE public.users
SET
    updated_at = NOW(),
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        split_part(email, '@', 1),
        'User'
    )
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Verify the update
SELECT 
    'After force refresh:' as info1,
    display_name,
    updated_at
FROM public.users 
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

SELECT '🎉 SIMPLE DIAGNOSTIC COMPLETED!' as final_status; 