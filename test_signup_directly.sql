-- TEST: Simulate signup directly to see what's happening
-- This will help us understand the exact issue

SELECT '=== TESTING SIGNUP DIRECTLY ===' as section;

-- 1. Check if we can access user_points table
SELECT '=== STEP 1: CHECKING USER_POINTS ACCESS ===' as section;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ Can access user_points table directly';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access user_points table: %', SQLERRM;
  END;
END $$;

-- 2. Check if there's a trigger on auth.users
SELECT '=== STEP 2: CHECKING AUTH.USERS TRIGGER ===' as section;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 3. Test creating a user profile manually
SELECT '=== STEP 3: TESTING MANUAL USER CREATION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing manual user creation with user_id: %', test_user_id;
  
  BEGIN
    -- Create user profile
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      'test-signup@example.com', 
      'Test Signup User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    );
    
    RAISE NOTICE '✅ User profile created successfully';
    
    -- Award points
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 50, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ Points awarded successfully';
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test failed: %', SQLERRM;
  END;
END $$;

-- 4. Check if there are any functions that might be causing issues
SELECT '=== STEP 4: CHECKING PROBLEMATIC FUNCTIONS ===' as section;

SELECT 
  routine_name,
  routine_schema,
  routine_type
FROM information_schema.routines 
WHERE routine_definition LIKE '%user_points%'
  AND routine_schema = 'public';

-- 5. Show the current handle_new_user function
SELECT '=== STEP 5: CURRENT HANDLE_NEW_USER FUNCTION ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- Show function definition if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') THEN
    RAISE NOTICE 'Function definition: %', (
      SELECT pg_get_functiondef(oid)
      FROM pg_proc 
      WHERE proname = 'handle_new_user' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    );
  END IF;
END $$;

-- 6. Final diagnosis
SELECT '=== DIAGNOSIS COMPLETE ===' as section;
SELECT 'If the manual test works but signup fails, the issue is in the trigger.' as note1;
SELECT 'If the manual test fails, the issue is with table access.' as note2;
SELECT 'The error suggests a trigger is trying to access user_points during signup.' as note3; 