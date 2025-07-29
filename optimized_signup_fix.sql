-- Optimized signup fix for Bolobey
-- This creates a robust trigger function that handles new user signups

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create optimized function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with better fallback logic
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
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'User'
    ), 
    'player', 
    COALESCE(NEW.created_at, NOW()), 
    NOW(),
    COALESCE(NEW.raw_user_meta_data->>'country', 'PH')
  );
  
  -- Insert into user_points table
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
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
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
    ) as trigger_exists,
    'user_points table exists:' as info3, EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_points'
    ) as table_exists; 