-- Fix Signup Display Name Issue
-- This script fixes the create_user_profile_safe function to properly handle display names

-- Step 1: Check if the function exists
SELECT '=== STEP 1: CHECKING FUNCTION ===' as info;

SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_user_profile_safe';

-- Step 2: Drop and recreate the function with proper display name handling
SELECT '=== STEP 2: RECREATING FUNCTION ===' as info;

DROP FUNCTION IF EXISTS public.create_user_profile_safe;

CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
    user_id UUID,
    user_email TEXT,
    display_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into users table with proper display name
    INSERT INTO public.users (
        id,
        email,
        display_name,
        role,
        created_at,
        updated_at,
        country
    )
    VALUES (
        user_id,
        user_email,
        COALESCE(display_name, split_part(user_email, '@', 1), 'User'),
        'player',
        NOW(),
        NOW(),
        'PH'
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        updated_at = NOW();

    -- Insert into user_points table
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
        user_id,
        50,  -- Starting betting points
        0,   -- Starting stream points
        0,   -- Total earned betting points
        0,   -- Total earned stream points
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in create_user_profile_safe: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Step 3: Test the function
SELECT '=== STEP 3: TESTING FUNCTION ===' as info;

-- Create a test user profile
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    result BOOLEAN;
BEGIN
    RAISE NOTICE 'Testing with user_id: %', test_user_id;
    
    result := public.create_user_profile_safe(
        test_user_id,
        'test@example.com',
        'Test User'
    );
    
    IF result THEN
        RAISE NOTICE '✅ Function test successful';
        
        -- Verify the user was created
        RAISE NOTICE 'User display_name: %', (
            SELECT display_name FROM public.users WHERE id = test_user_id
        );
        
        -- Verify points were created
        RAISE NOTICE 'User betting_points: %', (
            SELECT betting_points FROM public.user_points WHERE user_id = test_user_id
        );
        
        -- Clean up
        DELETE FROM public.user_points WHERE user_id = test_user_id;
        DELETE FROM public.users WHERE id = test_user_id;
        RAISE NOTICE '✅ Test data cleaned up';
    ELSE
        RAISE NOTICE '❌ Function test failed';
    END IF;
END $$;

-- Step 4: Fix existing users with missing display names
SELECT '=== STEP 4: FIXING EXISTING USERS ===' as info;

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

-- Step 5: Verify the fix
SELECT '=== STEP 5: VERIFICATION ===' as info;

SELECT 
    'Function exists:' as info1, EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'create_user_profile_safe'
    ) as function_exists,
    'Users with proper names:' as info2, COUNT(*) as proper_names
FROM public.users
WHERE display_name IS NOT NULL 
  AND display_name != '' 
  AND display_name != 'Unknown Player'
  AND display_name != 'User';

-- Step 6: Show sample users
SELECT '=== STEP 6: SAMPLE USERS ===' as info;

SELECT 
    id,
    email,
    display_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

SELECT '🎉 SIGNUP DISPLAY NAME FIX COMPLETED!' as final_status; 