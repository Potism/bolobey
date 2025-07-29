-- Supabase Service Check - Fundamental Issues
-- Run this in your Supabase SQL Editor

-- 1. Check if we can access basic Supabase services
SELECT '=== BASIC SERVICE ACCESS ===' as section;

-- Check if we can read from auth.users
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users LIMIT 1) 
    THEN '✅ Can read from auth.users'
    ELSE '❌ Cannot read from auth.users'
  END as auth_read_status;

-- Check if we can read from public.users
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM users LIMIT 1) 
    THEN '✅ Can read from public.users'
    ELSE '❌ Cannot read from public.users'
  END as public_read_status;

-- 2. Check Supabase project configuration
SELECT '=== PROJECT CONFIGURATION ===' as section;

-- Check if auth schema is accessible
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
    THEN '✅ Auth schema accessible'
    ELSE '❌ Auth schema not accessible'
  END as auth_schema_status;

-- Check if we can see auth tables
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = table_name) 
    THEN '✅ Accessible'
    ELSE '❌ Not accessible'
  END as table_status
FROM (VALUES ('users'), ('identities'), ('sessions'), ('refresh_tokens')) AS t(table_name);

-- 3. Check for any locks or maintenance mode
SELECT '=== SERVICE STATUS ===' as section;

-- Check if there are any active locks
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_locks 
      WHERE locktype = 'relation' 
      AND relation::regclass::text LIKE 'auth.%'
    ) 
    THEN '⚠️ Active locks detected on auth tables'
    ELSE '✅ No active locks on auth tables'
  END as lock_status;

-- Check if we can create a simple test table
SELECT '=== WRITE PERMISSIONS ===' as section;

-- Try to create a test table
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS test_service_check (
    id SERIAL PRIMARY KEY,
    test_column TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  INSERT INTO test_service_check (test_column) VALUES ('test');
  
  RAISE NOTICE '✅ Can create and write to tables';
  
  DROP TABLE test_service_check;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Cannot create/write to tables: %', SQLERRM;
END $$;

-- 4. Check Supabase-specific configurations
SELECT '=== SUPABASE CONFIG ===' as section;

-- Check if we can access Supabase config
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.config LIMIT 1) 
    THEN '✅ Can access auth.config'
    ELSE '❌ Cannot access auth.config'
  END as config_access_status;

-- Check current auth settings
SELECT 
  key,
  value,
  CASE 
    WHEN value = 'true' THEN '✅ Enabled'
    WHEN value = 'false' THEN '❌ Disabled'
    ELSE '⚠️ Unknown'
  END as status
FROM auth.config 
WHERE key IN ('enable_signup', 'enable_confirmations', 'enable_manual_linking');

-- 5. Check for any error logs or issues
SELECT '=== ERROR CHECK ===' as section;

-- Check if there are any recent errors in the logs
SELECT 
  'Check Supabase Dashboard > Logs > Database for recent errors' as log_check;
SELECT 
  'Look for any "permission denied" or "service unavailable" messages' as log_check2;

-- 6. Test basic auth operations
SELECT '=== AUTH OPERATION TEST ===' as section;

-- Try to manually insert a test user (this will help identify the exact issue)
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || test_id::text || '@example.com';
  insert_success BOOLEAN := false;
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
  
  insert_success := true;
  RAISE NOTICE '✅ Manual auth.users insert successful for: %', test_email;
  
  -- Clean up test user
  DELETE FROM auth.users WHERE id = test_id;
  
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '❌ Insufficient privileges to insert into auth.users';
  WHEN permission_denied THEN
    RAISE NOTICE '❌ Permission denied for auth.users';
  WHEN undefined_table THEN
    RAISE NOTICE '❌ Auth.users table does not exist or is not accessible';
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Manual auth.users insert failed: %', SQLERRM;
END $$;

-- 7. Check for Supabase service limitations
SELECT '=== SERVICE LIMITATIONS ===' as section;

-- Check current user count
SELECT 
  'Current users in auth.users: ' || COUNT(*) as user_count 
FROM auth.users;

-- Check if we're near any limits
SELECT 
  CASE 
    WHEN COUNT(*) > 1000 THEN '⚠️ High user count - check plan limits'
    WHEN COUNT(*) > 100 THEN '⚠️ Moderate user count'
    ELSE '✅ User count is low'
  END as user_count_status
FROM auth.users;

-- 8. Recommendations based on findings
SELECT '=== RECOMMENDATIONS ===' as section;
SELECT 'If you cannot create auth manually:' as note1;
SELECT '1. Check your Supabase plan limits' as rec1;
SELECT '2. Verify your project is not in maintenance mode' as rec2;
SELECT '3. Check if your project has been suspended' as rec3;
SELECT '4. Contact Supabase support immediately' as rec4;
SELECT '5. Consider creating a new project to test' as rec5; 