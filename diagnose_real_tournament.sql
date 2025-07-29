-- Diagnose Real Tournament: 1775d146-c3eb-4500-8afe-c74aa5bdd205
-- This will check the specific tournament that's showing "Unknown Player"

-- Step 1: Check the specific tournament
SELECT '=== STEP 1: REAL TOURNAMENT CHECK ===' as info;
SELECT 
    id,
    name,
    created_by,
    created_at,
    status
FROM tournaments 
WHERE id = '1775d146-c3eb-4500-8afe-c74aa5bdd205';

-- Step 2: Check participants in this specific tournament
SELECT '=== STEP 2: TOURNAMENT PARTICIPANTS ===' as info;
SELECT 
    tp.id,
    tp.tournament_id,
    tp.user_id,
    tp.joined_at,
    u.display_name,
    u.email,
    CASE 
        WHEN u.id IS NULL THEN 'MISSING FROM PUBLIC.USERS'
        ELSE 'EXISTS IN PUBLIC.USERS'
    END as status
FROM tournament_participants tp
LEFT JOIN public.users u ON tp.user_id = u.id
WHERE tp.tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
ORDER BY tp.joined_at DESC;

-- Step 3: Check if these users exist in auth.users
SELECT '=== STEP 3: AUTH.USERS CHECK ===' as info;
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE 
        WHEN tp.user_id IS NOT NULL THEN 'TOURNAMENT PARTICIPANT'
        ELSE 'NOT IN TOURNAMENT'
    END as participant_status
FROM auth.users au
LEFT JOIN tournament_participants tp ON au.id = tp.user_id 
    AND tp.tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
WHERE tp.user_id IS NOT NULL
ORDER BY au.created_at DESC;

-- Step 4: Check user_points for tournament participants
SELECT '=== STEP 4: USER_POINTS CHECK ===' as info;
SELECT 
    up.user_id,
    up.betting_points,
    up.stream_points,
    u.display_name,
    CASE 
        WHEN u.id IS NULL THEN 'MISSING FROM PUBLIC.USERS'
        ELSE 'EXISTS IN PUBLIC.USERS'
    END as status
FROM user_points up
LEFT JOIN public.users u ON up.user_id = u.id
WHERE up.user_id IN (
    SELECT user_id 
    FROM tournament_participants 
    WHERE tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
)
ORDER BY up.created_at DESC;

-- Step 5: Find missing users (in tournament but not in public.users)
SELECT '=== STEP 5: MISSING USERS IN REAL TOURNAMENT ===' as info;
SELECT 
    tp.user_id,
    tp.joined_at,
    au.email,
    'MISSING FROM PUBLIC.USERS' as status
FROM tournament_participants tp
LEFT JOIN public.users u ON tp.user_id = u.id
LEFT JOIN auth.users au ON tp.user_id = au.id
WHERE tp.tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
    AND u.id IS NULL
ORDER BY tp.joined_at DESC;

-- Step 6: Simulate the frontend query for this tournament
SELECT '=== STEP 6: FRONTEND QUERY SIMULATION ===' as info;
SELECT 
    tp.user_id,
    u.display_name,
    u.avatar_url,
    CASE 
        WHEN u.display_name IS NULL THEN 'WILL SHOW AS "Unknown Player"'
        ELSE 'WILL SHOW CORRECT NAME'
    END as frontend_result
FROM tournament_participants tp
LEFT JOIN public.users u ON tp.user_id = u.id
WHERE tp.tournament_id = '1775d146-c3eb-4500-8afe-c74aa5bdd205'
ORDER BY tp.joined_at DESC;

SELECT '🎯 REAL TOURNAMENT DIAGNOSIS COMPLETE!' as final_status; 