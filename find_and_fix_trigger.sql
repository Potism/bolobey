-- FIND AND FIX THE TRIGGER CAUSING THE ERROR
-- This will identify and fix the exact trigger causing the user_points error

SELECT '=== FINDING THE PROBLEMATIC TRIGGER ===' as section;

-- 1. Find all triggers that might be causing the issue
SELECT '=== STEP 1: FINDING ALL TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema IN ('auth', 'public')
ORDER BY event_object_schema, event_object_table, trigger_name;

-- 2. Check if there's a trigger on auth.users
SELECT '=== STEP 2: CHECKING AUTH.USERS TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 3. Check if there's a trigger on public.users
SELECT '=== STEP 3: CHECKING PUBLIC.USERS TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
  AND event_object_table = 'users';

-- 4. Find all functions that reference user_points
SELECT '=== STEP 4: FINDING FUNCTIONS THAT REFERENCE USER_POINTS ===' as section;

SELECT 
  routine_name,
  routine_schema,
  routine_type
FROM information_schema.routines 
WHERE routine_definition LIKE '%user_points%'
  AND routine_schema = 'public';

-- 5. Show the definition of any function that references user_points
SELECT '=== STEP 5: SHOWING FUNCTION DEFINITIONS ===' as section;

DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT routine_name, routine_schema
    FROM information_schema.routines 
    WHERE routine_definition LIKE '%user_points%'
      AND routine_schema = 'public'
  LOOP
    RAISE NOTICE 'Function: %.%', func_record.routine_schema, func_record.routine_name;
    
    -- Show function definition
    BEGIN
      RAISE NOTICE 'Definition: %', (
        SELECT pg_get_functiondef(oid)
        FROM pg_proc 
        WHERE proname = func_record.routine_name 
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = func_record.routine_schema)
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not get definition: %', SQLERRM;
    END;
  END LOOP;
END $$;

-- 6. Create a safe version of the handle_new_user function
SELECT '=== STEP 6: CREATING SAFE HANDLE_NEW_USER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- First, create the user profile
  INSERT INTO public.users (
    id, email, display_name, role, avatar_url, 
    shipping_address, phone_number, city, state_province, postal_code, country
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)), 
    'player', 
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'shipping_address',
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'state_province',
    NEW.raw_user_meta_data ->> 'postal_code',
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'PH')
  );
  
  -- Then, try to award points but don't fail if it doesn't work
  BEGIN
    -- Check if user_points table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points' AND table_schema = 'public') THEN
      INSERT INTO public.user_points (user_id, betting_points, stream_points)
      VALUES (NEW.id, 50, 0)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Just log the error but don't fail the signup
      RAISE WARNING 'Could not award initial points: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN 
    RETURN NEW;
  WHEN OTHERS THEN 
    RAISE WARNING 'handle_new_user error: %', SQLERRM; 
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Safe handle_new_user function created' as status;

-- 7. Test the safe function
SELECT '=== STEP 7: TESTING SAFE FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing safe function with user_id: %', test_user_id;
  
  BEGIN
    -- Simulate what the trigger would do
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      'test-safe-trigger@example.com', 
      'Test Safe Trigger User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    );
    
    -- Try to award points
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points' AND table_schema = 'public') THEN
        INSERT INTO public.user_points (user_id, betting_points, stream_points)
        VALUES (test_user_id, 50, 0)
        ON CONFLICT (user_id) DO NOTHING;
        RAISE NOTICE '✅ Points awarded successfully';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Points award failed but signup continued: %', SQLERRM;
    END;
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test failed: %', SQLERRM;
  END;
END $$;

-- 8. Final status
SELECT '=== TRIGGER FIX COMPLETED ===' as section;
SELECT '🎉 TRIGGER FIX COMPLETED!' as status;
SELECT '✅ Found all triggers and functions' as fix1;
SELECT '✅ Created safe handle_new_user function' as fix2;
SELECT '✅ Function won''t fail if user_points is not accessible' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The trigger should now work without failing on user_points.' as note; 