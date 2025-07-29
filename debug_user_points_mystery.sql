-- DEBUG: Why user_points table doesn't exist during trigger execution
-- This will help us understand the schema mystery

SELECT '=== DEBUGGING USER_POINTS MYSTERY ===' as section;

-- 1. Check all tables in public schema
SELECT '=== STEP 1: ALL TABLES IN PUBLIC SCHEMA ===' as section;

SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check if user_points exists in any schema
SELECT '=== STEP 2: USER_POINTS IN ALL SCHEMAS ===' as section;

SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'user_points'
ORDER BY table_schema;

-- 3. Check current search_path
SELECT '=== STEP 3: CURRENT SEARCH PATH ===' as section;

SHOW search_path;

-- 4. Check if we can access user_points directly
SELECT '=== STEP 4: DIRECT ACCESS TEST ===' as section;

DO $$
BEGIN
  BEGIN
    -- Try to select from user_points
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ Can access public.user_points directly';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access public.user_points: %', SQLERRM;
  END;
  
  BEGIN
    -- Try to select from user_points without schema
    PERFORM 1 FROM user_points LIMIT 1;
    RAISE NOTICE '✅ Can access user_points without schema';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access user_points without schema: %', SQLERRM;
  END;
END $$;

-- 5. Check table structure
SELECT '=== STEP 5: USER_POINTS TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_points' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check if there's data in the table
SELECT '=== STEP 6: USER_POINTS DATA ===' as section;

SELECT 
  COUNT(*) as total_records
FROM public.user_points;

-- 7. Check the handle_new_user function again
SELECT '=== STEP 7: HANDLE_NEW_USER FUNCTION ===' as section;

SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- 8. Test a simple insert with explicit schema
SELECT '=== STEP 8: EXPLICIT SCHEMA INSERT TEST ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  BEGIN
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 0, 50);
    
    RAISE NOTICE '✅ Explicit schema insert successful';
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Explicit schema insert failed: %', SQLERRM;
  END;
END $$;

-- 9. Check if there are any transaction issues
SELECT '=== STEP 9: TRANSACTION STATUS ===' as section;

SELECT 
  CASE 
    WHEN txid_current() = 0 THEN 'No active transaction'
    ELSE 'Active transaction: ' || txid_current()
  END as transaction_status;

-- 10. Check if the table is in a different database
SELECT '=== STEP 10: DATABASE INFO ===' as section;

SELECT 
  current_database() as current_db,
  current_user as current_user,
  session_user as session_user;

-- 11. Final mystery check
SELECT '=== STEP 11: MYSTERY SOLVING ===' as section;

SELECT 
  'If you see user_points in the table list above, the table EXISTS.' as note1,
  'If the direct access test fails, there might be a permissions issue.' as note2,
  'If the function test fails, the function might be running in a different context.' as note3,
  'The error suggests the trigger is running in a context where user_points is not visible.' as note4; 