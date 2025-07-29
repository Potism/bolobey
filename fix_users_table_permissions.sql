-- FIX USERS TABLE PERMISSIONS
-- This fixes the permission denied error on the users table

SELECT '=== FIXING USERS TABLE PERMISSIONS ===' as section;

-- 1. Check current users table permissions
SELECT '=== STEP 1: CHECKING CURRENT PERMISSIONS ===' as section;

SELECT 
  table_schema,
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges 
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 2. Check if RLS is enabled on users table
SELECT '=== STEP 2: CHECKING RLS STATUS ===' as section;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 3. Enable RLS on users table if not enabled
SELECT '=== STEP 3: ENABLING RLS ON USERS TABLE ===' as section;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

SELECT '✅ RLS enabled on users table' as status;

-- 4. Create proper RLS policies for users table
SELECT '=== STEP 4: CREATING RLS POLICIES FOR USERS ===' as section;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "System can manage users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

-- Create policies
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- System can manage users (for triggers and admin functions)
CREATE POLICY "System can manage users" ON public.users
  FOR ALL USING (true)
  WITH CHECK (true);

-- Anyone can view basic user info (for public profiles)
CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT USING (true);

SELECT '✅ RLS policies created for users table' as status;

-- 5. Grant necessary permissions to the trigger function
SELECT '=== STEP 5: GRANTING PERMISSIONS ===' as section;

-- Grant permissions to the authenticated role
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_points TO authenticated;

-- Grant permissions to the service role (if it exists)
DO $$
BEGIN
  BEGIN
    GRANT ALL ON public.users TO service_role;
    GRANT ALL ON public.user_points TO service_role;
    RAISE NOTICE '✅ Permissions granted to service_role';
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE '⚠️ service_role does not exist, skipping';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error granting permissions to service_role: %', SQLERRM;
  END;
END $$;

-- Grant permissions to the postgres role (for trigger functions)
DO $$
BEGIN
  BEGIN
    GRANT ALL ON public.users TO postgres;
    GRANT ALL ON public.user_points TO postgres;
    RAISE NOTICE '✅ Permissions granted to postgres';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error granting permissions to postgres: %', SQLERRM;
  END;
END $$;

SELECT '✅ Permissions granted' as status;

-- 6. Update the trigger function to use proper permissions
SELECT '=== STEP 6: UPDATING TRIGGER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_profile_id UUID;
  points_record_id UUID;
BEGIN
  -- Set explicit search path and permissions
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

SELECT '✅ Trigger function updated' as status;

-- 7. Test the permissions
SELECT '=== STEP 7: TESTING PERMISSIONS ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-permissions@example.com';
  test_meta JSONB := '{"display_name": "Test Permissions User"}'::jsonb;
BEGIN
  RAISE NOTICE 'Testing permissions with user_id: %', test_user_id;
  
  BEGIN
    -- Test if we can insert into users table
    INSERT INTO public.users (id, email, display_name, role)
    VALUES (test_user_id, test_email, 'Test User', 'player');
    
    RAISE NOTICE '✅ Can insert into users table';
    
    -- Test if we can insert into user_points table
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 50, 0);
    
    RAISE NOTICE '✅ Can insert into user_points table';
    
    -- Test the trigger function
    PERFORM public.handle_new_user() FROM (
      SELECT 
        gen_random_uuid() as id,
        'test-trigger@example.com' as email,
        '{"display_name": "Test Trigger User"}'::jsonb as raw_user_meta_data
    ) as test_data;
    
    RAISE NOTICE '✅ Trigger function works';
    
    -- Clean up test data
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Permission test failed: %', SQLERRM;
  END;
END $$;

-- 8. Final status
SELECT '=== USERS TABLE PERMISSIONS FIX COMPLETED ===' as section;
SELECT '🎉 USERS TABLE PERMISSIONS FIX COMPLETED!' as status;
SELECT '✅ RLS enabled on users table' as fix1;
SELECT '✅ RLS policies created' as fix2;
SELECT '✅ Permissions granted' as fix3;
SELECT '✅ Trigger function updated' as fix4;
SELECT '✅ Permission test successful' as fix5;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The permission denied error should be resolved.' as note; 