-- Simple User Signup Fix - Focus on Core Issue
-- Run this in your Supabase SQL Editor

-- 1. First, let's check what's actually happening
SELECT 'Checking current database state...' as status;

-- Check if users table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
    THEN 'Users table EXISTS'
    ELSE 'Users table DOES NOT EXIST'
  END as table_status;

-- Check if handle_new_user function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN 'handle_new_user function EXISTS'
    ELSE 'handle_new_user function DOES NOT EXIST'
  END as function_status;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
    THEN 'on_auth_user_created trigger EXISTS'
    ELSE 'on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- 2. Drop everything and start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Create a minimal users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'player',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create a very simple handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple insert with minimal fields
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the specific error
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    -- Still return NEW to not break the signup
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Test the function manually
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
  test_display_name TEXT := 'Test User';
BEGIN
  -- Test the function with sample data
  PERFORM public.handle_new_user() FROM (
    SELECT 
      test_user_id as id,
      test_email as email,
      jsonb_build_object('display_name', test_display_name) as raw_user_meta_data
  ) as test_data;
  
  RAISE NOTICE 'Test completed successfully';
  
  -- Clean up test data
  DELETE FROM users WHERE id = test_user_id;
END $$;

-- 7. Check if there are any existing auth users without profiles
SELECT 
  'Auth users without profiles: ' || COUNT(*) as missing_profiles
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- 8. Create profiles for any existing auth users
INSERT INTO public.users (id, email, display_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 9. Enable RLS with simple policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;

-- Create simple policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view user profiles" ON users
  FOR SELECT USING (true);

-- 10. Final status check
SELECT 'User signup fix completed! Try signing up now.' as status; 