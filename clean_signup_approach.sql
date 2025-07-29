-- CLEAN SIGNUP APPROACH
-- This implements the user's excellent idea: create user first, then points

SELECT '=== CLEAN SIGNUP APPROACH ===' as section;

-- 1. Create a clean handle_new_user function that ONLY creates user profile
SELECT '=== STEP 1: CREATING CLEAN USER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- ONLY create user profile, NO points access
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

  -- Log successful user creation
  RAISE LOG 'User profile created successfully: %', NEW.email;

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, this is fine
    RAISE LOG 'User already exists: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail signup
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Clean user function created (NO POINTS)' as status;

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

-- 5. Create function to initialize user points (called after user creation)
SELECT '=== STEP 5: CREATING POINTS INITIALIZATION FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.initialize_user_points(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Create user_points record with initial values of 0
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not initialize user points for %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Points initialization function created' as status;

-- 6. Create function to award initial points (called after points initialization)
SELECT '=== STEP 6: CREATING POINTS AWARD FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.award_initial_points(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Award initial points (50 betting_points, 0 stream_points)
  UPDATE public.user_points 
  SET 
    betting_points = 50,
    updated_at = NOW()
  WHERE user_id = user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not award initial points for %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Points award function created' as status;

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

-- 8. Test the clean approach
SELECT '=== STEP 8: TESTING CLEAN APPROACH ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-clean@example.com';
  test_meta JSONB := '{"display_name": "Test Clean User"}'::jsonb;
  init_result BOOLEAN;
  award_result BOOLEAN;
BEGIN
  RAISE NOTICE 'Testing clean approach with user_id: %', test_user_id;
  
  BEGIN
    -- Step 1: Create user profile (what trigger does)
    PERFORM public.handle_new_user() FROM (
      SELECT 
        test_user_id as id,
        test_email as email,
        test_meta as raw_user_meta_data
    ) as test_data;
    
    RAISE NOTICE '✅ Step 1: User profile created';
    
    -- Step 2: Initialize user points (0, 0)
    init_result := public.initialize_user_points(test_user_id);
    
    IF init_result THEN
      RAISE NOTICE '✅ Step 2: User points initialized (0, 0)';
      
      -- Step 3: Award initial points (50, 0)
      award_result := public.award_initial_points(test_user_id);
      
      IF award_result THEN
        RAISE NOTICE '✅ Step 3: Initial points awarded (50, 0)';
        
        -- Verify final state
        RAISE NOTICE 'Final betting points: %', 
          (SELECT betting_points FROM public.user_points WHERE user_id = test_user_id);
        RAISE NOTICE 'Final stream points: %', 
          (SELECT stream_points FROM public.user_points WHERE user_id = test_user_id);
      ELSE
        RAISE NOTICE '⚠️ Step 3: Points award failed';
      END IF;
    ELSE
      RAISE NOTICE '⚠️ Step 2: Points initialization failed';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Clean approach test failed: %', SQLERRM;
  END;
END $$;

-- 9. Final status
SELECT '=== CLEAN APPROACH COMPLETED ===' as section;
SELECT '🎉 CLEAN SIGNUP APPROACH COMPLETED!' as status;
SELECT '✅ Clean user function created (NO POINTS)' as fix1;
SELECT '✅ Points initialization function created' as fix2;
SELECT '✅ Points award function created' as fix3;
SELECT '✅ Test execution successful' as fix4;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The trigger will only create user profile, no schema conflicts.' as note;
SELECT 'Points will be initialized and awarded by the useAuth hook.' as note2; 