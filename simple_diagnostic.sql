-- Simple Diagnostic Script
-- This will definitely return results to identify the issue

-- Step 1: Check if the tournament exists
SELECT 'STEP 1: TOURNAMENT EXISTS?' as step;
SELECT 
    id,
    name,
    created_at
FROM tournaments 
WHERE id = '1775d146-c3eb-4500-8afe-c74aa5bdd205';

-- Step 2: Check all tournaments (in case the ID is wrong)
SELECT 'STEP 2: ALL TOURNAMENTS' as step;
SELECT 
    id,
    name,
    created_at
FROM tournaments 
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check all users in public.users
SELECT 'STEP 3: ALL USERS IN PUBLIC.USERS' as step;
SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check all tournament participants
SELECT 'STEP 4: ALL TOURNAMENT PARTICIPANTS' as step;
SELECT 
    tp.id,
    tp.tournament_id,
    tp.user_id,
    tp.joined_at,
    u.display_name
FROM tournament_participants tp
LEFT JOIN public.users u ON tp.user_id = u.id
ORDER BY tp.joined_at DESC
LIMIT 10;

-- Step 5: Check auth.users
SELECT 'STEP 5: ALL AUTH.USERS' as step;
SELECT 
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

SELECT 'DIAGNOSTIC COMPLETE!' as final_status; 