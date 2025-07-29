-- Quick Diagnostic for Unknown Player Issue
-- Run this first to understand the problem

-- Check the current state
SELECT '=== CURRENT STATE ===' as info;

SELECT 
    'Auth users:' as info1, COUNT(*) as count
FROM auth.users;

SELECT 
    'Public users:' as info2, COUNT(*) as count
FROM public.users;

SELECT 
    'Users with points:' as info3, COUNT(*) as count
FROM public.user_points;

-- Check for missing users
SELECT '=== MISSING USERS ===' as info;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'display_name' as auth_name,
    CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as in_public
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Check for users with "Unknown Player" names
SELECT '=== UNKNOWN PLAYERS ===' as info;

SELECT 
    pu.id,
    pu.email,
    pu.display_name,
    au.raw_user_meta_data->>'display_name' as auth_name
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.display_name = 'Unknown Player'
   OR pu.display_name IS NULL
   OR pu.display_name = ''
ORDER BY pu.created_at DESC;

-- Check tournament participants
SELECT '=== TOURNAMENT PARTICIPANTS ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    pu.display_name,
    pu.email,
    CASE 
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        WHEN pu.display_name IS NULL THEN '❌ NULL'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC
LIMIT 10; 