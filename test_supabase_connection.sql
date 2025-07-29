-- Test Supabase Connection and user_points table
-- This will be run directly against your Supabase database

SELECT '=== CONNECTION TEST ===' as test;

SELECT current_database() as database_name;
SELECT current_user as current_user;
SELECT session_user as session_user;

SELECT '=== TABLE EXISTENCE TEST ===' as test;

-- Check if user_points table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_points' AND schemaname = 'public')
    THEN '✅ user_points table EXISTS in public schema'
    ELSE '❌ user_points table DOES NOT EXIST in public schema'
  END as user_points_status;

-- Check if users table exists  
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public')
    THEN '✅ users table EXISTS in public schema'
    ELSE '❌ users table DOES NOT EXIST in public schema'
  END as users_status;

SELECT '=== FUNCTION TEST ===' as test;

-- Check if handle_new_user function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

SELECT '=== TRIGGER TEST ===' as test;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN '✅ on_auth_user_created trigger EXISTS'
    ELSE '❌ on_auth_user_created trigger DOES NOT EXIST'
  END as trigger_status;

SELECT '=== FINAL SUMMARY ===' as test; 