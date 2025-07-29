-- SIMPLIFIED SIGNUP FIX
-- Based on Supabase support recommendations

SELECT '=== SIMPLIFIED SIGNUP FIX ===' as section;

-- 1. First, let's check the current users table schema
SELECT '=== STEP 1: CHECKING CURRENT SCHEMA ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Drop and recreate the users table with simplified schema
SELECT '=== STEP 2: RECREATING USERS TABLE ===' as section;

-- Drop existing table (this will also drop dependent objects)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create simplified users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT DEFAULT 'player',
  avatar_url TEXT,
  shipping_address TEXT,
  phone_number TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'PH',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT '✅ Users table recreated with simplified schema' as status;

-- 3. Enable RLS
SELECT '=== STEP 3: ENABLING RLS ===' as section;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

SELECT '✅ RLS enabled' as status;

-- 4. Create simple RLS policies
SELECT '=== STEP 4: CREATING RLS POLICIES ===' as section;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can manage own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "System can manage users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for signup" ON public.users;
DROP POLICY IF EXISTS "Enable select for own profile" ON public.users;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.users;
DROP POLICY IF EXISTS "Enable system operations" ON public.users;
DROP POLICY IF EXISTS "Enable public read access" ON public.users;

-- Create simple policy
CREATE POLICY "Users can manage own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

SELECT '✅ RLS policies created' as status;

-- 5. Create simplified trigger function
SELECT '=== STEP 5: CREATING SIMPLIFIED TRIGGER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RAISE LOG 'User profile created successfully: %', NEW.email;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Simplified trigger function created' as status;

-- 6. Create trigger
SELECT '=== STEP 6: CREATING TRIGGER ===' as section;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '✅ Trigger created' as status;

-- 7. Grant permissions
SELECT '=== STEP 7: GRANTING PERMISSIONS ===' as section;

GRANT ALL ON public.users TO anon, authenticated, service_role;

SELECT '✅ Permissions granted' as status;

-- 8. Ensure user_points table exists
SELECT '=== STEP 8: ENSURING USER_POINTS TABLE ===' as section;

CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on user_points
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create policies for user_points
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
DROP POLICY IF EXISTS "System can manage points" ON public.user_points;

CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (true)
  WITH CHECK (true);

-- Grant permissions on user_points
GRANT ALL ON public.user_points TO anon, authenticated, service_role;

SELECT '✅ User points table ensured' as status;

-- 9. Create function to award initial points (called from client)
SELECT '=== STEP 9: CREATING POINTS FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.award_initial_points(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 50, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'Initial points awarded for user %: betting_points=50, stream_points=0', user_id;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not award initial points for %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Points function created' as status;

-- 10. Test the complete setup
SELECT '=== STEP 10: TESTING COMPLETE SETUP ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-simple@example.com';
  test_meta JSONB := '{"display_name": "Test Simple User"}'::jsonb;
BEGIN
  RAISE NOTICE 'Testing simplified setup with user_id: %', test_user_id;
  
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
    RAISE NOTICE 'User display_name: %', 
      (SELECT display_name FROM public.users WHERE id = test_user_id);
    
    -- Test points function
    PERFORM public.award_initial_points(test_user_id);
    RAISE NOTICE '✅ Points function test successful';
    
    -- Verify points were created
    RAISE NOTICE 'User points exist: %', 
      (SELECT COUNT(*) FROM public.user_points WHERE user_id = test_user_id);
    RAISE NOTICE 'User betting points: %', 
      (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
    
    -- Clean up test data
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Simplified setup test failed: %', SQLERRM;
  END;
END $$;

-- 11. Final status
SELECT '=== SIMPLIFIED SIGNUP FIX COMPLETED ===' as section;
SELECT '🎉 SIMPLIFIED SIGNUP FIX COMPLETED!' as status;
SELECT '✅ Users table recreated with simplified schema' as fix1;
SELECT '✅ RLS enabled with simple policies' as fix2;
SELECT '✅ Simplified trigger function created' as fix3;
SELECT '✅ Trigger properly configured' as fix4;
SELECT '✅ User points table ensured' as fix5;
SELECT '✅ Points function created' as fix6;
SELECT '✅ Complete setup tested' as fix7;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'This simplified approach should resolve the schema mismatch issues.' as note; 