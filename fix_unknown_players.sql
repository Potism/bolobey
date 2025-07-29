-- Fix the signup issue by updating the handle_new_user function
-- This will create both users and user_points when someone signs up

-- Step 1: Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create the fixed function that creates both users and user_points
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, display_name, role, created_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    'player',
    NEW.created_at
  );
  
  -- Create user_points entry
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (NEW.id, 50, 0);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Test the function with existing auth users that don't have profiles
-- This will create profiles for the 2 missing users we found earlier
INSERT INTO public.users (id, email, display_name, role, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        au.raw_user_meta_data->>'name',
        SPLIT_PART(au.email, '@', 1),
        'User'
    ) as display_name,
    'player' as role,
    au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create user_points for any users that don't have them
INSERT INTO public.user_points (user_id, betting_points, stream_points)
SELECT 
    u.id,
    50 as betting_points,
    0 as stream_points
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Verify the fix
SELECT 
    'Signup fix completed!' as status,
    'Users table count:' as info1, (SELECT COUNT(*) FROM users) as user_count,
    'User points count:' as info2, (SELECT COUNT(*) FROM user_points) as points_count; 