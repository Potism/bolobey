-- Test Specific Users
-- This will check if the problematic users exist in public.users

-- Test 1: Check if all 3 users exist in public.users
SELECT '=== TEST 1: CHECK IF USERS EXIST ===' as info;

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
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum (you)
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
ORDER BY created_at DESC;

-- Test 2: Check if these users exist in auth.users
SELECT '=== TEST 2: CHECK AUTH.USERS ===' as info;

SELECT 
    id,
    email,
    raw_user_meta_data->>'display_name' as auth_display_name,
    created_at
FROM auth.users
WHERE id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum (you)
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
ORDER BY created_at DESC;

-- Test 3: Simulate the exact frontend query
SELECT '=== TEST 3: FRONTEND QUERY SIMULATION ===' as info;

-- This is exactly what the frontend does:
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

-- Test 4: Check total count of users
SELECT '=== TEST 4: TOTAL USER COUNTS ===' as info;

SELECT 
    'Auth users total:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT 
    'Public users total:' as info2, COUNT(*) as public_count
FROM public.users;

SELECT 
    'Users with points:' as info3, COUNT(*) as points_count
FROM public.user_points;

-- Test 5: Check for any missing users
SELECT '=== TEST 5: MISSING USERS ===' as info;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'display_name' as auth_display_name,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MISSING FROM PUBLIC.USERS'
        ELSE '✅ EXISTS IN PUBLIC.USERS'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.id IN (
    '0c1f3b3b-0a0e-459d-8fe5-eb5d4206fede',  -- felix
    '574913c2-aba9-4a13-b8f4-5f022ed9837f',  -- LoremIpsum (you)
    '3a56a6b8-ea24-4486-87f7-4dd967f53aa1'   -- Unknown Player
)
ORDER BY au.created_at DESC;

SELECT '🎉 TEST COMPLETED!' as final_status; 