-- SIMPLE DIAGNOSTIC
-- This checks the core issues without complex syntax

SELECT '=== SIMPLE DIAGNOSTIC ===' as section;

-- 1. Check Database Connection
SELECT '=== STEP 1: DATABASE CONNECTION ===' as section;

SELECT 
  current_database() as current_database,
  current_user as current_user,
  session_user as session_user,
  current_setting('search_path') as search_path;

-- 2. Check if user_points table exists
SELECT '=== STEP 2: USER_POINTS TABLE CHECK ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_points' AND schemaname = 'public')
    THEN '✅ user_points table EXISTS in public schema'
    ELSE '❌ user_points table DOES NOT EXIST in public schema'
  END as user_points_status;

-- 3. Check if users table exists
SELECT '=== STEP 3: USERS TABLE CHECK ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public')
    THEN '✅ users table EXISTS in public schema'
    ELSE '❌ users table DOES NOT EXIST in public schema'
  END as users_status;

-- 4. Check if handle_new_user function exists
SELECT '=== STEP 4: FUNCTION CHECK ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user')
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- 5. Check if trigger exists
SELECT '=== STEP 5: TRIGGER CHECK ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

-- 6. Check RLS status
SELECT '=== STEP 6: RLS STATUS ===' as section;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('users', 'user_points')
  AND schemaname = 'public'
ORDER BY tablename;

-- 7. Check permissions
SELECT '=== STEP 7: PERMISSIONS ===' as section;

SELECT 
  table_schema,
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges 
WHERE table_name IN ('users', 'user_points')
  AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- 8. Test table access
SELECT '=== STEP 8: TABLE ACCESS TEST ===' as section;

DO $$
BEGIN
  -- Test user_points access
  BEGIN
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ Can access public.user_points';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access public.user_points: %', SQLERRM;
  END;
  
  -- Test users access
  BEGIN
    PERFORM 1 FROM public.users LIMIT 1;
    RAISE NOTICE '✅ Can access public.users';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access public.users: %', SQLERRM;
  END;
END $$;

-- 9. Final summary
SELECT '=== STEP 9: FINAL SUMMARY ===' as section;

SELECT 'Diagnostic Summary:' as summary;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_points' AND schemaname = 'public')
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table MISSING - This is the main issue!'
  END as issue_1;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public')
    THEN '✅ users table EXISTS'
    ELSE '❌ users table MISSING'
  END as issue_2;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user')
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function MISSING'
  END as issue_3;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger MISSING'
  END as issue_4;

SELECT '=== SIMPLE DIAGNOSTIC COMPLETED ===' as section; 