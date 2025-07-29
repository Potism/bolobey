-- Temporary Signup Fix - Disable Trigger to Test Basic Signup
-- Run this in your Supabase SQL Editor

-- 1. First, let's temporarily disable the trigger to test basic signup
SELECT '=== TEMPORARILY DISABLING TRIGGER ===' as section;

-- Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

SELECT '✅ Trigger disabled temporarily' as status;

-- 2. Test if basic signup works now
SELECT '=== TESTING BASIC SIGNUP ===' as section;
SELECT 'Now try to sign up with streamerdude@gmail.com' as instruction;
SELECT 'If signup works, the issue is with the trigger function' as note;
SELECT 'If signup still fails, the issue is elsewhere' as note2;

-- 3. If signup works, we'll create a simpler trigger function
SELECT '=== SIMPLER TRIGGER FUNCTION ===' as section;

-- Create a much simpler handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert the absolutely essential fields
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE LOG 'Simple handle_new_user error: %', SQLERRM;
    -- Still return NEW to not break the signup
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger with the simple function
CREATE TRIGGER on_auth_user_created_simple
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();

SELECT '✅ Simple trigger created' as status;

-- 5. Test the simple trigger
SELECT '=== TESTING SIMPLE TRIGGER ===' as section;
SELECT 'Try signing up again - this should work with minimal fields' as instruction;

-- 6. If that works, we can gradually add fields back
SELECT '=== NEXT STEPS ===' as section;
SELECT 'If simple trigger works:' as step1;
SELECT '1. We know the issue is with the complex trigger' as step1a;
SELECT '2. We can gradually add fields back one by one' as step1b;
SELECT '3. This will help identify which field is causing the issue' as step1c;

-- 7. Cleanup function (run this later if needed)
SELECT '=== CLEANUP (run later if needed) ===' as section;
SELECT '-- To restore the original trigger later, run:' as cleanup_note;
SELECT '-- DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;' as cleanup1;
SELECT '-- DROP FUNCTION IF EXISTS public.handle_new_user_simple();' as cleanup2;
SELECT '-- Then run the full fix script again' as cleanup3;

-- 8. Manual user creation function (alternative approach)
SELECT '=== ALTERNATIVE: MANUAL USER CREATION ===' as section;

CREATE OR REPLACE FUNCTION create_user_profile_manually(user_email TEXT, user_display_name TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;
  
  -- Create profile in public.users
  INSERT INTO public.users (id, email, display_name)
  VALUES (user_id, user_email, user_display_name)
  ON CONFLICT (id) DO NOTHING;
  
  -- Award initial points
  INSERT INTO user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 0, 50)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Manual user creation error: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Manual user creation function created' as status;
SELECT 'You can call: SELECT create_user_profile_manually(''streamerdude@gmail.com'', ''streamerdude'');' as usage; 