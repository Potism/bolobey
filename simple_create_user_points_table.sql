-- SIMPLE FIX: Create the missing user_points table
-- This directly addresses the "relation user_points does not exist" error

SELECT '=== SIMPLE USER_POINTS TABLE CREATION ===' as section;

-- 1. Check if table exists
SELECT '=== STEP 1: CHECKING IF TABLE EXISTS ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') 
    THEN '✅ user_points table EXISTS'
    ELSE '❌ user_points table DOES NOT EXIST - CREATING NOW'
  END as user_points_status;

-- 2. Create the user_points table
SELECT '=== STEP 2: CREATING USER_POINTS TABLE ===' as section;

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

-- 3. Create basic index
SELECT '=== STEP 3: CREATING INDEX ===' as section;

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);

SELECT '✅ Index created' as status;

-- 4. Enable RLS
SELECT '=== STEP 4: ENABLING RLS ===' as section;

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create basic policy
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (true)
  WITH CHECK (true);

SELECT '✅ RLS enabled with basic policies' as status;

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

SELECT '✅ Initial points awarded to existing users' as status;

-- 6. Verify the table was created
SELECT '=== STEP 6: VERIFICATION ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') 
    THEN '✅ user_points table EXISTS - FIXED!'
    ELSE '❌ user_points table STILL DOES NOT EXIST'
  END as verification_status;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_points' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
  'Sample data from user_points:' as info;
SELECT 
  user_id,
  betting_points,
  stream_points
FROM public.user_points 
LIMIT 5;

-- 7. Final status
SELECT '=== SIMPLE FIX COMPLETED ===' as section;
SELECT '🎉 USER_POINTS TABLE CREATED!' as status;
SELECT '✅ user_points table created' as step1;
SELECT '✅ Index created' as step2;
SELECT '✅ RLS enabled' as step3;
SELECT '✅ Initial points awarded' as step4;

SELECT 'Now try signing up with streamerdude@gmail.com!' as instruction;
SELECT 'The signup should work without the 500 error now.' as note; 