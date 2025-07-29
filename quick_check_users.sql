-- Quick Check Users Status
-- Run this to see if users are missing from public.users

-- Check current counts
SELECT '=== CURRENT COUNTS ===' as info;

SELECT 
    'Auth users:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT 
    'Public users:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT 
    'Users with points:' as info3, COUNT(*) as users_with_points
FROM public.user_points;

-- Check for missing users
SELECT '=== MISSING USERS ===' as info;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'display_name' as auth_display_name,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MISSING FROM PUBLIC.USERS'
        ELSE '✅ EXISTS'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Check tournament participants
SELECT '=== TOURNAMENT PARTICIPANTS ===' as info;

SELECT 
    tp.user_id,
    pu.display_name as user_display_name,
    pu.email as user_email,
    CASE 
        WHEN pu.display_name IS NULL OR pu.display_name = '' THEN '❌ MISSING NAME'
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC
LIMIT 10; 