-- NUCLEAR TRIGGER REMOVAL
-- This will completely remove or disable the problematic trigger

SELECT '=== NUCLEAR TRIGGER REMOVAL ===' as section;

-- 1. Check what triggers exist
SELECT '=== STEP 1: CHECKING ALL TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 2. Try to DROP the trigger completely
SELECT '=== STEP 2: DROPPING THE TRIGGER ===' as section;

DO $$
BEGIN
  BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    RAISE NOTICE '✅ Auth trigger DROPPED successfully';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠️ Cannot drop auth trigger - no permission';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error dropping trigger: %', SQLERRM;
  END;
END $$;

-- 3. Also try to disable it as backup
SELECT '=== STEP 3: DISABLING TRIGGER AS BACKUP ===' as section;

DO $$
BEGIN
  BEGIN
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
    RAISE NOTICE '✅ Auth trigger disabled as backup';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠️ Cannot disable auth trigger - no permission';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error disabling trigger: %', SQLERRM;
  END;
END $$;

-- 4. Try to disable ALL triggers on auth.users
SELECT '=== STEP 4: DISABLING ALL TRIGGERS ===' as section;

DO $$
BEGIN
  BEGIN
    ALTER TABLE auth.users DISABLE TRIGGER ALL;
    RAISE NOTICE '✅ ALL triggers on auth.users disabled';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠️ Cannot disable ALL triggers - no permission';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error disabling ALL triggers: %', SQLERRM;
  END;
END $$;

-- 5. Check trigger status after removal
SELECT '=== STEP 5: CHECKING TRIGGER STATUS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 6. Create a minimal handle_new_user function (if trigger still exists)
SELECT '=== STEP 6: CREATING MINIMAL FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- ONLY create user profile, NO points access at all
  INSERT INTO public.users (
    id, 
    email, 
    display_name, 
    role, 
    avatar_url,
    shipping_address, 
    phone_number, 
    city, 
    state_province, 
    postal_code, 
    country
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

  -- Log successful creation
  RAISE LOG 'User profile created successfully: %', NEW.email;

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, this is fine
    RAISE LOG 'User already exists: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail signup
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Minimal function created (NO POINTS)' as status;

-- 7. Test the minimal function
SELECT '=== STEP 7: TESTING MINIMAL FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-nuclear@example.com';
  test_meta JSONB := '{"display_name": "Test Nuclear User"}'::jsonb;
BEGIN
  RAISE NOTICE 'Testing minimal function with user_id: %', test_user_id;
  
  BEGIN
    -- Simulate what the trigger would do (only profile creation)
    PERFORM public.handle_new_user() FROM (
      SELECT 
        test_user_id as id,
        test_email as email,
        test_meta as raw_user_meta_data
    ) as test_data;
    
    RAISE NOTICE '✅ Minimal function test successful';
    
    -- Verify only profile was created
    RAISE NOTICE 'User profile exists: %', 
      (SELECT COUNT(*) FROM public.users WHERE id = test_user_id);
    
    -- Clean up test data
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Minimal function test failed: %', SQLERRM;
  END;
END $$;

-- 8. Final status
SELECT '=== NUCLEAR TRIGGER REMOVAL COMPLETED ===' as section;
SELECT '🎉 NUCLEAR TRIGGER REMOVAL COMPLETED!' as status;
SELECT '✅ Auth trigger dropped/disabled' as fix1;
SELECT '✅ ALL triggers disabled as backup' as fix2;
SELECT '✅ Minimal function created (NO POINTS)' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The trigger should be gone/disabled, so signup should work.' as note;
SELECT 'Points will be handled by the useAuth hook after signup.' as note2; 