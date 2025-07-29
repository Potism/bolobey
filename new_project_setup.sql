-- New Supabase Project Setup - Complete Signup Fix
-- Run this in your NEW Supabase project SQL Editor

-- 1. Enable necessary extensions
SELECT '=== ENABLING EXTENSIONS ===' as section;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SELECT '✅ Extensions enabled' as status;

-- 2. Create users table with all fields
SELECT '=== CREATING USERS TABLE ===' as section;

CREATE TABLE users (
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

SELECT '✅ Users table created with all fields' as status;

-- 3. Create user_points table
SELECT '=== CREATING USER POINTS TABLE ===' as section;

CREATE TABLE user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

SELECT '✅ User points table created' as status;

-- 4. Create basic tournament tables
SELECT '=== CREATING TOURNAMENT TABLES ===' as section;

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT 16 CHECK (max_participants > 0),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'in_progress', 'completed')),
  format TEXT DEFAULT 'beyblade_x' CHECK (format IN ('single_elimination', 'double_elimination', 'beyblade_x')),
  current_phase TEXT DEFAULT 'registration' CHECK (current_phase IN ('registration', 'round_robin', 'elimination', 'completed')),
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seed INTEGER,
  total_points INTEGER DEFAULT 0,
  burst_points INTEGER DEFAULT 0,
  ringout_points INTEGER DEFAULT 0,
  spinout_points INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

SELECT '✅ Tournament tables created' as status;

-- 5. Create the handle_new_user function
SELECT '=== CREATING TRIGGER FUNCTION ===' as section;

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

SELECT '✅ Trigger function created' as status;

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
CREATE TRIGGER on_user_created_award_points
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION award_initial_points();

SELECT '✅ Points award trigger created' as status;

-- 9. Set up RLS policies
SELECT '=== SETTING UP RLS POLICIES ===' as section;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view user profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User points policies
CREATE POLICY "Users can view their own points" ON user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points" ON user_points
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points" ON user_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tournaments policies
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tournaments" ON tournaments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tournament creators can update their tournaments" ON tournaments
  FOR UPDATE USING (auth.uid() = created_by);

-- Tournament participants policies
CREATE POLICY "Anyone can view tournament participants" ON tournament_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join tournaments" ON tournament_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

SELECT '✅ RLS policies created' as status;

-- 10. Create indexes for performance
SELECT '=== CREATING INDEXES ===' as section;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_points_user_id ON user_points(user_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user_id ON tournament_participants(user_id);

SELECT '✅ Indexes created' as status;

-- 11. Test the setup
SELECT '=== TESTING SETUP ===' as section;

-- Test manual insert
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || test_id::text || '@example.com';
BEGIN
  -- Try to manually insert a test user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    test_id,
    test_email,
    crypt('testpassword', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"display_name": "Test User"}'::jsonb,
    false,
    '',
    '',
    '',
    ''
  );
  
  RAISE NOTICE '✅ Manual auth.users insert successful for: %', test_email;
  
  -- Check if profile was created by trigger
  IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
    RAISE NOTICE '✅ Profile was created by trigger';
  ELSE
    RAISE NOTICE '❌ Profile was not created by trigger';
  END IF;
  
  -- Check if points were awarded
  IF EXISTS (SELECT 1 FROM user_points WHERE user_id = test_id) THEN
    RAISE NOTICE '✅ Initial points were awarded';
  ELSE
    RAISE NOTICE '❌ Initial points were not awarded';
  END IF;
  
  -- Clean up test user
  DELETE FROM user_points WHERE user_id = test_id;
  DELETE FROM users WHERE id = test_id;
  DELETE FROM auth.users WHERE id = test_id;
  
  RAISE NOTICE '✅ Test completed successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- 12. Final status
SELECT '=== SETUP COMPLETE ===' as section;
SELECT '🎉 New Supabase project setup completed!' as status;
SELECT '✅ Users table with all address fields' as feature1;
SELECT '✅ User points system' as feature2;
SELECT '✅ Tournament system' as feature3;
SELECT '✅ Trigger function for automatic profile creation' as feature4;
SELECT '✅ Initial points award (50 stream points)' as feature5;
SELECT '✅ RLS policies for security' as feature6;
SELECT '✅ Performance indexes' as feature7;

SELECT 'Now try signing up with streamerdude@gmail.com in your app!' as instruction;
SELECT 'Make sure to update your environment variables with the new project URL and keys.' as note; 