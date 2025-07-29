-- Alternative User Signup Fix - No Custom Triggers
-- This approach uses Supabase's built-in user management

-- 1. Drop all custom triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create a simple users table that matches auth.users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'player',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create a view that automatically syncs with auth.users
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1)) as display_name,
  'player' as role,
  au.raw_user_meta_data ->> 'avatar_url' as avatar_url,
  au.created_at,
  au.updated_at
FROM auth.users au;

-- 4. Create a function to sync users manually (for existing users)
CREATE OR REPLACE FUNCTION sync_user_profiles()
RETURNS void AS $$
BEGIN
  -- Insert users from auth.users that don't exist in public.users
  INSERT INTO users (id, email, display_name, role, avatar_url, created_at, updated_at)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1)),
    'player',
    au.raw_user_meta_data ->> 'avatar_url',
    au.created_at,
    au.updated_at
  FROM auth.users au
  LEFT JOIN public.users u ON au.id = u.id
  WHERE u.id IS NULL
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Run the sync function to populate existing users
SELECT sync_user_profiles();

-- 6. Create a simple function to get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_user_profile(user_uuid UUID)
RETURNS users AS $$
DECLARE
  user_record users;
BEGIN
  -- Try to get existing user
  SELECT * INTO user_record FROM users WHERE id = user_uuid;
  
  -- If user doesn't exist, create from auth.users
  IF user_record IS NULL THEN
    INSERT INTO users (id, email, display_name, role, avatar_url, created_at, updated_at)
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1)),
      'player',
      au.raw_user_meta_data ->> 'avatar_url',
      au.created_at,
      au.updated_at
    FROM auth.users au
    WHERE au.id = user_uuid
    RETURNING * INTO user_record;
  END IF;
  
  RETURN user_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable RLS with simple policies
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

-- 8. Create a policy for inserting new users
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 9. Test the setup
SELECT 'Alternative user signup fix completed!' as status;
SELECT 'Number of users in auth.users: ' || COUNT(*) as auth_users_count FROM auth.users;
SELECT 'Number of users in public.users: ' || COUNT(*) as public_users_count FROM users; 