-- COMPREHENSIVE DATABASE DIAGNOSTIC
-- This checks all potential database connection and schema issues

SELECT '=== COMPREHENSIVE DATABASE DIAGNOSTIC ===' as section;

-- 1. Check Database Connection and Context
SELECT '=== STEP 1: DATABASE CONNECTION CHECK ===' as section;

SELECT 
  current_database() as current_database,
  current_user as current_user,
  session_user as session_user,
  current_setting('search_path') as search_path,
  version() as postgres_version;

-- 2. Check All Schemas
SELECT '=== STEP 2: ALL SCHEMAS CHECK ===' as section;

SELECT 
  schema_name,
  schema_owner,
  default_character_set_name,
  sql_path
FROM information_schema.schemata
ORDER BY schema_name;

-- 3. Check user_points table in ALL schemas
SELECT '=== STEP 3: USER_POINTS IN ALL SCHEMAS ===' as section;

SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name ILIKE '%user_points%'
ORDER BY table_schema, table_name;

-- 4. Check users table in ALL schemas
SELECT '=== STEP 4: USERS IN ALL SCHEMAS ===' as section;

SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'users'
ORDER BY table_schema, table_name;

-- 5. Check Current Role Permissions
SELECT '=== STEP 5: CURRENT ROLE PERMISSIONS ===' as section;

SELECT 
  rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin
FROM pg_roles 
WHERE rolname = current_user;

-- 6. Check Table Permissions for Current User
SELECT '=== STEP 6: TABLE PERMISSIONS CHECK ===' as section;

SELECT 
  table_schema,
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges 
WHERE table_name IN ('users', 'user_points')
  AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- 7. Check if we can access user_points with different approaches
SELECT '=== STEP 7: TABLE ACCESS TEST ===' as section;

DO $$
BEGIN
  RAISE NOTICE 'Testing table access methods...';
  
  -- Test 1: Direct access with explicit schema
  BEGIN
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ Can access public.user_points (explicit schema)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access public.user_points: %', SQLERRM;
  END;
  
  -- Test 2: Access with implicit schema
  BEGIN
    PERFORM 1 FROM user_points LIMIT 1;
    RAISE NOTICE '✅ Can access user_points (implicit schema)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access user_points (implicit schema): %', SQLERRM;
  END;
  
  -- Test 3: Check if table exists in information_schema
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points' AND table_schema = 'public') THEN
      RAISE NOTICE '✅ user_points exists in information_schema';
    ELSE
      RAISE NOTICE '❌ user_points does NOT exist in information_schema';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error checking information_schema: %', SQLERRM;
  END;
  
  -- Test 4: Check if table exists in pg_tables
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_points' AND schemaname = 'public') THEN
      RAISE NOTICE '✅ user_points exists in pg_tables';
    ELSE
      RAISE NOTICE '❌ user_points does NOT exist in pg_tables';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error checking pg_tables: %', SQLERRM;
  END;
  
END $$;

-- 8. Check RLS Policies
SELECT '=== STEP 8: RLS POLICIES CHECK ===' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('users', 'user_points')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. Check if RLS is enabled
SELECT '=== STEP 9: RLS STATUS CHECK ===' as section;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('users', 'user_points')
  AND schemaname = 'public'
ORDER BY tablename;

-- 10. Check Trigger Function Context
SELECT '=== STEP 10: TRIGGER FUNCTION CONTEXT ===' as section;

SELECT 
  routine_name,
  routine_schema,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 11. Test Trigger Function in Different Contexts
SELECT '=== STEP 11: TRIGGER FUNCTION CONTEXT TEST ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-context@example.com';
BEGIN
  RAISE NOTICE 'Testing trigger function in current context...';
  
  BEGIN
    -- Test the trigger function
    PERFORM public.handle_new_user() FROM (
      SELECT 
        test_user_id as id,
        test_email as email,
        '{"display_name": "Test Context User"}'::jsonb as raw_user_meta_data
    ) as test_data;
    
    RAISE NOTICE '✅ Trigger function executed successfully';
    
    -- Check if user was created
    IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
      RAISE NOTICE '✅ User profile created successfully';
    ELSE
      RAISE NOTICE '❌ User profile was NOT created';
    END IF;
    
    -- Check if points were created
    IF EXISTS (SELECT 1 FROM public.user_points WHERE user_id = test_user_id) THEN
      RAISE NOTICE '✅ User points created successfully';
    ELSE
      RAISE NOTICE '❌ User points were NOT created';
    END IF;
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Trigger function test failed: %', SQLERRM;
  END;
END $$;

-- 12. Check Connection String Info (if available)
SELECT '=== STEP 12: CONNECTION INFO ===' as section;

SELECT 
  current_setting('application_name') as application_name;

-- Try to get client info if available
DO $$
BEGIN
  BEGIN
    PERFORM current_setting('client_addr');
    RAISE NOTICE '✅ client_addr setting available';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ client_addr setting not available';
  END;
  
  BEGIN
    PERFORM current_setting('client_hostname');
    RAISE NOTICE '✅ client_hostname setting available';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ client_hostname setting not available';
  END;
  
  BEGIN
    PERFORM current_setting('client_port');
    RAISE NOTICE '✅ client_port setting available';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ client_port setting not available';
  END;
END $$;

-- 13. Final Diagnosis Summary
SELECT '=== STEP 13: DIAGNOSIS SUMMARY ===' as section;

SELECT 'Database Diagnostic Summary:' as summary;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_points' AND schemaname = 'public')
    THEN '✅ user_points table EXISTS in public schema'
    ELSE '❌ user_points table DOES NOT EXIST in public schema'
  END as user_points_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public')
    THEN '✅ users table EXISTS in public schema'
    ELSE '❌ users table DOES NOT EXIST in public schema'
  END as users_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user')
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- 14. Recommendations
SELECT '=== STEP 14: RECOMMENDATIONS ===' as section;

SELECT 'Based on the diagnostic results, here are the recommendations:' as recommendations;

SELECT '1. If user_points table does not exist: Run the table creation script' as rec1;
SELECT '2. If RLS is blocking access: Check and fix RLS policies' as rec2;
SELECT '3. If permissions are missing: Grant proper permissions' as rec3;
SELECT '4. If schema issues: Ensure correct search path' as rec4;
SELECT '5. If connection issues: Verify Supabase connection string' as rec5;

SELECT '=== COMPREHENSIVE DIAGNOSTIC COMPLETED ===' as section; 