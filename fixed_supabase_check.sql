-- Fixed Supabase Service Check - Correct Exception Handling
-- Run this in your Supabase SQL Editor

-- 1. Check basic database access
SELECT '=== BASIC DATABASE ACCESS ===' as section;

-- Check if we can run basic queries
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1) 
    THEN '✅ Basic SQL queries work'
    ELSE '❌ Basic SQL queries fail'
  END as basic_sql_status;

-- Check if we can access information_schema
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables LIMIT 1) 
    THEN '✅ Can access information_schema'
    ELSE '❌ Cannot access information_schema'
  END as schema_access_status;

-- 2. Check auth schema and tables
SELECT '=== AUTH SCHEMA CHECK ===' as section;

-- Check if auth schema exists
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

-- List all tables in auth schema
SELECT 
  'Auth tables found:' as info;
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'users' THEN '✅ Main users table'
    WHEN table_name = 'identities' THEN '✅ Identity providers'
    WHEN table_name = 'sessions' THEN '✅ User sessions'
    WHEN table_name = 'refresh_tokens' THEN '✅ Refresh tokens'
    ELSE '✅ Other auth table'
  END as description
FROM information_schema.tables 
WHERE table_schema = 'auth' 
ORDER BY table_name;

-- 3. Check public schema and users table
SELECT '=== PUBLIC SCHEMA CHECK ===' as section;

-- Check if public.users table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') 
    THEN '✅ Public.users table EXISTS'
    ELSE '❌ Public.users table DOES NOT EXIST'
  END as public_users_status;

-- Check public.users table structure
SELECT 
  'Public.users table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' 
ORDER BY ordinal_position;

-- 4. Test basic read operations
SELECT '=== READ OPERATIONS TEST ===' as section;

-- Try to read from auth.users
DO $$
BEGIN
  PERFORM 1 FROM auth.users LIMIT 1;
  RAISE NOTICE '✅ Can read from auth.users';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Cannot read from auth.users: %', SQLERRM;
END $$;

-- Try to read from public.users
DO $$
BEGIN
  PERFORM 1 FROM users LIMIT 1;
  RAISE NOTICE '✅ Can read from public.users';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Cannot read from public.users: %', SQLERRM;
END $$;

-- 5. Test write operations
SELECT '=== WRITE OPERATIONS TEST ===' as section;

-- Try to create a test table
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS test_write_access (
    id SERIAL PRIMARY KEY,
    test_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  INSERT INTO test_write_access (test_data) VALUES ('test');
  
  RAISE NOTICE '✅ Can create and write to tables';
  
  DROP TABLE test_write_access;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Cannot create/write to tables: %', SQLERRM;
END $$;

-- 6. Check current user count
SELECT '=== CURRENT USER COUNT ===' as section;

-- Count users in auth.users
DO $$
DECLARE
  auth_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  RAISE NOTICE 'Users in auth.users: %', auth_count;
  
  IF auth_count > 1000 THEN
    RAISE NOTICE '⚠️ High user count - check plan limits';
  ELSIF auth_count > 100 THEN
    RAISE NOTICE '⚠️ Moderate user count';
  ELSE
    RAISE NOTICE '✅ User count is low';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Cannot count auth.users: %', SQLERRM;
END $$;

-- Count users in public.users
DO $$
DECLARE
  public_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO public_count FROM users;
  RAISE NOTICE 'Users in public.users: %', public_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Cannot count public.users: %', SQLERRM;
END $$;

-- 7. Test manual auth insert (simplified)
SELECT '=== MANUAL AUTH TEST ===' as section;

-- Try to manually insert a test user
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || test_id::text || '@example.com';
BEGIN
  -- Try to insert into auth.users
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

-- 8. Final recommendations
SELECT '=== RECOMMENDATIONS ===' as section;

SELECT 'Based on the results above:' as note;
SELECT '1. If auth.users table exists but insert fails: Check permissions' as rec1;
SELECT '2. If auth.users table does not exist: Contact Supabase support' as rec2;
SELECT '3. If you can read but not write: Check plan limits' as rec3;
SELECT '4. If nothing works: Project might be suspended' as rec4;
SELECT '5. Try creating a new Supabase project to test' as rec5; 