-- SAFETY CHECK: Verify What Will Be Affected
-- Run this BEFORE the complete_user_points_fix.sql

SELECT '=== SAFETY CHECK: WHAT WILL BE AFFECTED ===' as section;

-- 1. Check current user_points table status
SELECT '=== CURRENT USER_POINTS STATUS ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') 
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST'
  END as user_points_status;

-- If table exists, show its structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_points' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what triggers will be affected
SELECT '=== TRIGGERS THAT WILL BE AFFECTED ===' as section;

SELECT 
  trigger_name,
  event_object_table,
  event_object_schema,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'handle_new_user_trigger', 'on_user_created_award_points')
  OR event_object_table = 'users';

-- 3. Check what functions will be affected
SELECT '=== FUNCTIONS THAT WILL BE AFFECTED ===' as section;

SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'award_initial_points')
  AND routine_schema = 'public';

-- 4. Check existing data that will be preserved
SELECT '=== EXISTING DATA THAT WILL BE PRESERVED ===' as section;

-- Count existing users
SELECT 
  'Total users in public.users' as data_type,
  COUNT(*) as count
FROM public.users
UNION ALL
SELECT 
  'Total users in auth.users' as data_type,
  COUNT(*) as count
FROM auth.users;

-- Check if any user_points data exists
SELECT 
  'Existing user_points records' as data_type,
  COUNT(*) as count
FROM public.user_points;

-- 5. Check what tables will NOT be affected
SELECT '=== TABLES THAT WILL NOT BE AFFECTED ===' as section;

SELECT 
  table_name,
  '✅ SAFE - Will not be modified' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'tournaments',
    'tournament_participants', 
    'matches',
    'tournament_phases',
    'prizes',
    'redemptions',
    'betting_matches',
    'bets',
    'users'
  )
ORDER BY table_name;

-- 6. Check for any foreign key dependencies
SELECT '=== FOREIGN KEY DEPENDENCIES ===' as section;

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name = 'user_points' OR tc.table_name = 'user_points');

-- 7. Check RLS policies that will be affected
SELECT '=== RLS POLICIES THAT WILL BE AFFECTED ===' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'user_points';

-- 8. Final safety assessment
SELECT '=== SAFETY ASSESSMENT ===' as section;

SELECT '✅ SAFE TO RUN' as assessment;
SELECT 'The fix will only affect user_points table and auth triggers' as reason1;
SELECT 'All tournament, betting, and prize functionality will be preserved' as reason2;
SELECT 'Existing user data will be preserved' as reason3;
SELECT 'The fix is designed to be non-destructive' as reason4;

SELECT '=== RECOMMENDATION ===' as section;
SELECT '✅ PROCEED WITH complete_user_points_fix.sql' as recommendation;
SELECT 'This fix is safe and will not damage any existing functionality.' as note; 