-- Supabase Auth Debug - Check Auth Service Configuration
-- Run this in your Supabase SQL Editor

-- 1. Check Supabase Auth configuration
SELECT '=== SUPABASE AUTH CONFIGURATION ===' as section;

-- Check if auth schema exists and is accessible
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
    THEN '✅ Auth schema EXISTS'
    ELSE '❌ Auth schema DOES NOT EXIST'
  END as auth_schema_status;

-- Check if auth.users table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') 
    THEN '✅ Auth.users table EXISTS'
    ELSE '❌ Auth.users table DOES NOT EXIST'
  END as auth_users_status;

-- 2. Check current auth settings
SELECT '=== AUTH SETTINGS ===' as section;

-- Check if signup is enabled (this should be true)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.config 
      WHERE key = 'enable_signup' AND value = 'true'
    ) 
    THEN '✅ Signup is ENABLED'
    ELSE '❌ Signup is DISABLED'
  END as signup_status;

-- 3. Check for any existing users with the same email
SELECT '=== EXISTING USER CHECK ===' as section;

-- Check if the email already exists in auth.users
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'streamerdude@gmail.com') 
    THEN '❌ User already exists in auth.users'
    ELSE '✅ Email is available in auth.users'
  END as email_status;

-- 4. Check auth triggers and functions
SELECT '=== AUTH TRIGGERS ===' as section;

-- Check if our trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- Check if our function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- 5. Test auth function manually (if it exists)
SELECT '=== FUNCTION TEST ===' as section;

-- Check function definition
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN 'Function exists - checking if it can be called...'
    ELSE 'Function does not exist'
  END as function_check;

-- 6. Check for any recent auth errors
SELECT '=== RECENT AUTH ERRORS ===' as section;
SELECT 
  'Check Supabase Dashboard > Logs > Auth for recent 500 errors' as log_check;
SELECT 
  'Look for errors around the time you tried to sign up' as log_check2;

-- 7. Check RLS policies that might interfere
SELECT '=== RLS POLICIES ===' as section;
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'users';

-- 8. Check if there are any foreign key constraints that might be failing
SELECT '=== FOREIGN KEY CHECKS ===' as section;
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'users';

-- 9. Check Supabase project status
SELECT '=== PROJECT STATUS ===' as section;
SELECT 
  'Check your Supabase project status at: https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]' as dashboard_check;
SELECT 
  'Look for any maintenance notices or service disruptions' as status_check;

-- 10. Alternative signup test
SELECT '=== ALTERNATIVE TEST ===' as section;

-- Try to manually create a test user in auth.users (this will help identify if it's a trigger issue)
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || test_id::text || '@example.com';
BEGIN
  -- Try to manually insert into auth.users
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
  
  -- Clean up test user
  DELETE FROM auth.users WHERE id = test_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Manual auth.users insert failed: %', SQLERRM;
END $$;

-- 11. Recommendations
SELECT '=== RECOMMENDATIONS ===' as section;
SELECT '1. Check Supabase Dashboard > Logs > Auth for detailed error messages' as step1;
SELECT '2. Verify your Supabase project is not in maintenance mode' as step2;
SELECT '3. Check if your Supabase plan has any limitations' as step3;
SELECT '4. Try signing up with a different email address' as step4;
SELECT '5. Contact Supabase support if the issue persists' as step5; 