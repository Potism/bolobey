-- User Signup Fix with Address Fields - Complete Version
-- Run this in your Supabase SQL Editor

-- 1. First, let's check what's actually happening
SELECT 'Checking current database state...' as status;

-- Check if users table exists and what columns it has
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
    THEN 'Users table EXISTS'
    ELSE 'Users table DOES NOT EXIST'
  END as table_status;

-- Check what columns exist in users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

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

-- 3. Create users table with ALL fields (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'player',
  avatar_url TEXT,
  shipping_address TEXT,
  phone_number TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'PH',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add any missing columns to existing users table
DO $$ 
BEGIN
  -- Add avatar_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;

  -- Add shipping_address column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'shipping_address') THEN
    ALTER TABLE users ADD COLUMN shipping_address TEXT;
  END IF;

  -- Add phone_number column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone_number') THEN
    ALTER TABLE users ADD COLUMN phone_number TEXT;
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'city') THEN
    ALTER TABLE users ADD COLUMN city TEXT;
  END IF;

  -- Add state_province column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'state_province') THEN
    ALTER TABLE users ADD COLUMN state_province TEXT;
  END IF;

  -- Add postal_code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'postal_code') THEN
    ALTER TABLE users ADD COLUMN postal_code TEXT;
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'country') THEN
    ALTER TABLE users ADD COLUMN country TEXT DEFAULT 'PH';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 5. Create the handle_new_user function with ALL fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert with ALL fields including address fields
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

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Check if there are any existing auth users without profiles
SELECT 
  'Auth users without profiles: ' || COUNT(*) as missing_profiles
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- 8. Create profiles for any existing auth users with ALL fields
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
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1)),
  'player',
  au.raw_user_meta_data ->> 'avatar_url',
  au.raw_user_meta_data ->> 'shipping_address',
  au.raw_user_meta_data ->> 'phone_number',
  au.raw_user_meta_data ->> 'city',
  au.raw_user_meta_data ->> 'state_province',
  au.raw_user_meta_data ->> 'postal_code',
  COALESCE(au.raw_user_meta_data ->> 'country', 'PH')
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

-- 10. Create user_points table for new users
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 11. Create function to award initial points
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

-- 12. Create trigger for awarding initial points
DROP TRIGGER IF EXISTS on_user_created_award_points ON users;
CREATE TRIGGER on_user_created_award_points
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION award_initial_points();

-- 13. Award initial points to existing users who don't have any
INSERT INTO user_points (user_id, betting_points, stream_points)
SELECT 
  u.id, 
  0, 
  50
FROM public.users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 14. Final status check
SELECT 'User signup fix completed with address fields! Try signing up now.' as status;
SELECT 'Total users in auth.users: ' || COUNT(*) as auth_users FROM auth.users;
SELECT 'Total users in public.users: ' || COUNT(*) as public_users FROM users;
SELECT 'Total users with points: ' || COUNT(*) as users_with_points FROM user_points;

-- 15. Show final table structure
SELECT 'Final users table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position; 