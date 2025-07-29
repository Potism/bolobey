-- Check Display Names Diagnostic
-- This script checks the current state of users and their display names

-- Step 1: Check auth.users table
SELECT '=== STEP 1: AUTH.USERS TABLE ===' as info;

SELECT 
    id,
    email,
    raw_user_meta_data->>'display_name' as display_name_from_metadata,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check public.users table
SELECT '=== STEP 2: PUBLIC.USERS TABLE ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Compare auth vs public users
SELECT '=== STEP 3: COMPARISON ===' as info;

SELECT 
    'Auth users count:' as info1, COUNT(*) as auth_count
FROM auth.users;

SELECT 
    'Public users count:' as info2, COUNT(*) as public_count
FROM public.users;

-- Step 4: Find users with missing display names
SELECT '=== STEP 4: USERS WITH MISSING DISPLAY NAMES ===' as info;

SELECT 
    pu.id,
    pu.email,
    pu.display_name as public_display_name,
    au.raw_user_meta_data->>'display_name' as auth_display_name,
    CASE 
        WHEN pu.display_name IS NULL OR pu.display_name = '' THEN 'MISSING'
        WHEN pu.display_name = 'Unknown Player' THEN 'UNKNOWN'
        ELSE 'OK'
    END as status
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.display_name IS NULL 
   OR pu.display_name = '' 
   OR pu.display_name = 'Unknown Player'
ORDER BY pu.created_at DESC;

-- Step 5: Show sample tournament participants
SELECT '=== STEP 5: SAMPLE TOURNAMENT PARTICIPANTS ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    pu.display_name as user_display_name,
    pu.email as user_email,
    tp.joined_at
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC
LIMIT 10;

-- Step 6: Check for users with proper display names
SELECT '=== STEP 6: USERS WITH PROPER DISPLAY NAMES ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
WHERE display_name IS NOT NULL 
  AND display_name != '' 
  AND display_name != 'Unknown Player'
ORDER BY created_at DESC
LIMIT 10; 