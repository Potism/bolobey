-- Sync missing users from auth.users to public.users
-- This will create user profiles for auth users that don't have them

-- Step 1: Check which auth users don't have public profiles
SELECT 
    'Missing user profiles:' as info,
    au.id,
    au.email,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Step 2: Create user profiles for missing auth users
INSERT INTO users (id, email, display_name, role, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        au.raw_user_meta_data->>'name',
        SPLIT_PART(au.email, '@', 1),
        'User'
    ) as display_name,
    'player' as role,
    au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Step 3: Create user_points for the new users
INSERT INTO user_points (user_id, betting_points, stream_points)
SELECT 
    u.id,
    50 as betting_points,
    0 as stream_points
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- Step 4: Verify the fix
SELECT 
    'Verification - All users now have profiles:' as info,
    COUNT(*) as total_users
FROM users;

-- Step 5: Check tournament participants now have user profiles
SELECT 
    'Tournament participants with user profiles:' as info,
    tp.id as participant_id,
    tp.user_id,
    u.display_name,
    u.email
FROM tournament_participants tp
JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eff49c0e-7e49-435d-b0da-f3a6fdb10ffa'; 