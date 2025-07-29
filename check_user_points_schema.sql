-- CHECK USER_POINTS SCHEMA: Diagnose schema mismatches
-- This will help identify if there's a mismatch between expected and actual structure

SELECT '=== CHECKING USER_POINTS SCHEMA ===' as section;

-- 1. Check if user_points table exists
SELECT '=== STEP 1: CHECKING TABLE EXISTENCE ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') 
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST'
  END as user_points_status;

-- 2. Show current table structure
SELECT '=== STEP 2: CURRENT TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'user_points' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check for any constraints
SELECT '=== STEP 3: TABLE CONSTRAINTS ===' as section;

SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'user_points' 
  AND table_schema = 'public';

-- 4. Check foreign key constraints
SELECT '=== STEP 4: FOREIGN KEY CONSTRAINTS ===' as section;

SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_points';

-- 5. Check what the handle_new_user function expects
SELECT '=== STEP 5: HANDLE_NEW_USER FUNCTION EXPECTATIONS ===' as section;

SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
  AND routine_schema = 'public';

-- 6. Check for any references to total_betting_points_earned
SELECT '=== STEP 6: CHECKING FOR TOTAL_BETTING_POINTS_EARNED REFERENCES ===' as section;

-- Check in functions
SELECT 
  'Functions referencing total_betting_points_earned:' as info;
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_definition LIKE '%total_betting_points_earned%'
  AND routine_schema = 'public';

-- Check in triggers
SELECT 
  'Triggers referencing total_betting_points_earned:' as info;
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%total_betting_points_earned%';

-- Check in views
SELECT 
  'Views referencing total_betting_points_earned:' as info;
SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE view_definition LIKE '%total_betting_points_earned%'
  AND table_schema = 'public';

-- 7. Check current data in user_points
SELECT '=== STEP 7: CURRENT USER_POINTS DATA ===' as section;

SELECT 
  'Sample data from user_points:' as info;
SELECT 
  id,
  user_id,
  betting_points,
  stream_points,
  created_at,
  updated_at
FROM public.user_points 
LIMIT 5;

-- 8. Check for any missing columns that might be expected
SELECT '=== STEP 8: CHECKING FOR MISSING COLUMNS ===' as section;

-- List columns that might be expected but missing
SELECT 
  'Expected columns that might be missing:' as info,
  'total_betting_points_earned' as expected_column1,
  'total_stream_points_earned' as expected_column2,
  'total_points' as expected_column3;

-- Check if any of these exist
SELECT 
  column_name,
  'EXISTS' as status
FROM information_schema.columns 
WHERE table_name = 'user_points' 
  AND table_schema = 'public'
  AND column_name IN ('total_betting_points_earned', 'total_stream_points_earned', 'total_points')
UNION ALL
SELECT 
  'total_betting_points_earned' as column_name,
  'MISSING' as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'user_points' 
    AND table_schema = 'public'
    AND column_name = 'total_betting_points_earned'
)
UNION ALL
SELECT 
  'total_stream_points_earned' as column_name,
  'MISSING' as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'user_points' 
    AND table_schema = 'public'
    AND column_name = 'total_stream_points_earned'
)
UNION ALL
SELECT 
  'total_points' as column_name,
  'MISSING' as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'user_points' 
    AND table_schema = 'public'
    AND column_name = 'total_points'
);

-- 9. Check for any recent changes or migrations
SELECT '=== STEP 9: CHECKING FOR RECENT CHANGES ===' as section;

-- Check if there are any backup tables or old versions
SELECT 
  'Tables that might be old versions:' as info;
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name LIKE '%user_points%'
  AND table_name != 'user_points';

-- 10. Final diagnosis
SELECT '=== STEP 10: DIAGNOSIS ===' as section;

SELECT 'Based on the above checks:' as diagnosis;
SELECT '1. Check if user_points table structure matches expectations' as check1;
SELECT '2. Look for references to total_betting_points_earned' as check2;
SELECT '3. Verify handle_new_user function matches table structure' as check3;
SELECT '4. Check for any missing columns that functions expect' as check4;

SELECT '=== SCHEMA CHECK COMPLETED ===' as section; 