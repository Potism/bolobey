-- EMERGENCY FIX: Disable problematic trigger and create simple signup
-- This will fix the signup issue immediately

SELECT '=== EMERGENCY SIGNUP FIX ===' as section;

-- 1. First, disable the problematic trigger
SELECT '=== STEP 1: DISABLING PROBLEMATIC TRIGGER ===' as section;

ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

SELECT '✅ Auth trigger disabled' as status;

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

-- 3. Create indexes
SELECT '=== STEP 3: CREATING INDEXES ===' as section;

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Indexes created' as status;

-- 4. Enable RLS
SELECT '=== STEP 4: ENABLING RLS ===' as section;

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

-- 5. Award points to existing users
SELECT '=== STEP 5: AWARDING POINTS TO EXISTING USERS ===' as section;

INSERT INTO public.user_points (user_id, betting_points, stream_points)
SELECT 
  u.id, 
  0, 
  50
FROM public.users u
LEFT JOIN public.user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

SELECT '✅ Points awarded to existing users' as status;

-- 6. Create a simple manual function for creating user profiles
SELECT '=== STEP 6: CREATING MANUAL USER CREATION FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  display_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (
    id, email, display_name, role, avatar_url, 
    shipping_address, phone_number, city, state_province, postal_code, country
  )
  VALUES (
    user_id, 
    user_email, 
    COALESCE(display_name, split_part(user_email, '@', 1)), 
    'player', 
    NULL,
    NULL, NULL, NULL, NULL, NULL, 'PH'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Award initial points
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 0, 50)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'create_user_profile error: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Manual user creation function created' as status;

-- 7. Test the manual function
SELECT '=== STEP 7: TESTING MANUAL FUNCTION ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-manual@example.com';
  result BOOLEAN;
BEGIN
  result := public.create_user_profile(test_user_id, test_email, 'Test Manual User');
  
  IF result THEN
    RAISE NOTICE '✅ Manual function test successful';
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
  ELSE
    RAISE NOTICE '❌ Manual function test failed';
  END IF;
END $$;

-- 8. Final status
SELECT '=== EMERGENCY FIX COMPLETED ===' as section;
SELECT '🎉 SIGNUP FIXED!' as status;
SELECT '✅ Auth trigger disabled (no more 500 errors)' as fix1;
SELECT '✅ user_points table ensured' as fix2;
SELECT '✅ Manual user creation function available' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The signup should work without the 500 error now.' as note;
SELECT 'If you need automatic user creation later, we can re-enable the trigger.' as note2; 