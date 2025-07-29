-- Add Missing User - Simplified Version
-- This will safely add the missing user 0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede

-- Step 1: Check if the user exists in auth.users
SELECT '=== STEP 1: CHECK AUTH.USERS ===' as info;

SELECT
    id,
    email,
    created_at
FROM auth.users
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Step 2: Add the missing user to public.users (if exists in auth.users)
SELECT '=== STEP 2: ADD MISSING USER ===' as info;

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
    'felix' as display_name,
    'player' as role,
    au.created_at,
    NOW() as updated_at,
    'PH' as country
FROM auth.users au
WHERE au.id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede'
ON CONFLICT (id) DO UPDATE SET
    display_name = 'felix',
    updated_at = NOW();

-- Step 3: Add user_points for the missing user
SELECT '=== STEP 3: ADD USER_POINTS ===' as info;

INSERT INTO public.user_points (
    user_id,
    betting_points,
    stream_points,
    total_betting_points_earned,
    total_stream_points_earned,
    created_at,
    updated_at
)
VALUES (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',
    50,
    0,
    0,
    0,
    NOW(),
    NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify the fix
SELECT '=== STEP 4: VERIFICATION ===' as info;

SELECT
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at
FROM public.users
WHERE id = '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede';

-- Step 5: Test the frontend query
SELECT '=== STEP 5: FRONTEND QUERY TEST ===' as info;

SELECT
    id,
    display_name,
    avatar_url
FROM public.users
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix (was missing)
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum (you)
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- streamerdude
);

SELECT '🎉 MISSING USER ADDED!' as final_status; 