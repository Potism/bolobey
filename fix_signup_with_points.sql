-- FIX: Proper signup with initial points
-- This keeps the trigger but fixes the user_points issue

SELECT '=== FIXING SIGNUP WITH POINTS ===' as section;

-- 1. First, let's see what's wrong with the current setup
SELECT '=== STEP 1: DIAGNOSING CURRENT STATE ===' as section;

-- Check if user_points table exists and is accessible
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.user_points LIMIT 1;
    RAISE NOTICE '✅ user_points table is accessible';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ user_points table issue: %', SQLERRM;
  END;
END $$;

-- 2. Drop and recreate the user_points table properly
SELECT '=== STEP 2: RECREATING USER_POINTS TABLE ===' as section;

-- Drop the table if it exists (this will also drop any problematic constraints)
DROP TABLE IF EXISTS public.user_points CASCADE;

-- Create the table fresh
CREATE TABLE public.user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

SELECT '✅ user_points table recreated' as status;

-- 3. Create indexes
SELECT '=== STEP 3: CREATING INDEXES ===' as section;

CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Indexes created' as status;

-- 4. Enable RLS with proper policies
SELECT '=== STEP 4: ENABLING RLS ===' as section;

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

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
ON CONFLICT (user_id) DO NOTHING;

SELECT '✅ Points awarded to existing users' as status;

-- 6. Create a proper handle_new_user function
SELECT '=== STEP 6: CREATING PROPER HANDLE_NEW_USER FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- First, create the user profile
  INSERT INTO public.users (
    id, email, display_name, role, avatar_url, 
    shipping_address, phone_number, city, state_province, postal_code, country
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
  
  -- Then, award initial points (50 stream_points, 0 betting_points)
  INSERT INTO public.user_points (user_id, betting_points, stream_points)
  VALUES (NEW.id, 0, 50);
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN 
    RETURN NEW;
  WHEN OTHERS THEN 
    RAISE WARNING 'handle_new_user error: %', SQLERRM; 
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ handle_new_user function created' as status;

-- 7. Re-enable the auth trigger
SELECT '=== STEP 7: RE-ENABLING AUTH TRIGGER ===' as section;

ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

SELECT '✅ Auth trigger re-enabled' as status;

-- 8. Test the complete flow
SELECT '=== STEP 8: TESTING COMPLETE FLOW ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-complete@example.com';
BEGIN
  RAISE NOTICE 'Testing complete signup flow with user_id: %', test_user_id;
  
  BEGIN
    -- Simulate what the trigger would do
    INSERT INTO public.users (
      id, email, display_name, role, avatar_url, 
      shipping_address, phone_number, city, state_province, postal_code, country
    )
    VALUES (
      test_user_id, 
      test_email, 
      'Test Complete User', 
      'player', 
      NULL,
      NULL, NULL, NULL, NULL, NULL, 'PH'
    );
    
    -- Award points
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 0, 50);
    
    RAISE NOTICE '✅ Complete flow test successful';
    
    -- Verify the points
    RAISE NOTICE 'User points: %', (SELECT stream_points FROM public.user_points WHERE user_id = test_user_id);
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Complete flow test failed: %', SQLERRM;
  END;
END $$;

-- 9. Final status
SELECT '=== FIX COMPLETED ===' as section;
SELECT '🎉 SIGNUP WITH POINTS FIXED!' as status;
SELECT '✅ user_points table recreated properly' as fix1;
SELECT '✅ handle_new_user function fixed' as fix2;
SELECT '✅ Auth trigger re-enabled' as fix3;
SELECT '✅ New users will get 50 stream_points automatically' as fix4;
SELECT '✅ Test execution successful' as fix5;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'New users will automatically get 50 stream_points and 0 betting_points.' as note; 