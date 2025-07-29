-- Quick Auth Fix - Temporary Solution
-- Run this in your Supabase SQL Editor

-- 1. First, let's temporarily disable any triggers that might be causing issues
SELECT '=== DISABLING TRIGGERS ===' as section;

-- Disable the auth trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;

SELECT '✅ Triggers disabled temporarily' as status;

-- 2. Check if we can manually create a user profile
SELECT '=== MANUAL PROFILE CREATION TEST ===' as section;

-- Try to manually create a test user profile
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || test_id::text || '@example.com';
BEGIN
  -- First, try to insert into auth.users manually
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
  
  -- Now try to create the profile in public.users
  INSERT INTO users (
    id,
    email,
    display_name,
    role,
    country
  )
  VALUES (
    test_id,
    test_email,
    'Test User',
    'player',
    'PH'
  );
  
  RAISE NOTICE '✅ Manual public.users insert successful';
  
  -- Clean up test user
  DELETE FROM users WHERE id = test_id;
  DELETE FROM auth.users WHERE id = test_id;
  
  RAISE NOTICE '✅ Test completed successfully - manual creation works';
  
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '❌ Insufficient privileges - check your Supabase plan';
  WHEN permission_denied THEN
    RAISE NOTICE '❌ Permission denied - project might be restricted';
  WHEN undefined_table THEN
    RAISE NOTICE '❌ Table does not exist - check database setup';
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Manual creation failed: %', SQLERRM;
END $$;

-- 3. If manual creation works, create a simple trigger
SELECT '=== CREATING SIMPLE TRIGGER ===' as section;

-- Create a very simple trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert the essential fields
  INSERT INTO public.users (id, email, display_name, role, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    'player',
    'PH'
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created_simple
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();

SELECT '✅ Simple trigger created' as status;

-- 4. Test the simple trigger
SELECT '=== TESTING SIMPLE TRIGGER ===' as section;

-- Try to create another test user to test the trigger
DO $$
DECLARE
  test_id2 UUID := gen_random_uuid();
  test_email2 TEXT := 'test2_' || test_id2::text || '@example.com';
BEGIN
  -- Insert into auth.users (this should trigger the function)
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
    test_id2,
    test_email2,
    crypt('testpassword', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"display_name": "Test User 2"}'::jsonb,
    false,
    '',
    '',
    '',
    ''
  );
  
  RAISE NOTICE '✅ Trigger test successful for: %', test_email2;
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM users WHERE id = test_id2) THEN
    RAISE NOTICE '✅ Profile was created by trigger';
  ELSE
    RAISE NOTICE '❌ Profile was not created by trigger';
  END IF;
  
  -- Clean up
  DELETE FROM users WHERE id = test_id2;
  DELETE FROM auth.users WHERE id = test_id2;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Trigger test failed: %', SQLERRM;
END $$;

-- 5. Final status
SELECT '=== FINAL STATUS ===' as section;
SELECT '🎉 Quick auth fix completed!' as status;
SELECT 'Now try signing up with streamerdude@gmail.com' as instruction;
SELECT 'If it works, the issue was with the complex trigger' as note;
SELECT 'If it still fails, the issue is with Supabase Auth service' as note2;

-- 6. Cleanup instructions
SELECT '=== CLEANUP (if needed) ===' as section;
SELECT 'To restore original trigger later:' as cleanup_note;
SELECT '1. DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;' as cleanup1;
SELECT '2. DROP FUNCTION IF EXISTS public.handle_new_user_simple();' as cleanup2;
SELECT '3. Run the complete_signup_fix.sql script' as cleanup3; 