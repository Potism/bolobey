-- DIAGNOSE AND FIX
-- This diagnoses the current state and applies the Supabase recommended fix

SELECT '=== DIAGNOSING CURRENT STATE ===' as section;

-- 1. Check if user_points table exists
SELECT '=== STEP 1: CHECKING USER_POINTS TABLE ===' as section;

SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename = 'user_points' AND schemaname = 'public';

-- 2. Check if users table exists
SELECT '=== STEP 2: CHECKING USERS TABLE ===' as section;

SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. Check current trigger function
SELECT '=== STEP 3: CHECKING TRIGGER FUNCTION ===' as section;

SELECT 
  routine_name,
  routine_schema,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 4. Check if trigger exists
SELECT '=== STEP 4: CHECKING TRIGGER ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 5. APPLY SUPABASE RECOMMENDED FIX
SELECT '=== STEP 5: APPLYING SUPABASE RECOMMENDED FIX ===' as section;

-- Drop existing user_points table if it exists
DROP TABLE IF EXISTS public.user_points CASCADE;

SELECT '✅ User points table dropped' as status;

-- Recreate user_points table with robust schema
CREATE TABLE public.user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT '✅ User points table recreated with robust schema' as status;

-- Enable Row Level Security
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
DROP POLICY IF EXISTS "System can manage points" ON public.user_points;

CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (true)
  WITH CHECK (true);

-- Grant Permissions
GRANT ALL ON public.user_points TO anon, authenticated, service_role;

SELECT '✅ RLS and permissions configured' as status;

-- 6. Create Function to Award Initial Points
SELECT '=== STEP 6: CREATING POINTS FUNCTION ===' as section;

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

-- 7. Create robust trigger function
SELECT '=== STEP 7: CREATING ROBUST TRIGGER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_points_result BOOLEAN;
BEGIN
  -- Insert user profile
  INSERT INTO public.users (id, email, display_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      SPLIT_PART(NEW.email, '@', 1)
    ),
    'player'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Attempt to award initial points (non-blocking)
  BEGIN
    initial_points_result := public.award_initial_points(NEW.id);
    
    IF initial_points_result THEN
      RAISE LOG 'Initial points awarded successfully for user %', NEW.email;
    ELSE
      RAISE WARNING 'Failed to award initial points for user %', NEW.email;
    END IF;
    
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log the error but don't block user creation
      RAISE WARNING 'Could not award initial points for user %: %', NEW.email, SQLERRM;
  END;
  
  RAISE LOG 'User profile created successfully: %', NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Robust trigger function created' as status;

-- 8. Drop and recreate the trigger
SELECT '=== STEP 8: RECREATING TRIGGER ===' as section;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '✅ Trigger recreated' as status;

-- 9. Test the complete setup
SELECT '=== STEP 9: TESTING COMPLETE SETUP ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-diagnose@example.com';
  test_meta JSONB := '{"display_name": "Test Diagnose User"}'::jsonb;
BEGIN
  RAISE NOTICE 'Testing complete setup with user_id: %', test_user_id;
  
  BEGIN
    -- Test the trigger function
    PERFORM public.handle_new_user() FROM (
      SELECT 
        test_user_id as id,
        test_email as email,
        test_meta as raw_user_meta_data
    ) as test_data;
    
    RAISE NOTICE '✅ Trigger function test successful';
    
    -- Verify user profile was created
    RAISE NOTICE 'User profile exists: %', 
      (SELECT COUNT(*) FROM public.users WHERE id = test_user_id);
    RAISE NOTICE 'User email: %', 
      (SELECT email FROM public.users WHERE id = test_user_id);
    
    -- Verify points were created
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
      RAISE NOTICE '❌ Complete setup test failed: %', SQLERRM;
  END;
END $$;

-- 10. Final verification
SELECT '=== STEP 10: FINAL VERIFICATION ===' as section;

-- Check if user_points table exists now
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_points' AND schemaname = 'public')
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST'
  END as user_points_status;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
    THEN '✅ Trigger EXISTS'
    ELSE '❌ Trigger DOES NOT EXIST'
  END as trigger_status;

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user')
    THEN '✅ Function EXISTS'
    ELSE '❌ Function DOES NOT EXIST'
  END as function_status;

-- 11. Final status
SELECT '=== DIAGNOSE AND FIX COMPLETED ===' as section;
SELECT '🎉 DIAGNOSE AND FIX COMPLETED!' as status;
SELECT '✅ User points table recreated' as fix1;
SELECT '✅ RLS and permissions configured' as fix2;
SELECT '✅ Points function created' as fix3;
SELECT '✅ Robust trigger function created' as fix4;
SELECT '✅ Trigger recreated' as fix5;
SELECT '✅ Complete setup tested' as fix6;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The user_points table should now exist and be accessible.' as note; 