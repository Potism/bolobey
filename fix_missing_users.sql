-- Fix Missing Users Script
-- This script checks for users that exist in auth.users but not in public.users
-- and creates them in public.users with proper display names

-- Step 1: Check for missing users
SELECT '=== STEP 1: CHECKING FOR MISSING USERS ===' as info;

SELECT 
    'Auth users count:' as info1, COUNT(*) as auth_users_count
FROM auth.users;

SELECT 
    'Public users count:' as info2, COUNT(*) as public_users_count
FROM public.users;

-- Step 2: Find users that exist in auth.users but not in public.users
SELECT '=== STEP 2: FINDING MISSING USERS ===' as info;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'display_name' as display_name_from_metadata,
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        split_part(au.email, '@', 1)
    ) as suggested_display_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 3: Create missing users in public.users
SELECT '=== STEP 3: CREATING MISSING USERS ===' as info;

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
    'player',
    COALESCE(au.created_at, NOW()),
    NOW(),
    'PH'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create missing user_points for new users
SELECT '=== STEP 4: CREATING MISSING USER_POINTS ===' as info;

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
    pu.id,
    50,  -- Starting betting points
    0,   -- Starting stream points
    0,   -- Total earned betting points
    0,   -- Total earned stream points
    NOW(),
    NOW()
FROM public.users pu
LEFT JOIN public.user_points up ON pu.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Verify the fix
SELECT '=== STEP 5: VERIFICATION ===' as info;

SELECT 
    'Final auth users count:' as info1, COUNT(*) as auth_users_count
FROM auth.users;

SELECT 
    'Final public users count:' as info2, COUNT(*) as public_users_count
FROM public.users;

SELECT 
    'Final user_points count:' as info3, COUNT(*) as user_points_count
FROM public.user_points;

-- Step 6: Show sample users to verify display names
SELECT '=== STEP 6: SAMPLE USERS ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

SELECT '🎉 MISSING USERS FIX COMPLETED!' as final_status; 