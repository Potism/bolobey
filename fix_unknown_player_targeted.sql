-- Fix Unknown Player Issue - Targeted Fix
-- Based on actual tournament_participants data

-- Step 1: Check current state of users in the specific tournament
SELECT '=== STEP 1: CURRENT STATE ===' as info;

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

-- Step 2: Check if these specific users exist in auth.users
SELECT '=== STEP 2: AUTH.USERS CHECK ===' as info;

SELECT 
    id,
    email,
    raw_user_meta_data->>'display_name' as auth_display_name,
    created_at
FROM auth.users
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
ORDER BY created_at DESC;

-- Step 3: Check if these users exist in public.users
SELECT '=== STEP 3: PUBLIC.USERS CHECK ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at
FROM public.users
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
ORDER BY created_at DESC;

-- Step 4: Insert missing users into public.users
SELECT '=== STEP 4: INSERTING MISSING USERS ===' as info;

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
WHERE au.id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
        EXCLUDED.display_name,
        public.users.display_name
    ),
    updated_at = NOW();

-- Step 5: Insert missing user_points
SELECT '=== STEP 5: INSERTING MISSING USER_POINTS ===' as info;

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
WHERE pu.id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
AND NOT EXISTS (
    SELECT 1 FROM public.user_points up WHERE up.user_id = pu.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Update any users with incorrect display names
SELECT '=== STEP 6: UPDATING DISPLAY NAMES ===' as info;

UPDATE public.users
SET
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        split_part(email, '@', 1),
        'User'
    ),
    updated_at = NOW()
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
AND (
    display_name IS NULL
    OR display_name = ''
    OR display_name = 'Unknown Player'
    OR display_name = 'User'
);

-- Step 7: Verify the fix
SELECT '=== STEP 7: VERIFICATION ===' as info;

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

-- Step 8: Show final user data
SELECT '=== STEP 8: FINAL USER DATA ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    updated_at
FROM public.users
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
ORDER BY updated_at DESC;

SELECT '🎉 TARGETED FIX COMPLETED!' as final_status; 