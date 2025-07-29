-- Force Fix Unknown Player Issue
-- This script will aggressively fix the issue by ensuring all users exist and have correct names

-- Step 1: Force insert/update all users from auth.users to public.users
SELECT '=== STEP 1: FORCE SYNC ALL USERS ===' as info;

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
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- Step 2: Force insert/update user_points for all users
SELECT '=== STEP 2: FORCE SYNC USER_POINTS ===' as info;

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
ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- Step 3: Force update specific problematic users
SELECT '=== STEP 3: FORCE UPDATE SPECIFIC USERS ===' as info;

-- Update felix
UPDATE public.users
SET
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        'felix',
        split_part(email, '@', 1)
    ),
    updated_at = NOW()
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Update the third user
UPDATE public.users
SET
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        split_part(email, '@', 1),
        'Player'
    ),
    updated_at = NOW()
WHERE id = '3a56a6b8-ea24-4486-87f7-4dd967f53aa1';

-- Step 4: Verify the fix
SELECT '=== STEP 4: VERIFICATION ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    pu.display_name as user_display_name,
    pu.email as user_email,
    CASE
        WHEN pu.display_name IS NULL OR pu.display_name = '' THEN '❌ MISSING NAME'
        WHEN pu.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        WHEN pu.display_name = 'User' THEN '❌ GENERIC'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
WHERE tp.tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
ORDER BY tp.joined_at DESC;

-- Step 5: Show final user data
SELECT '=== STEP 5: FINAL USER DATA ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    updated_at
FROM public.users
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum (you)
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
ORDER BY updated_at DESC;

-- Step 6: Test the exact frontend query
SELECT '=== STEP 6: FRONTEND QUERY TEST ===' as info;

SELECT 
    id,
    display_name,
    avatar_url
FROM public.users
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum (you)
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
);

SELECT '🎉 FORCE FIX COMPLETED!' as final_status; 