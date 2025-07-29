-- BASIC TEST
-- This is a very simple test to see if we can get output

SELECT 'TEST 1: Basic SELECT' as test;

SELECT current_database() as database_name;

SELECT 'TEST 2: Check if user_points exists' as test;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_points' AND schemaname = 'public')
    THEN 'YES - user_points table EXISTS'
    ELSE 'NO - user_points table DOES NOT EXIST'
  END as result;

SELECT 'TEST 3: Check if users exists' as test;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public')
    THEN 'YES - users table EXISTS'
    ELSE 'NO - users table DOES NOT EXIST'
  END as result;

SELECT 'TEST 4: List all tables in public schema' as test;

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

SELECT 'BASIC TEST COMPLETED' as final; 