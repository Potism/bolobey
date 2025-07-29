-- DIAGNOSTIC: Check the current state of user_points table
-- This will help us understand why signup is still failing

SELECT '=== DIAGNOSTIC: USER_POINTS STATUS ===' as section;

-- 1. Check if user_points table exists
SELECT '=== STEP 1: TABLE EXISTENCE ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points' AND table_schema = 'public') 
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST'
  END as table_status;

-- 2. Show table structure
SELECT '=== STEP 2: TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_points' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT '=== STEP 3: RLS POLICIES ===' as section;

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_points' 
  AND schemaname = 'public';

-- 4. Check if there's data in the table
SELECT '=== STEP 4: DATA CHECK ===' as section;

SELECT 
  COUNT(*) as total_records
FROM public.user_points;

-- Show sample data
SELECT 
  user_id,
  betting_points,
  stream_points,
  created_at
FROM public.user_points 
LIMIT 5;

-- 5. Check the handle_new_user function
SELECT '=== STEP 5: HANDLE_NEW_USER FUNCTION ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- Show function definition
SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- 6. Check if the auth trigger exists
SELECT '=== STEP 6: AUTH TRIGGER ===' as section;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_schema = 'auth';

-- 7. Test a simple insert into user_points
SELECT '=== STEP 7: TEST INSERT ===' as section;

-- Create a test user_id (this won't actually create a user, just test the table)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  insert_result TEXT;
BEGIN
  BEGIN
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 0, 50);
    
    -- If we get here, the insert worked
    RAISE NOTICE '✅ Test insert into user_points SUCCESSFUL';
    
    -- Clean up the test record
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Test record cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test insert FAILED: %', SQLERRM;
  END;
END $$;

-- 8. Check for any foreign key issues
SELECT '=== STEP 8: FOREIGN KEY CHECK ===' as section;

SELECT 
  tc.constraint_name,
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
  AND tc.table_name = 'user_points';

-- 9. Final summary
SELECT '=== DIAGNOSTIC SUMMARY ===' as section;

SELECT 
  'If you see "user_points table EXISTS" above, the table is there.' as note1,
  'If you see "Test insert into user_points SUCCESSFUL", the table works.' as note2,
  'The signup error might be in the handle_new_user function.' as note3,
  'Check the function definition above for any issues.' as note4; 