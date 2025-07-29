-- Test Frontend Query Simulation
-- This simulates exactly what the frontend code is doing

-- Step 1: Get the tournament participants
SELECT '=== STEP 1: GET TOURNAMENT PARTICIPANTS ===' as info;
SELECT 
    user_id,
    joined_at
FROM tournament_participants 
WHERE tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205';

-- Step 2: Simulate the frontend query (exactly what the code does)
SELECT '=== STEP 2: FRONTEND QUERY SIMULATION ===' as info;
WITH participant_ids AS (
    SELECT user_id
    FROM tournament_participants 
    WHERE tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
)
SELECT 
    u.id,
    u.display_name,
    u.avatar_url,
    CASE 
        WHEN u.id IS NULL THEN 'MISSING - WILL SHOW "Unknown Player"'
        ELSE 'FOUND - WILL SHOW CORRECT NAME'
    END as status
FROM participant_ids p
LEFT JOIN public.users u ON p.user_id = u.id;

-- Step 3: Check if users exist in auth.users
SELECT '=== STEP 3: CHECK AUTH.USERS ===' as info;
WITH participant_ids AS (
    SELECT user_id
    FROM tournament_participants 
    WHERE tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
)
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE 
        WHEN au.id IS NULL THEN 'MISSING FROM AUTH.USERS'
        ELSE 'EXISTS IN AUTH.USERS'
    END as auth_status
FROM participant_ids p
LEFT JOIN auth.users au ON p.user_id = au.id;

-- Step 4: Check RLS policies on public.users
SELECT '=== STEP 4: CHECK RLS POLICIES ===' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Step 5: Test direct query without RLS
SELECT '=== STEP 5: TEST DIRECT QUERY (BYPASS RLS) ===' as info;
WITH participant_ids AS (
    SELECT user_id
    FROM tournament_participants 
    WHERE tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
)
SELECT 
    u.id,
    u.display_name,
    u.avatar_url
FROM participant_ids p
LEFT JOIN public.users u ON p.user_id = u.id;

-- Step 6: Check if there are any users in public.users at all
SELECT '=== STEP 6: CHECK ALL USERS IN PUBLIC.USERS ===' as info;
SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

SELECT '🎯 FRONTEND QUERY TEST COMPLETE!' as final_status; 