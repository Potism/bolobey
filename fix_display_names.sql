-- Fix Display Names Script
-- This script updates users with missing or incorrect display names

-- Step 1: Update users with missing display names
SELECT '=== STEP 1: UPDATING MISSING DISPLAY NAMES ===' as info;

UPDATE public.users 
SET 
    display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE auth.users.id = public.users.id),
        split_part(email, '@', 1),
        'User'
    ),
    updated_at = NOW()
WHERE 
    display_name IS NULL 
    OR display_name = '' 
    OR display_name = 'Unknown Player'
    OR display_name = 'User';

-- Step 2: Show the results
SELECT '=== STEP 2: UPDATED USERS ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    updated_at
FROM public.users
WHERE updated_at > NOW() - INTERVAL '1 minute'
ORDER BY updated_at DESC;

-- Step 3: Verify all users now have proper display names
SELECT '=== STEP 3: VERIFICATION ===' as info;

SELECT 
    'Total users:' as info1, COUNT(*) as total_users
FROM public.users;

SELECT 
    'Users with proper display names:' as info2, COUNT(*) as proper_names
FROM public.users
WHERE display_name IS NOT NULL 
  AND display_name != '' 
  AND display_name != 'Unknown Player'
  AND display_name != 'User';

SELECT 
    'Users still needing fixes:' as info3, COUNT(*) as needs_fix
FROM public.users
WHERE display_name IS NULL 
   OR display_name = '' 
   OR display_name = 'Unknown Player'
   OR display_name = 'User';

-- Step 4: Show final sample of users
SELECT '=== STEP 4: FINAL SAMPLE ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Show sample tournament participants with fixed names
SELECT '=== STEP 5: TOURNAMENT PARTICIPANTS WITH FIXED NAMES ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    pu.display_name as user_display_name,
    pu.email as user_email,
    tp.joined_at
FROM tournament_participants tp
LEFT JOIN public.users pu ON tp.user_id = pu.id
ORDER BY tp.joined_at DESC
LIMIT 10;

SELECT '🎉 DISPLAY NAMES FIXED!' as final_status; 