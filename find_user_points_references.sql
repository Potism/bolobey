-- DIAGNOSTIC: Find All user_points References
-- This will help us identify what's causing the transaction abort

SELECT '=== DIAGNOSING USER_POINTS REFERENCES ===' as section;

-- 1. Check if user_points table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') 
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST'
  END as user_points_status;

-- 2. Find ALL functions that reference user_points
SELECT '=== FUNCTIONS REFERENCING USER_POINTS ===' as section;

SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%user_points%'
  AND routine_schema = 'public';

-- 3. Find ALL triggers that reference user_points
SELECT '=== TRIGGERS REFERENCING USER_POINTS ===' as section;

SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE action_statement LIKE '%user_points%';

-- 4. Find ALL views that reference user_points
SELECT '=== VIEWS REFERENCING USER_POINTS ===' as section;

SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE view_definition LIKE '%user_points%'
  AND table_schema = 'public';

-- 5. Check auth.users triggers specifically
SELECT '=== AUTH.USERS TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- 6. Check public.users triggers
SELECT '=== PUBLIC.USERS TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND event_object_schema = 'public';

-- 7. List ALL functions in public schema
SELECT '=== ALL PUBLIC FUNCTIONS ===' as section;

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 8. Check for any foreign key constraints
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;

SELECT 
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
  AND (ccu.table_name = 'user_points' OR tc.table_name = 'user_points');

-- 9. Check for any RLS policies
SELECT '=== RLS POLICIES ===' as section;

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
WHERE tablename LIKE '%user%' OR tablename LIKE '%point%';

-- 10. Check current transaction state
SELECT '=== CURRENT TRANSACTION STATE ===' as section;

SELECT 
  'Current transaction state check' as info,
  txid_current() as current_transaction_id;

-- 11. Check for any locks
SELECT '=== ACTIVE LOCKS ===' as section;

SELECT 
  locktype,
  database,
  relation::regclass,
  mode,
  granted
FROM pg_locks 
WHERE NOT granted OR relation::regclass::text LIKE '%user%' OR relation::regclass::text LIKE '%point%';

SELECT '=== DIAGNOSIS COMPLETE ===' as section;
SELECT 'Check the results above to identify what references user_points' as instruction; 