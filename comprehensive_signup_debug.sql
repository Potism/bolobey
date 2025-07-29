-- COMPREHENSIVE SIGNUP DEBUG
-- This will find the exact cause of the signup failure

SELECT '=== COMPREHENSIVE SIGNUP DEBUG ===' as section;

-- 1. Check all triggers that could be causing issues
SELECT '=== STEP 1: ALL TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema IN ('auth', 'public')
ORDER BY event_object_schema, event_object_table, trigger_name;

-- 2. Check all functions that reference user_points
SELECT '=== STEP 2: FUNCTIONS REFERENCING USER_POINTS ===' as section;

SELECT 
  routine_name,
  routine_schema,
  routine_type
FROM information_schema.routines 
WHERE routine_definition LIKE '%user_points%'
  AND routine_schema = 'public';

-- 3. Show the current handle_new_user function definition
SELECT '=== STEP 3: CURRENT HANDLE_NEW_USER FUNCTION ===' as section;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') THEN
    RAISE NOTICE 'Function exists. Definition:';
    RAISE NOTICE '%', (
      SELECT pg_get_functiondef(oid)
      FROM pg_proc 
      WHERE proname = 'handle_new_user' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    );
  ELSE
    RAISE NOTICE 'handle_new_user function does not exist';
  END IF;
END $$;

-- 4. Test if we can access user_points table
SELECT '=== STEP 4: TESTING USER_POINTS ACCESS ===' as section;

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

-- 5. Test if we can access users table
SELECT '=== STEP 5: TESTING USERS TABLE ACCESS ===' as section;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.users LIMIT 1;
    RAISE NOTICE '✅ Can access users table directly';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access users table: %', SQLERRM;
  END;
END $$;

-- 6. Check if there are any other functions that might be called
SELECT '=== STEP 6: ALL FUNCTIONS IN PUBLIC SCHEMA ===' as section;

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- 7. Test a complete signup simulation
SELECT '=== STEP 7: COMPLETE SIGNUP SIMULATION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-complete@example.com';
BEGIN
  RAISE NOTICE 'Testing complete signup simulation with user_id: %', test_user_id;
  
  BEGIN
    -- Step 1: Create user profile
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      test_email, 
      'Test Complete User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    );
    
    RAISE NOTICE '✅ Step 1: User profile created successfully';
    
    -- Step 2: Award points
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 50, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ Step 2: Points awarded successfully';
    
    -- Step 3: Verify
    RAISE NOTICE 'User betting points: %', (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Complete simulation failed: %', SQLERRM;
  END;
END $$;

-- 8. Check for any RLS policies that might be blocking access
SELECT '=== STEP 8: RLS POLICIES ===' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_points')
ORDER BY tablename, policyname;

-- 9. Final diagnosis
SELECT '=== FINAL DIAGNOSIS ===' as section;
SELECT 'If the complete simulation works, the issue is in the trigger context.' as note1;
SELECT 'If the simulation fails, there is a table access issue.' as note2;
SELECT 'Check the trigger list above to see what might be causing the problem.' as note3;
SELECT 'The error suggests a trigger is failing during signup.' as note4; 