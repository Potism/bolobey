-- Final User Signup Fix - Corrected Version
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
  WHEN unique_violation THEN
    -- If user already exists, just return NEW
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the specific error but don't fail the signup
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    -- Still return NEW to not break the signup
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Check if there are any existing auth users without profiles
SELECT 
  'Auth users without profiles: ' || COUNT(*) as missing_profiles
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- 7. Create profiles for any existing auth users
INSERT INTO public.users (id, email, display_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 8. Enable RLS with simple policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create simple policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view user profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 9. Create user_points table for new users
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 10. Create function to award initial points
CREATE OR REPLACE FUNCTION award_initial_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Award initial points to new users
  INSERT INTO user_points (user_id, betting_points, stream_points)
  VALUES (NEW.id, 0, 50)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error awarding initial points: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger for awarding initial points
DROP TRIGGER IF EXISTS on_user_created_award_points ON users;
CREATE TRIGGER on_user_created_award_points
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION award_initial_points();

-- 12. Award initial points to existing users who don't have any
INSERT INTO user_points (user_id, betting_points, stream_points)
SELECT 
  u.id, 
  0, 
  50
FROM public.users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 13. Final status check
SELECT 'User signup fix completed! Try signing up now.' as status;
SELECT 'Total users in auth.users: ' || COUNT(*) as auth_users FROM auth.users;
SELECT 'Total users in public.users: ' || COUNT(*) as public_users FROM users;
SELECT 'Total users with points: ' || COUNT(*) as users_with_points FROM user_points; 