-- Quick Fix for "Unknown Player" Issue
-- This script will fix the specific issue where users show as "Unknown Player"

-- Step 1: Ensure all users exist in public.users
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

-- Step 2: Ensure all users have user_points
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
    50 as betting_points,
    0 as stream_points,
    0 as total_betting_points_earned,
    0 as total_stream_points_earned,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users pu
LEFT JOIN public.user_points up ON pu.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Fix any users with "Unknown Player" or missing display names
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

-- Step 4: Force refresh specific problematic user
UPDATE public.users
SET
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        split_part(email, '@', 1),
        'User'
    ),
    updated_at = NOW()
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Step 5: Verify the fix
SELECT '=== VERIFICATION ===' as info;

SELECT
    'Total users:' as info1, COUNT(*) as total_users
FROM public.users;

SELECT
    'Users with proper names:' as info2, COUNT(*) as proper_names
FROM public.users
WHERE display_name IS NOT NULL
  AND display_name != ''
  AND display_name != 'Unknown Player'
  AND display_name != 'User';

-- Step 6: Check the specific user
SELECT '=== SPECIFIC USER CHECK ===' as info;

SELECT
    id,
    email,
    display_name,
    updated_at
FROM public.users
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Step 7: Check tournament participants
SELECT '=== TOURNAMENT PARTICIPANTS ===' as info;

SELECT
    tp.user_id,
    pu.display_name,
    pu.email,
    CASE
        WHEN pu.display_name IS NULL OR pu.display_name = '' THEN '❌ MISSING'
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        WHEN pu.display_name = 'User' THEN '❌ GENERIC'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC;

SELECT '🎉 QUICK FIX COMPLETED!' as final_status; 