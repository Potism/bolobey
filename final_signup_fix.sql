-- Final signup fix - Complete solution
-- This creates a trigger that handles both user profile and points creation

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create the complete handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_display_name TEXT;
BEGIN
  -- Get display_name from metadata, fallback to email username
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert into users table
  INSERT INTO public.users (
    id, 
    email, 
    display_name, 
    role, 
    created_at, 
    updated_at, 
    country
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    user_display_name, 
    'player', 
    NOW(), 
    NOW(),
    'PH'
  );
  
  -- Insert into user_points table with correct structure
  INSERT INTO public.user_points (
    user_id, 
    betting_points, 
    stream_points, 
    total_betting_points_earned,
    total_stream_points_earned,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    50,  -- Starting betting points
    0,   -- Starting stream points
    0,   -- Total earned betting points
    0,   -- Total earned stream points
    NOW(), 
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, this is fine
    RAISE LOG 'User already exists: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify the setup
SELECT 
    'Signup trigger created successfully!' as status,
    'Function exists:' as info1, EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'handle_new_user'
    ) as function_exists,
    'Trigger exists:' as info2, EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name = 'on_auth_user_created'
        AND event_object_schema = 'auth'
        AND event_object_table = 'users'
    ) as trigger_exists,
    'user_points table exists:' as info3, EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_points'
    ) as table_exists;

-- Step 5: Show current trigger status
SELECT 
    'Current triggers on auth.users:' as info,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'; 