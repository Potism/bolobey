-- Fix Missing Users - Complete Sync
-- This script will sync all missing users from auth.users to public.users

-- Step 1: Check current state
SELECT '=== STEP 1: CURRENT STATE ===' as info;

SELECT 
    'Auth users count:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT 
    'Public users count:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT 
    'Users with points:' as info3, COUNT(*) as users_with_points
FROM public.user_points;

-- Step 2: Find missing users
SELECT '=== STEP 2: MISSING USERS ===' as info;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'display_name' as auth_display_name,
    au.created_at as auth_created_at,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MISSING'
        ELSE '✅ EXISTS'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 3: Insert missing users into public.users
SELECT '=== STEP 3: INSERTING MISSING USERS ===' as info;

INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at,
    country
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        split_part(au.email, '@', 1),
        'User'
    ) as display_name,
    'player' as role,
    au.created_at,
    NOW() as updated_at,
    'PH' as country
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
        EXCLUDED.display_name,
        public.users.display_name
    ),
    updated_at = NOW();

-- Step 4: Insert missing user_points for new users
SELECT '=== STEP 4: INSERTING MISSING USER_POINTS ===' as info;

INSERT INTO public.user_points (
    user_id,
    betting_points,
    stream_points,
    total_betting_points_earned,
    total_stream_points_earned,
    created_at,
    updated_at
)
SELECT 
    pu.id as user_id,
    50 as betting_points,  -- Starting betting points
    0 as stream_points,    -- Starting stream points
    0 as total_betting_points_earned,
    0 as total_stream_points_earned,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users pu
LEFT JOIN public.user_points up ON pu.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Update existing users with missing display names
SELECT '=== STEP 5: UPDATING MISSING DISPLAY NAMES ===' as info;

UPDATE public.users 
SET 
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        split_part(email, '@', 1),
        'User'
    ),
    updated_at = NOW()
WHERE 
    display_name IS NULL 
    OR display_name = '' 
    OR display_name = 'Unknown Player'
    OR display_name = 'User';

-- Step 6: Verify the fix
SELECT '=== STEP 6: VERIFICATION ===' as info;

SELECT 
    'Total auth users:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT 
    'Total public users:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT 
    'Users with proper names:' as info3, COUNT(*) as proper_names
FROM public.users
WHERE display_name IS NOT NULL 
  AND display_name != '' 
  AND display_name != 'Unknown Player'
  AND display_name != 'User';

SELECT 
    'Users with points:' as info4, COUNT(*) as users_with_points
FROM public.user_points;

-- Step 7: Show sample fixed users
SELECT '=== STEP 7: SAMPLE FIXED USERS ===' as info;

SELECT 
    pu.id,
    pu.email,
    pu.display_name,
    pu.role,
    pu.created_at,
    up.betting_points,
    up.stream_points
FROM public.users pu
LEFT JOIN public.user_points up ON pu.id = up.user_id
ORDER BY pu.created_at DESC
LIMIT 10;

-- Step 8: Show sample tournament participants
SELECT '=== STEP 8: SAMPLE TOURNAMENT PARTICIPANTS ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
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
ORDER BY tp.joined_at DESC
LIMIT 10;

SELECT '🎉 MISSING USERS SYNC COMPLETED!' as final_status; 