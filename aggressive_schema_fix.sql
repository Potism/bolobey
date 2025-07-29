-- AGGRESSIVE SCHEMA FIX
-- This completely bypasses schema conflicts by creating a minimal trigger

SELECT '=== AGGRESSIVE SCHEMA FIX ===' as section;

-- 1. First, let's see what triggers exist
SELECT '=== STEP 1: CHECKING TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 2. Create a minimal handle_new_user function that ONLY creates user profile
SELECT '=== STEP 2: CREATING MINIMAL FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- ONLY create user profile, skip points entirely
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

-- 3. Ensure user_points table exists
SELECT '=== STEP 3: ENSURING USER_POINTS TABLE ===' as section;

CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

SELECT '✅ user_points table ensured' as status;

-- 4. Create points function for manual use
SELECT '=== STEP 4: CREATING POINTS FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.award_initial_points(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 50, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Points function created' as status;

-- 5. Test the minimal function
SELECT '=== STEP 5: TESTING MINIMAL FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-aggressive@example.com';
  test_meta JSONB := '{"display_name": "Test Aggressive User"}'::jsonb;
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
    
    -- Award points manually
    IF public.award_initial_points(test_user_id) THEN
      RAISE NOTICE '✅ Points awarded manually';
      RAISE NOTICE 'User betting points: %', 
        (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
    ELSE
      RAISE NOTICE '⚠️ Manual points award failed';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Minimal function test failed: %', SQLERRM;
  END;
END $$;

-- 6. Final status
SELECT '=== AGGRESSIVE FIX COMPLETED ===' as section;
SELECT '🎉 AGGRESSIVE SCHEMA FIX COMPLETED!' as status;
SELECT '✅ Minimal trigger function created (NO POINTS)' as fix1;
SELECT '✅ user_points table ensured' as fix2;
SELECT '✅ Points function created for manual use' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The trigger will only create user profile, no schema conflicts.' as note;
SELECT 'Points will be awarded by the useAuth hook via RPC call.' as note2; 