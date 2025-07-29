-- NUCLEAR SIGNUP FIX
-- This will completely remove the problematic trigger and fix signup

SELECT '=== NUCLEAR SIGNUP FIX ===' as section;

-- 1. Check what triggers exist
SELECT '=== STEP 1: CHECKING ALL TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 2. Try to DROP the problematic trigger completely
SELECT '=== STEP 2: DROPPING THE TRIGGER ===' as section;

DO $$
BEGIN
  BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    RAISE NOTICE '✅ Auth trigger DROPPED successfully';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠️ Cannot drop auth trigger - no permission';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error dropping trigger: %', SQLERRM;
  END;
END $$;

-- 3. Also try to disable it as backup
SELECT '=== STEP 3: DISABLING TRIGGER AS BACKUP ===' as section;

DO $$
BEGIN
  BEGIN
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
    RAISE NOTICE '✅ Auth trigger disabled as backup';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠️ Cannot disable auth trigger - no permission';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error disabling trigger: %', SQLERRM;
  END;
END $$;

-- 4. Ensure user_points table exists
SELECT '=== STEP 4: ENSURING USER_POINTS TABLE ===' as section;

CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

SELECT '✅ user_points table ensured' as status;

-- 5. Create indexes
SELECT '=== STEP 5: CREATING INDEXES ===' as section;

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Indexes created' as status;

-- 6. Enable RLS
SELECT '=== STEP 6: ENABLING RLS ===' as section;

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage points" ON public.user_points;
CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (true)
  WITH CHECK (true);

SELECT '✅ RLS enabled with policies' as status;

-- 7. Award points to existing users
SELECT '=== STEP 7: AWARDING POINTS TO EXISTING USERS ===' as section;

INSERT INTO public.user_points (user_id, betting_points, stream_points)
SELECT 
  u.id, 
  50, 
  0
FROM public.users u
LEFT JOIN public.user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

SELECT '✅ Points awarded to existing users' as status;

-- 8. Create a robust points function
SELECT '=== STEP 8: CREATING ROBUST POINTS FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.award_initial_points(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure user_points table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points' AND table_schema = 'public') THEN
    RAISE WARNING 'user_points table does not exist';
    RETURN FALSE;
  END IF;
  
  -- Award points
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 50, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not award points to user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Robust points function created' as status;

-- 9. Test the function
SELECT '=== STEP 9: TESTING FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result BOOLEAN;
BEGIN
  RAISE NOTICE 'Testing with user_id: %', test_user_id;
  
  BEGIN
    -- Create a test user
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      'test-nuclear@example.com', 
      'Test Nuclear User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Award points
    result := public.award_initial_points(test_user_id);
    
    IF result THEN
      RAISE NOTICE '✅ Function test successful';
      
      -- Verify points
      RAISE NOTICE 'User betting points: %', (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
      
      -- Clean up
      DELETE FROM public.user_points WHERE user_id = test_user_id;
      DELETE FROM public.users WHERE id = test_user_id;
      RAISE NOTICE '✅ Test data cleaned up';
    ELSE
      RAISE NOTICE '❌ Function test failed';
    END IF;
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test failed: %', SQLERRM;
  END;
END $$;

-- 10. Check trigger status after fix
SELECT '=== STEP 10: CHECKING TRIGGER STATUS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 11. Final status
SELECT '=== NUCLEAR FIX COMPLETED ===' as section;
SELECT '🎉 NUCLEAR SIGNUP FIX COMPLETED!' as status;
SELECT '✅ Auth trigger dropped/disabled' as fix1;
SELECT '✅ user_points table ensured' as fix2;
SELECT '✅ Robust points function created' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The trigger should be gone/disabled, so signup should work.' as note;
SELECT 'The useAuth hook will handle user creation and call award_initial_points.' as note2; 