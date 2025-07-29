-- TEST DATABASE CONNECTION
-- This will test if the database and user_points table are working

SELECT '=== TESTING DATABASE CONNECTION ===' as section;

-- 1. Test basic connection
SELECT '=== STEP 1: BASIC CONNECTION TEST ===' as section;

SELECT 
  current_database() as current_db,
  current_user as current_user,
  version() as postgres_version;

-- 2. Test if user_points table exists
SELECT '=== STEP 2: USER_POINTS TABLE TEST ===' as section;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points' AND table_schema = 'public')
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST'
  END as user_points_status;

-- 3. Test if we can access user_points table
SELECT '=== STEP 3: TABLE ACCESS TEST ===' as section;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ Can access user_points table';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot access user_points table: %', SQLERRM;
  END;
END $$;

-- 4. Test if award_initial_points function exists
SELECT '=== STEP 4: FUNCTION TEST ===' as section;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'award_initial_points' AND routine_schema = 'public')
    THEN '✅ award_initial_points function EXISTS'
    ELSE '❌ award_initial_points function DOES NOT EXIST'
  END as function_status;

-- 5. Test the function
SELECT '=== STEP 5: FUNCTION EXECUTION TEST ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result BOOLEAN;
BEGIN
  RAISE NOTICE 'Testing award_initial_points function with user_id: %', test_user_id;
  
  BEGIN
    result := public.award_initial_points(test_user_id);
    
    IF result THEN
      RAISE NOTICE '✅ Function execution successful';
      
      -- Verify the points were created
      RAISE NOTICE 'User betting points: %', (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
      
      -- Clean up
      DELETE FROM public.user_points WHERE user_id = test_user_id;
      RAISE NOTICE '✅ Test data cleaned up';
    ELSE
      RAISE NOTICE '❌ Function execution failed';
    END IF;
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Function test failed: %', SQLERRM;
  END;
END $$;

-- 6. Test if users table exists
SELECT '=== STEP 6: USERS TABLE TEST ===' as section;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
    THEN '✅ users table EXISTS'
    ELSE '❌ users table DOES NOT EXIST'
  END as users_status;

-- 7. Final status
SELECT '=== DATABASE TEST COMPLETED ===' as section;
SELECT 'Check the results above to see what is working and what is not.' as instruction; 