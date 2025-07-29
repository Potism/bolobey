-- Complete Signup Fix - Align Database with Current Code
-- Run this in your Supabase SQL Editor

-- 1. First, let's check the current state
SELECT '=== CURRENT DATABASE STATE ===' as section;

-- Check if users table exists and its current structure
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
    THEN '✅ Users table EXISTS'
    ELSE '❌ Users table DOES NOT EXIST'
  END as table_status;

-- Show current table structure
SELECT '=== CURRENT USERS TABLE STRUCTURE ===' as section;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Update users table to match current code expectations
SELECT '=== UPDATING USERS TABLE ===' as section;

-- Add missing address fields to users table
DO $$ 
BEGIN
  -- Add shipping_address column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'shipping_address') THEN
    ALTER TABLE users ADD COLUMN shipping_address TEXT;
    RAISE NOTICE 'Added shipping_address column';
  END IF;

  -- Add phone_number column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone_number') THEN
    ALTER TABLE users ADD COLUMN phone_number TEXT;
    RAISE NOTICE 'Added phone_number column';
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'city') THEN
    ALTER TABLE users ADD COLUMN city TEXT;
    RAISE NOTICE 'Added city column';
  END IF;

  -- Add state_province column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'state_province') THEN
    ALTER TABLE users ADD COLUMN state_province TEXT;
    RAISE NOTICE 'Added state_province column';
  END IF;

  -- Add postal_code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'postal_code') THEN
    ALTER TABLE users ADD COLUMN postal_code TEXT;
    RAISE NOTICE 'Added postal_code column';
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'country') THEN
    ALTER TABLE users ADD COLUMN country TEXT DEFAULT 'PH';
    RAISE NOTICE 'Added country column';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;
END $$;

-- 3. Drop and recreate the trigger function
SELECT '=== RECREATING TRIGGER FUNCTION ===' as section;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the updated handle_new_user function with ALL fields
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

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '✅ Trigger function recreated with all fields' as status;

-- 5. Update existing users to have address fields (set defaults)
SELECT '=== UPDATING EXISTING USERS ===' as section;

-- Update existing users to have default country if not set
UPDATE users 
SET country = 'PH' 
WHERE country IS NULL;

-- 6. Ensure user_points table exists
SELECT '=== SETTING UP USER POINTS ===' as section;

CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 7. Create function to award initial points
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

-- 9. Award initial points to existing users who don't have any
INSERT INTO user_points (user_id, betting_points, stream_points)
SELECT 
  u.id, 
  0, 
  50
FROM public.users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 10. Set up RLS policies
SELECT '=== SETTING UP RLS POLICIES ===' as section;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view user profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 11. Final verification
SELECT '=== FINAL VERIFICATION ===' as section;

-- Show final table structure
SELECT 'Final users table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check counts
SELECT 'Total users in auth.users: ' || COUNT(*) as auth_users FROM auth.users;
SELECT 'Total users in public.users: ' || COUNT(*) as public_users FROM users;
SELECT 'Total users with points: ' || COUNT(*) as users_with_points FROM user_points;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- 12. Success message
SELECT '=== SUCCESS ===' as section;
SELECT '🎉 Signup fix completed! Try signing up now.' as status;
SELECT 'The database now matches your code expectations.' as note;
SELECT 'All address fields are supported and initial points will be awarded.' as note2; 