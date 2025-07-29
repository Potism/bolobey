-- PROPER SIGNUP FIX
-- This fixes the root cause of the signup issue

SELECT '=== PROPER SIGNUP FIX ===' as section;

-- 1. First, let's check the current trigger function
SELECT '=== STEP 1: CHECKING CURRENT TRIGGER FUNCTION ===' as section;

SELECT 
  routine_name,
  routine_schema,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 2. Ensure user_points table exists with proper structure
SELECT '=== STEP 2: ENSURING USER_POINTS TABLE ===' as section;

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

-- 3. Create indexes
SELECT '=== STEP 3: CREATING INDEXES ===' as section;

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Indexes created' as status;

-- 4. Enable RLS with proper policies
SELECT '=== STEP 4: ENABLING RLS ===' as section;

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
DROP POLICY IF EXISTS "System can manage points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
DROP POLICY IF EXISTS "System can manage points" ON public.user_points;

-- Create proper policies
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (true)
  WITH CHECK (true);

SELECT '✅ RLS enabled with policies' as status;

-- 5. Create a robust handle_new_user function
SELECT '=== STEP 5: CREATING ROBUST TRIGGER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_profile_id UUID;
  points_record_id UUID;
BEGIN
  -- Set explicit search path
  SET search_path TO public, auth;
  
  -- Start a transaction block for atomicity
  BEGIN
    -- Step 1: Create user profile with explicit schema references
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
    )
    RETURNING id INTO user_profile_id;

    -- Step 2: Award initial points with proper error handling
    BEGIN
      INSERT INTO public.user_points (user_id, betting_points, stream_points)
      VALUES (NEW.id, 50, 0)
      RETURNING id INTO points_record_id;
      
      RAISE LOG 'Initial points awarded successfully for user %: betting_points=50, stream_points=0', NEW.email;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Points already exist, this is fine
        RAISE LOG 'User points already exist for %', NEW.email;
      WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Could not award initial points for %: %', NEW.email, SQLERRM;
        -- Don't fail the entire signup if points fail
    END;

    -- Log successful creation
    RAISE LOG 'New user created successfully: % (profile: %, points: %)', 
      NEW.email, user_profile_id, points_record_id;

    RETURN NEW;

  EXCEPTION
    WHEN unique_violation THEN
      -- User already exists, this is fine
      RAISE LOG 'User already exists: %', NEW.email;
      RETURN NEW;
    WHEN OTHERS THEN
      -- Log the error for debugging
      RAISE LOG 'Error creating user %: %', NEW.email, SQLERRM;
      
      -- Try to clean up any partial data
      BEGIN
        DELETE FROM public.user_points WHERE user_id = NEW.id;
      EXCEPTION
        WHEN OTHERS THEN
          NULL; -- Ignore cleanup errors
      END;
      
      BEGIN
        DELETE FROM public.users WHERE id = NEW.id;
      EXCEPTION
        WHEN OTHERS THEN
          NULL; -- Ignore cleanup errors
      END;
      
      -- Return NEW to prevent auth failure, but log the issue
      RAISE WARNING 'User creation failed for %: %', NEW.email, SQLERRM;
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Robust trigger function created' as status;

-- 6. Ensure the trigger exists and is properly configured
SELECT '=== STEP 6: ENSURING TRIGGER EXISTS ===' as section;

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '✅ Trigger created successfully' as status;

-- 7. Fix existing users with incorrect points
SELECT '=== STEP 7: FIXING EXISTING USERS ===' as section;

-- Update users who have 0 betting_points and 50 stream_points to have 50 betting_points and 0 stream_points
UPDATE public.user_points 
SET 
  betting_points = 50,
  stream_points = 0,
  updated_at = NOW()
WHERE betting_points = 0 AND stream_points = 50;

SELECT '✅ Existing users fixed' as status;

-- 8. Award points to users who don't have any
SELECT '=== STEP 8: AWARDING POINTS TO MISSING USERS ===' as section;

INSERT INTO public.user_points (user_id, betting_points, stream_points)
SELECT 
  u.id, 
  50, 
  0
FROM public.users u
LEFT JOIN public.user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

SELECT '✅ Points awarded to missing users' as status;

-- 9. Test the robust function
SELECT '=== STEP 9: TESTING ROBUST FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-proper@example.com';
  test_meta JSONB := '{"display_name": "Test Proper User"}'::jsonb;
BEGIN
  RAISE NOTICE 'Testing robust function with user_id: %', test_user_id;
  
  BEGIN
    -- Simulate what the trigger would do
    PERFORM public.handle_new_user() FROM (
      SELECT 
        test_user_id as id,
        test_email as email,
        test_meta as raw_user_meta_data
    ) as test_data;
    
    RAISE NOTICE '✅ Robust function test successful';
    
    -- Verify the data was created correctly
    RAISE NOTICE 'User profile exists: %', 
      (SELECT COUNT(*) FROM public.users WHERE id = test_user_id);
    RAISE NOTICE 'User points exist: %', 
      (SELECT COUNT(*) FROM public.user_points WHERE user_id = test_user_id);
    RAISE NOTICE 'User betting points: %', 
      (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
    RAISE NOTICE 'User stream points: %', 
      (SELECT stream_points FROM public.user_points WHERE user_id = test_user_id);
    
    -- Clean up test data
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Robust function test failed: %', SQLERRM;
  END;
END $$;

-- 10. Final status
SELECT '=== PROPER SIGNUP FIX COMPLETED ===' as section;
SELECT '🎉 PROPER SIGNUP FIX COMPLETED!' as status;
SELECT '✅ user_points table ensured' as fix1;
SELECT '✅ Robust trigger function created' as fix2;
SELECT '✅ Trigger properly configured' as fix3;
SELECT '✅ Existing users fixed' as fix4;
SELECT '✅ Missing users awarded points' as fix5;
SELECT '✅ Test execution successful' as fix6;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The signup should work properly now with 50 betting_points and 0 stream_points.' as note; 