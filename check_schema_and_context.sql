-- CHECK SCHEMA AND CONTEXT ISSUES
-- This will diagnose schema, search path, and transaction context problems

SELECT '=== CHECKING SCHEMA AND CONTEXT ISSUES ===' as section;

-- 1. Check current search path
SELECT '=== STEP 1: CURRENT SEARCH PATH ===' as section;

SELECT current_setting('search_path') as current_search_path;

-- 2. Check all schemas
SELECT '=== STEP 2: ALL SCHEMAS ===' as section;

SELECT 
  schema_name,
  schema_owner
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

-- 4. Check current user and database
SELECT '=== STEP 4: CURRENT USER AND DATABASE ===' as section;

SELECT 
  current_user as current_user,
  current_database() as current_database,
  session_user as session_user;

-- 5. Check if we can access user_points with explicit schema
SELECT '=== STEP 5: EXPLICIT SCHEMA ACCESS TEST ===' as section;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ Can access public.user_points';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access public.user_points: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM 1 FROM user_points LIMIT 1;
    RAISE NOTICE '✅ Can access user_points (implicit schema)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access user_points (implicit schema): %', SQLERRM;
  END;
END $$;

-- 6. Check trigger function definition
SELECT '=== STEP 6: TRIGGER FUNCTION DEFINITION ===' as section;

SELECT 
  routine_name,
  routine_schema,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 7. Check what triggers exist and their definitions
SELECT '=== STEP 7: ALL TRIGGERS ON AUTH.USERS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_statement,
  action_orientation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 8. Test transaction context
SELECT '=== STEP 8: TRANSACTION CONTEXT TEST ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing transaction context with user_id: %', test_user_id;
  
  BEGIN
    -- Start a transaction
    BEGIN
      -- Try to access user_points in transaction context
      PERFORM 1 FROM public.user_points LIMIT 1;
      RAISE NOTICE '✅ Can access user_points in transaction context';
      
      -- Try to insert into user_points
      INSERT INTO public.user_points (user_id, betting_points, stream_points)
      VALUES (test_user_id, 50, 0);
      RAISE NOTICE '✅ Can insert into user_points in transaction context';
      
      -- Rollback to clean up
      ROLLBACK;
      RAISE NOTICE '✅ Transaction rolled back successfully';
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Transaction context test failed: %', SQLERRM;
        ROLLBACK;
    END;
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Transaction test failed: %', SQLERRM;
  END;
END $$;

-- 9. Check table permissions
SELECT '=== STEP 9: TABLE PERMISSIONS ===' as section;

SELECT 
  table_schema,
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges 
WHERE table_name = 'user_points'
  AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 10. Check if there are any schema conflicts
SELECT '=== STEP 10: SCHEMA CONFLICTS ===' as section;

SELECT 
  'Tables with similar names:' as info;
  
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name ILIKE '%user%' 
  AND table_name ILIKE '%point%'
ORDER BY table_schema, table_name;

-- 11. Final diagnosis
SELECT '=== FINAL DIAGNOSIS ===' as section;
SELECT 'Check the results above to identify:' as note1;
SELECT '1. If user_points exists in the correct schema' as note2;
SELECT '2. If the search path includes the correct schema' as note3;
SELECT '3. If there are permission issues' as note4;
SELECT '4. If the trigger function can access the table' as note5;
SELECT '5. If there are schema conflicts' as note6; 