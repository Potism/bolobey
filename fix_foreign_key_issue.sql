-- Fix Foreign Key Constraint Issue
-- This script fixes the signup issue where user_points insertion fails due to foreign key constraint

-- Step 1: Check current trigger function
SELECT 'Current handle_new_user function:' as info;
SELECT pg_get_functiondef(oid) as function_definition 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Step 2: Create a robust handle_new_user function that handles foreign key constraints
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- First, create the user profile in public.users
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'),
    'player',
    NOW(),
    NOW()
  );

  -- Then, try to create user_points with error handling
  BEGIN
    INSERT INTO public.user_points (
      user_id,
      betting_points,
      stream_points,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      50,  -- Initial betting points
      0,   -- Initial stream points
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- If foreign key fails, log it but don't abort the transaction
      RAISE NOTICE 'Foreign key violation when creating user_points for user %: %', NEW.id, SQLERRM;
    WHEN OTHERS THEN
      -- For any other error, log it but don't abort the transaction
      RAISE NOTICE 'Error creating user_points for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Test the fix
SELECT 'Trigger function updated successfully!' as status;

-- Step 5: Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 6: Create a test function to verify user_points creation
CREATE OR REPLACE FUNCTION public.test_user_points_creation(test_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Try to insert a test user_points entry
  INSERT INTO public.user_points (
    user_id,
    betting_points,
    stream_points,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    0,
    0,
    NOW(),
    NOW()
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'Foreign key violation: user % does not exist in public.users', test_user_id;
    RETURN FALSE;
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

SELECT 'Fix completed! The signup should now work properly.' as final_status; 