-- Fix Database to Align with Working Page (display_name)
-- This script updates the database to match the working tournament page structure

-- Step 1: Check current state
SELECT '=== STEP 1: CHECKING CURRENT STATE ===' as info;

SELECT
    'Auth users count:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT
    'Public users count:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT
    'Users with points:' as info3, COUNT(*) as users_with_points
FROM public.user_points;

-- Step 2: Ensure all users exist in public.users with proper display_name
SELECT '=== STEP 2: SYNCING USERS TO PUBLIC.USERS ===' as info;

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

-- Step 3: Ensure all users have user_points
SELECT '=== STEP 3: SYNCING USER_POINTS ===' as info;

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

-- Step 4: Update existing users with missing or incorrect display names
SELECT '=== STEP 4: UPDATING DISPLAY NAMES ===' as info;

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

-- Step 5: Verify tournament participants have proper display names
SELECT '=== STEP 5: VERIFYING TOURNAMENT PARTICIPANTS ===' as info;

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
        WHEN pu.display_name = 'User' THEN '❌ GENERIC'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC;

-- Step 6: Check matches for proper player names
SELECT '=== STEP 6: VERIFYING MATCHES ===' as info;

SELECT
    m.id as match_id,
    m.tournament_id,
    m.player1_id,
    p1.display_name as player1_name,
    m.player2_id,
    p2.display_name as player2_name,
    m.status,
    m.round,
    m.match_number,
    CASE
        WHEN p1.display_name IS NULL OR p1.display_name = '' THEN '❌ PLAYER1 MISSING'
        WHEN p2.display_name IS NULL OR p2.display_name = '' THEN '❌ PLAYER2 MISSING'
        ELSE '✅ OK'
    END as status
FROM matches m
LEFT JOIN public.users p1 ON m.player1_id = p1.id
LEFT JOIN public.users p2 ON m.player2_id = p2.id
ORDER BY m.created_at DESC;

-- Step 7: Final verification
SELECT '=== STEP 7: FINAL VERIFICATION ===' as info;

SELECT
    'Total auth users:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT
    'Total public users:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT
    'Users with points:' as info3, COUNT(*) as users_with_points
FROM public.user_points;

SELECT
    'Users with proper names:' as info4, COUNT(*) as proper_names
FROM public.users
WHERE display_name IS NOT NULL
  AND display_name != ''
  AND display_name != 'Unknown Player'
  AND display_name != 'User';

-- Step 8: Show sample fixed users
SELECT '=== STEP 8: SAMPLE FIXED USERS ===' as info;

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

-- Step 9: Show sample tournament participants
SELECT '=== STEP 9: SAMPLE TOURNAMENT PARTICIPANTS ===' as info;

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
        WHEN pu.display_name = 'User' THEN '❌ GENERIC'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC
LIMIT 10;

SELECT '🎉 DATABASE ALIGNMENT COMPLETED!' as final_status;
SELECT 'Your database now matches your working page structure!' as message; 