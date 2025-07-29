-- Debug Signup Error - Comprehensive Investigation
-- Run this in your Supabase SQL Editor to identify the exact issue

-- 1. Check current database state
SELECT '=== DATABASE STATE CHECK ===' as section;

-- Check if users table exists and its structure
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
    THEN '✅ Users table EXISTS'
    ELSE '❌ Users table DOES NOT EXIST'
  END as table_status;

-- Show complete table structure
SELECT '=== USERS TABLE STRUCTURE ===' as section;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  CASE 
    WHEN column_default IS NOT NULL THEN 'Has default'
    ELSE 'No default'
  END as default_status
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Check trigger and function status
SELECT '=== TRIGGER AND FUNCTION STATUS ===' as section;

-- Check if handle_new_user function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- 3. Check RLS policies
SELECT '=== RLS POLICIES ===' as section;
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has conditions'
    ELSE 'No conditions'
  END as has_conditions
FROM pg_policies 
WHERE tablename = 'users';

-- 4. Check if there are any existing users with the same email
SELECT '=== EXISTING USER CHECK ===' as section;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'streamerdude@gmail.com') 
    THEN '❌ User already exists in auth.users'
    ELSE '✅ Email is available in auth.users'
  END as auth_user_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE email = 'streamerdude@gmail.com') 
    THEN '❌ User already exists in public.users'
    ELSE '✅ Email is available in public.users'
  END as public_user_status;

-- 5. Test the handle_new_user function manually (if it exists)
SELECT '=== FUNCTION TEST ===' as section;

-- Check function definition
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN 'Function exists - checking definition...'
    ELSE 'Function does not exist'
  END as function_check;

-- 6. Check for any recent errors in the logs
SELECT '=== RECENT ERRORS ===' as section;
SELECT 
  'Check Supabase Dashboard > Logs > Auth for recent errors around signup time' as log_check;

-- 7. Test manual insert to see if table constraints are the issue
SELECT '=== MANUAL INSERT TEST ===' as section;

-- Try to manually insert a test user (this will help identify constraint issues)
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  insert_result TEXT;
BEGIN
  -- Try to insert a test user
  INSERT INTO users (
    id,
    email,
    display_name,
    role,
    avatar_url,
    shipping_address,
    phone_number,
    city,
    state_province,
    postal_code,
    country
  )
  VALUES (
    test_id,
    'test_' || test_id::text || '@example.com',
    'Test User',
    'player',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'PH'
  );
  
  insert_result := '✅ Manual insert successful';
  
  -- Clean up test user
  DELETE FROM users WHERE id = test_id;
  
  RAISE NOTICE '%', insert_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Manual insert failed: %', SQLERRM;
END $$;

-- 8. Check for any foreign key constraints that might be missing
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

-- 9. Check if there are any triggers that might be interfering
SELECT '=== ALL TRIGGERS ON USERS TABLE ===' as section;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 10. Final recommendations
SELECT '=== RECOMMENDATIONS ===' as section;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
      AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN '✅ All components exist - check Supabase Auth logs for specific error'
    ELSE '❌ Missing components - run the fix script again'
  END as overall_status;

SELECT 'Next steps:' as action;
SELECT '1. Check Supabase Dashboard > Logs > Auth for detailed error messages' as step1;
SELECT '2. If no specific error, try the alternative signup fix' as step2;
SELECT '3. Consider temporarily disabling the trigger to test basic signup' as step3; 