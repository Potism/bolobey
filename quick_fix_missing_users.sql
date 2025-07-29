-- Quick Fix for Missing Users
-- This will ensure all users exist in public.users

-- Step 1: Insert any missing users
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

-- Step 2: Insert missing user_points
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

-- Step 3: Verify the fix
SELECT '=== VERIFICATION ===' as info;

SELECT 
    'Auth users:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT 
    'Public users:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT 
    'Users with points:' as info3, COUNT(*) as users_with_points
FROM public.user_points;

-- Step 4: Check tournament participants
SELECT '=== TOURNAMENT PARTICIPANTS ===' as info;

SELECT 
    tp.user_id,
    pu.display_name,
    pu.email,
    CASE 
        WHEN pu.display_name IS NULL OR pu.display_name = '' THEN '❌ MISSING'
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC;

SELECT '🎉 QUICK FIX COMPLETED!' as final_status; 