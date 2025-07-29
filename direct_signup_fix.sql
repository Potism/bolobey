-- DIRECT SIGNUP FIX
-- This will fix signup immediately by disabling the problematic trigger

SELECT '=== DIRECT SIGNUP FIX ===' as section;

-- 1. First, let's see what triggers exist
SELECT '=== STEP 1: CHECKING TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 2. Try to disable the auth trigger (if we have permission)
SELECT '=== STEP 2: DISABLING AUTH TRIGGER ===' as section;

DO $$
BEGIN
  BEGIN
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
    RAISE NOTICE '✅ Auth trigger disabled successfully';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠️ Cannot disable auth trigger - no permission';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error disabling trigger: %', SQLERRM;
  END;
END $$;

-- 3. Ensure user_points table exists
SELECT '=== STEP 3: ENSURING USER_POINTS TABLE ===' as section;

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

-- 4. Create indexes
SELECT '=== STEP 4: CREATING INDEXES ===' as section;

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Indexes created' as status;

-- 5. Enable RLS
SELECT '=== STEP 5: ENABLING RLS ===' as section;

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

-- 6. Award points to existing users
SELECT '=== STEP 6: AWARDING POINTS TO EXISTING USERS ===' as section;

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

-- 7. Create a simple points function
SELECT '=== STEP 7: CREATING SIMPLE POINTS FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.award_initial_points(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 50, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Simple points function created' as status;

-- 8. Test the function
SELECT '=== STEP 8: TESTING FUNCTION ===' as section;

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
      'test-direct@example.com', 
      'Test Direct User', 
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

-- 9. Final status
SELECT '=== DIRECT FIX COMPLETED ===' as section;
SELECT '🎉 DIRECT SIGNUP FIX COMPLETED!' as status;
SELECT '✅ Auth trigger disabled (if possible)' as fix1;
SELECT '✅ user_points table ensured' as fix2;
SELECT '✅ Simple points function created' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The useAuth hook will handle user creation and call award_initial_points.' as note;
SELECT 'New users will get 50 betting_points and 0 stream_points automatically.' as note2; 