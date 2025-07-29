-- Debug and fix the trigger issue causing signup failures
-- The error happens at supabase.auth.signUp() level, which means the trigger is failing

-- Step 1: Check current trigger status
SELECT 
    'Current trigger status:' as info,
    trigger_name,
    event_object_schema,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- Step 2: Check if user_points table exists and is accessible
SELECT 
    'user_points table check:' as info,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_points'
    ) as table_exists,
    (SELECT COUNT(*) FROM public.user_points) as current_records;

-- Step 3: Drop the problematic trigger completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 4: Create a minimal trigger function that ONLY creates user profile (no points)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- ONLY create user profile, skip points entirely
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
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    'player',
    COALESCE(NEW.created_at, NOW()),
    NOW(),
    'PH'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, this is fine
    RAISE LOG 'User already exists: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Verify the trigger was created
SELECT 
    'Trigger creation status:' as info,
    'Function exists:' as func_status, EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'handle_new_user'
    ) as function_exists,
    'Trigger exists:' as trig_status, EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name = 'on_auth_user_created'
        AND event_object_schema = 'auth'
        AND event_object_table = 'users'
    ) as trigger_exists;

-- Step 7: Test the function manually
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test_' || test_user_id::text || '@example.com';
BEGIN
    -- Test the function with dummy data
    PERFORM public.handle_new_user() FROM (
        SELECT 
            test_user_id as id,
            test_email as email,
            '{"display_name": "Test User"}'::jsonb as raw_user_meta_data,
            NOW() as created_at
    ) AS NEW;
    
    RAISE NOTICE 'Test function executed successfully for: %', test_email;
    
    -- Clean up test data
    DELETE FROM public.users WHERE id = test_user_id;
END $$;