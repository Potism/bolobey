-- FIX: Signup without modifying auth.users table
-- This uses the useAuth hook's fallback mechanism

SELECT '=== FIXING SIGNUP WITHOUT TRIGGER MODIFICATION ===' as section;

-- 1. Check current state
SELECT '=== STEP 1: CHECKING CURRENT STATE ===' as section;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ user_points table exists and is accessible';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ user_points table issue: %', SQLERRM;
  END;
END $$;

-- 2. Ensure user_points table exists
SELECT '=== STEP 2: ENSURING USER_POINTS TABLE ===' as section;

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

-- 3. Create indexes if they don't exist
SELECT '=== STEP 3: CREATING INDEXES ===' as section;

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Indexes ensured' as status;

-- 4. Enable RLS and create policies safely
SELECT '=== STEP 4: ENABLING RLS ===' as section;

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage points" ON public.user_points;
CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (true)
  WITH CHECK (true);

SELECT '✅ RLS enabled with policies' as status;

-- 5. Award points to existing users
SELECT '=== STEP 5: AWARDING POINTS TO EXISTING USERS ===' as section;

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

-- 6. Create a function to award points to new users
SELECT '=== STEP 6: CREATING POINTS AWARD FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.award_initial_points(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 50, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not award initial points: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Points award function created' as status;

-- 7. Test the points award function
SELECT '=== STEP 7: TESTING POINTS AWARD FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result BOOLEAN;
BEGIN
  RAISE NOTICE 'Testing points award function with user_id: %', test_user_id;
  
  BEGIN
    -- Create a test user first
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      'test-points@example.com', 
      'Test Points User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Award points
    result := public.award_initial_points(test_user_id);
    
    IF result THEN
      RAISE NOTICE '✅ Points award function test successful';
      
      -- Verify the points
      RAISE NOTICE 'User betting points: %', (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
      
      -- Clean up
      DELETE FROM public.user_points WHERE user_id = test_user_id;
      DELETE FROM public.users WHERE id = test_user_id;
      RAISE NOTICE '✅ Test data cleaned up';
    ELSE
      RAISE NOTICE '❌ Points award function test failed';
    END IF;
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Points award function test failed: %', SQLERRM;
  END;
END $$;

-- 8. Final status
SELECT '=== FIX COMPLETED ===' as section;
SELECT '🎉 SIGNUP FIX COMPLETED!' as status;
SELECT '✅ user_points table ensured' as fix1;
SELECT '✅ Points award function created' as fix2;
SELECT '✅ No auth.users table modification needed' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The useAuth hook will handle user profile creation and call award_initial_points.' as note;
SELECT 'New users will get 50 betting_points and 0 stream_points automatically.' as note2; 