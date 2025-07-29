-- QUICK CHECK: Essential user_points diagnostics

-- 1. Does the table exist?
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') 
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST'
  END as table_status;

-- 2. Can we insert data?
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (test_user_id, 0, 50);
  DELETE FROM public.user_points WHERE user_id = test_user_id;
  RAISE NOTICE '✅ user_points table works - can insert/delete data';
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE '❌ user_points table has issues: %', SQLERRM;
END $$;

-- 3. Show the handle_new_user function
SELECT '=== HANDLE_NEW_USER FUNCTION ===' as section;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- 4. Show function definition (first 500 chars)
SELECT 
  LEFT(pg_get_functiondef(oid), 500) || '...' as function_start
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- 5. Check auth trigger
SELECT '=== AUTH TRIGGER ===' as section;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
    THEN '✅ auth trigger EXISTS'
    ELSE '❌ auth trigger DOES NOT EXIST'
  END as trigger_status; 