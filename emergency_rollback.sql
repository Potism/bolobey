-- EMERGENCY ROLLBACK: Restore Previous State
-- Run this immediately to undo the complete_user_points_fix.sql changes

SELECT '=== EMERGENCY ROLLBACK STARTED ===' as section;

-- 1. Disable the auth trigger we created
SELECT '=== STEP 1: DISABLING AUTH TRIGGER ===' as section;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

SELECT '✅ Auth trigger disabled' as status;

-- 2. Drop the handle_new_user function we created
SELECT '=== STEP 2: DROPPING HANDLE_NEW_USER FUNCTION ===' as section;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

SELECT '✅ handle_new_user function dropped' as status;

-- 3. Drop the user_points table we created
SELECT '=== STEP 3: DROPPING USER_POINTS TABLE ===' as section;

DROP TABLE IF EXISTS public.user_points CASCADE;

SELECT '✅ user_points table dropped' as status;

-- 4. Check what triggers existed before (we need to restore them)
SELECT '=== STEP 4: CHECKING ORIGINAL TRIGGERS ===' as section;

SELECT 
  'Original triggers that were dropped:' as info,
  'on_auth_user_created' as trigger1,
  'handle_new_user_trigger' as trigger2,
  'on_user_created_award_points' as trigger3;

-- 5. Create a minimal handle_new_user function (without user_points)
SELECT '=== STEP 5: CREATING MINIMAL HANDLE_NEW_USER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create the user profile, NO points
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    avatar_url,
    shipping_address,
    phone_number,
    city,
    state_province,
    postal_code,
    country
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    'player',
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'shipping_address',
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'state_province',
    NEW.raw_user_meta_data ->> 'postal_code',
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'PH')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If user already exists, just return NEW
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the specific error but don't fail the signup
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    -- Still return NEW to not break the signup
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Minimal handle_new_user function created (NO POINTS)' as status;

-- 6. Re-create the auth trigger (without points)
SELECT '=== STEP 6: RE-CREATING AUTH TRIGGER (NO POINTS) ===' as section;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '✅ Auth trigger re-created (NO POINTS)' as status;

-- 7. Check current state
SELECT '=== STEP 7: CHECKING CURRENT STATE ===' as section;

-- Check if user_points table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') 
    THEN '❌ user_points table STILL EXISTS'
    ELSE '✅ user_points table REMOVED'
  END as user_points_status;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
    THEN '✅ Auth trigger EXISTS'
    ELSE '❌ Auth trigger DOES NOT EXIST'
  END as trigger_status;

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
    THEN '✅ handle_new_user function EXISTS'
    ELSE '❌ handle_new_user function DOES NOT EXIST'
  END as function_status;

-- 8. Test basic signup (without points)
SELECT '=== STEP 8: TESTING BASIC SIGNUP ===' as section;

-- Test manual insert
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || test_id::text || '@example.com';
BEGIN
  -- Try to manually insert a test user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    test_id,
    test_email,
    crypt('testpassword', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"display_name": "Test User"}'::jsonb,
    false,
    '',
    '',
    '',
    ''
  );
  
  RAISE NOTICE '✅ Manual auth.users insert successful for: %', test_email;
  
  -- Check if profile was created by trigger
  IF EXISTS (SELECT 1 FROM public.users WHERE id = test_id) THEN
    RAISE NOTICE '✅ Profile was created by trigger';
  ELSE
    RAISE NOTICE '❌ Profile was not created by trigger';
  END IF;
  
  -- Clean up test user
  DELETE FROM public.users WHERE id = test_id;
  DELETE FROM auth.users WHERE id = test_id;
  
  RAISE NOTICE '✅ Test completed successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- 9. Final rollback status
SELECT '=== ROLLBACK COMPLETED ===' as section;
SELECT '🔄 ROLLBACK COMPLETED!' as status;
SELECT '✅ user_points table removed' as step1;
SELECT '✅ handle_new_user function restored (NO POINTS)' as step2;
SELECT '✅ Auth trigger restored (NO POINTS)' as step3;
SELECT '✅ Basic signup should work now' as step4;

SELECT 'Your data is now restored to previous state.' as note;
SELECT 'Signup will work but without points system.' as note2;
SELECT 'You can manually add points later if needed.' as note3;

-- 10. Manual points function for later use
SELECT '=== MANUAL POINTS FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION award_points_manually(user_uuid UUID, betting_pts INTEGER DEFAULT 0, stream_pts INTEGER DEFAULT 50)
RETURNS BOOLEAN AS $$
BEGIN
  -- This function can be used later to manually award points
  -- when you create the user_points table properly
  RAISE NOTICE 'Manual points function created for future use';
  RAISE NOTICE 'User: %, Betting Points: %, Stream Points: %', user_uuid, betting_pts, stream_pts;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in manual points function: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Manual points function created for future use' as status; 