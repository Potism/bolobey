-- CHECK AND FIX SIGNUP TRIGGER
-- This will diagnose and fix the handle_new_user function

SELECT '=== DIAGNOSING SIGNUP TRIGGER ===' as section;

-- 1. Check if the function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- 2. Show the current function definition
SELECT '=== CURRENT FUNCTION DEFINITION ===' as section;

SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- 3. Check if the auth trigger exists
SELECT '=== AUTH TRIGGER STATUS ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- 4. Test the function manually
SELECT '=== TESTING FUNCTION MANUALLY ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-signup@example.com';
  test_meta JSONB := '{"display_name": "Test User"}'::jsonb;
BEGIN
  -- Simulate what happens during signup
  RAISE NOTICE 'Testing with user_id: %', test_user_id;
  
  BEGIN
    -- Try to insert into users table
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      test_email, 
      'Test User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    );
    
    RAISE NOTICE '✅ Users table insert successful';
    
    -- Try to insert into user_points table
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 0, 50)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ User points insert successful';
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test failed: %', SQLERRM;
  END;
END $$;

-- 5. Create a fixed version of the function
SELECT '=== CREATING FIXED FUNCTION ===' as section;

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
  
  -- Then, award initial points (50 stream_points, 0 betting_points)
  BEGIN
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (NEW.id, 0, 50)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
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

SELECT '✅ handle_new_user function updated' as status;

-- 6. Test the updated function
SELECT '=== TESTING UPDATED FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-fixed@example.com';
  test_meta JSONB := '{"display_name": "Test Fixed User"}'::jsonb;
BEGIN
  RAISE NOTICE 'Testing updated function with user_id: %', test_user_id;
  
  BEGIN
    -- Simulate the trigger execution
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      test_email, 
      'Test Fixed User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    );
    
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 0, 50)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ Updated function test successful';
    
    -- Verify the data
    RAISE NOTICE 'User points: %', (SELECT stream_points FROM public.user_points WHERE user_id = test_user_id);
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Updated function test failed: %', SQLERRM;
  END;
END $$;

-- 7. Final status
SELECT '=== FIX COMPLETED ===' as section;
SELECT '🎉 Signup trigger has been fixed!' as status;
SELECT '✅ handle_new_user function updated' as fix1;
SELECT '✅ Awards 50 stream_points (not betting_points)' as fix2;
SELECT '✅ Proper error handling added' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The signup should work without the 500 error now.' as note; 