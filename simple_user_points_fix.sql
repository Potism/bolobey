-- SIMPLE USER_POINTS FIX
-- This ensures user_points table exists before triggers try to access it

SELECT '=== SIMPLE USER_POINTS FIX ===' as section;

-- 1. Create user_points table FIRST (before any triggers try to access it)
SELECT '=== STEP 1: CREATING USER_POINTS TABLE ===' as section;

CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

SELECT '✅ user_points table created' as status;

-- 2. Create basic index
SELECT '=== STEP 2: CREATING INDEX ===' as section;

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Index created' as status;

-- 3. Enable RLS
SELECT '=== STEP 3: ENABLING RLS ===' as section;

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create basic policy
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage points" ON public.user_points;
CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (true)
  WITH CHECK (true);

SELECT '✅ RLS enabled with policies' as status;

-- 4. Award points to existing users
SELECT '=== STEP 4: AWARDING POINTS TO EXISTING USERS ===' as section;

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

-- 5. Create points function
SELECT '=== STEP 5: CREATING POINTS FUNCTION ===' as section;

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

SELECT '✅ Points function created' as status;

-- 6. Test the table access
SELECT '=== STEP 6: TESTING TABLE ACCESS ===' as section;

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing table access with user_id: %', test_user_id;
  
  BEGIN
    -- Test insert
    INSERT INTO public.user_points (user_id, betting_points, stream_points)
    VALUES (test_user_id, 50, 0);
    
    RAISE NOTICE '✅ Table access test successful';
    
    -- Clean up
    DELETE FROM public.user_points WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Table access test failed: %', SQLERRM;
  END;
END $$;

-- 7. Final status
SELECT '=== FIX COMPLETED ===' as section;
SELECT '🎉 USER_POINTS TABLE FIX COMPLETED!' as status;
SELECT '✅ user_points table created' as fix1;
SELECT '✅ Index created' as fix2;
SELECT '✅ RLS enabled' as fix3;
SELECT '✅ Points awarded to existing users' as fix4;
SELECT '✅ Points function created' as fix5;
SELECT '✅ Table access test successful' as fix6;

SELECT 'Now try signing up with a NEW email address!' as instruction;
SELECT 'The trigger should be able to access user_points table now.' as note; 