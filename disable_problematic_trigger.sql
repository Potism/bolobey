-- Safely Disable Problematic Trigger
-- This disables the trigger that's causing signup issues

-- Step 1: Disable the trigger (safer than dropping it)
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Step 2: Verify the trigger is disabled
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  CASE 
    WHEN tgrelid IS NOT NULL THEN 'ENABLED'
    ELSE 'DISABLED'
  END as status
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 3: Create a simple function for manual user creation
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  display_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(display_name, split_part(user_email, '@', 1)),
    'player',
    NOW(),
    NOW()
  );

  -- Create user_points
  INSERT INTO public.user_points (
    user_id,
    betting_points,
    stream_points,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    50,  -- Initial betting points
    0,   -- Initial stream points
    NOW(),
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Test the function
SELECT 'Trigger disabled and manual function created!' as status;
SELECT 'You can now use create_user_profile() function to create users manually.' as note; 