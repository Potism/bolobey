-- Create Missing Trigger Function
-- This script creates the missing handle_new_user function that's causing signup errors

-- Step 1: Check if the function exists
SELECT 'Checking for handle_new_user function...' as status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- Step 2: Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile in public.users
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

  -- Create user_points entry with error handling
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
      -- Log the error but don't abort the transaction
      RAISE NOTICE 'Foreign key violation when creating user_points for user %: %', NEW.id, SQLERRM;
    WHEN OTHERS THEN
      -- Log any other error but don't abort the transaction
      RAISE NOTICE 'Error creating user_points for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Check if the trigger exists
SELECT 'Checking for trigger...' as status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- Step 4: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify the setup
SELECT 'Verifying setup...' as status;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 6: Test the function (optional)
SELECT 'Testing function creation...' as status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
    THEN '✅ handle_new_user function created successfully'
    ELSE '❌ handle_new_user function creation failed'
  END as test_result;

SELECT '🎉 Signup should now work! Try creating a new account.' as final_status; 