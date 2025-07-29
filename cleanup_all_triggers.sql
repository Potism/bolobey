-- COMPLETE CLEANUP AND FIX
-- This will remove ALL triggers and recreate everything properly

-- Step 1: Find and drop ALL triggers on auth.users
SELECT '=== STEP 1: FINDING ALL TRIGGERS ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- Step 2: Drop ALL triggers and functions
SELECT '=== STEP 2: DROPPING ALL TRIGGERS ===' as info;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_points ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_points() CASCADE;

-- Step 3: Drop and recreate user_points table
SELECT '=== STEP 3: RECREATING USER_POINTS TABLE ===' as info;

DROP TABLE IF EXISTS public.user_points CASCADE;

CREATE TABLE public.user_points (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 50 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    total_betting_points_earned INTEGER DEFAULT 0 CHECK (total_betting_points_earned >= 0),
    total_stream_points_earned INTEGER DEFAULT 0 CHECK (total_stream_points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX idx_user_points_betting_points ON public.user_points(betting_points DESC);
CREATE INDEX idx_user_points_stream_points ON public.user_points(stream_points DESC);

-- Step 5: Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points" ON public.user_points
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
CREATE POLICY "Users can update their own points" ON public.user_points
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all points" ON public.user_points;
CREATE POLICY "Service role can manage all points" ON public.user_points
    FOR ALL USING (auth.role() = 'service_role');

-- Step 6: Create the correct trigger function
SELECT '=== STEP 6: CREATING CORRECT TRIGGER ===' as info;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (
    id, 
    email, 
    display_name, 
    role, 
    created_at, 
    updated_at, 
    country
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      split_part(NEW.email, '@', 1)
    ),
    'player', 
    NOW(), 
    NOW(),
    'PH'
  );
  
  -- Insert into user_points table
  INSERT INTO public.user_points (
    user_id, 
    betting_points, 
    stream_points, 
    total_betting_points_earned,
    total_stream_points_earned,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    50,  -- Starting betting points
    0,   -- Starting stream points
    0,   -- Total earned betting points
    0,   -- Total earned stream points
    NOW(), 
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'User already exists: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 8: Verify everything
SELECT '=== STEP 8: VERIFICATION ===' as info;

SELECT 
    'Function exists:' as info1, EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'handle_new_user'
    ) as function_exists,
    'Trigger exists:' as info2, EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name = 'on_auth_user_created'
        AND event_object_schema = 'auth'
        AND event_object_table = 'users'
    ) as trigger_exists,
    'user_points table exists:' as info3, EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_points'
    ) as table_exists;

-- Step 9: Show final trigger status
SELECT 
    'Final triggers on auth.users:' as info,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

SELECT '🎉 CLEANUP COMPLETE - TRY SIGNUP NOW!' as final_status; 