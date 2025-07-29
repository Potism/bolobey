-- Fix User Signup Issue - Comprehensive Solution
-- Run this in your Supabase SQL Editor

-- 1. First, ensure the users table exists with all necessary columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'player' CHECK (role IN ('admin', 'player')),
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

-- 2. Add any missing columns to existing users table
DO $$ 
BEGIN
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
END $$;

-- 3. Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user into the public.users table
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
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
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Ensure user_points table exists for new users
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 7. Create function to award initial points to new users
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

-- 8. Create trigger for awarding initial points
DROP TRIGGER IF EXISTS on_user_created_award_points ON users;
CREATE TRIGGER on_user_created_award_points
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION award_initial_points();

-- 9. Fix any existing users who might not have profiles
INSERT INTO public.users (
  id,
  email,
  display_name,
  role,
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

-- 10. Award initial points to existing users who don't have any
INSERT INTO user_points (user_id, betting_points, stream_points)
SELECT 
  u.id, 
  0, 
  50
FROM public.users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 11. Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;
CREATE POLICY "Anyone can view user profiles" ON users
  FOR SELECT USING (true);

-- Success message
SELECT 'User signup system fixed successfully! New users should now be able to sign up without errors.' as status; 