-- Test Participants Fix
-- This script verifies that participant names are now displaying correctly

-- Step 1: Check if all users are synced
SELECT '=== STEP 1: USER SYNC STATUS ===' as info;

SELECT 
    'Auth users:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT 
    'Public users:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT 
    'Users with points:' as info3, COUNT(*) as users_with_points
FROM public.user_points;

-- Step 2: Check for any remaining missing users
SELECT '=== STEP 2: REMAINING MISSING USERS ===' as info;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'display_name' as auth_display_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 3: Check tournament participants
SELECT '=== STEP 3: TOURNAMENT PARTICIPANTS ===' as info;

SELECT 
    t.name as tournament_name,
    tp.user_id,
    pu.display_name as user_display_name,
    pu.email as user_email,
    tp.joined_at,
    CASE 
        WHEN pu.display_name IS NULL OR pu.display_name = '' THEN '❌ MISSING NAME'
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
LEFT JOIN tournaments t ON tp.tournament_id = t.id
ORDER BY tp.joined_at DESC
LIMIT 20;

-- Step 4: Show sample users with their display names
SELECT '=== STEP 4: SAMPLE USERS ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Test the exact query that the frontend uses
SELECT '=== STEP 5: FRONTEND QUERY TEST ===' as info;

-- This simulates what the frontend does when fetching participants
WITH participant_users AS (
    SELECT 
        tp.id,
        tp.user_id,
        tp.tournament_id,
        tp.joined_at,
        pu.display_name,
        pu.avatar_url
    FROM tournament_participants tp
    LEFT JOIN public.users pu ON tp.user_id = pu.id
    WHERE tp.tournament_id = (
        SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1
    )
)
SELECT 
    id,
    user_id,
    tournament_id,
    display_name as username,  -- This is what the frontend expects
    avatar_url,
    joined_at as created_at
FROM participant_users
ORDER BY joined_at DESC;

SELECT '🎉 PARTICIPANTS FIX VERIFICATION COMPLETED!' as final_status; 