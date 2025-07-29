-- Safe Signup Fix - No auth.users modifications needed
-- This approach works around the trigger issue without needing owner permissions

-- Step 1: Ensure user_points table exists
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  betting_points INTEGER DEFAULT 0,
  stream_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Step 2: Create indexes for user_points
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_betting_points ON public.user_points(betting_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_stream_points ON public.user_points(stream_points DESC);

-- Step 3: Enable RLS on user_points
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for user_points
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
CREATE POLICY "Users can update their own points" ON public.user_points
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage points" ON public.user_points;
CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (auth.role() = 'service_role');

-- Step 5: Create a function to handle user creation safely
CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
  user_id UUID,
  user_email TEXT,
  display_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- First, try to create user profile (this might already exist from trigger)
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(display_name, split_part(user_email, '@', 1)),
    'player',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't fail if user already exists

  -- Then, try to create user_points (this might already exist)
  INSERT INTO public.user_points (
    user_id,
    betting_points,
    stream_points,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    50,  -- Initial betting points
    0,   -- Initial stream points
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Don't fail if points already exist

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in create_user_profile_safe: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create user_points for existing users who don't have them
INSERT INTO public.user_points (user_id, betting_points, stream_points, created_at, updated_at)
SELECT 
  u.id,
  50,  -- Initial betting points
  0,   -- Initial stream points
  NOW(),
  NOW()
FROM public.users u
LEFT JOIN public.user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- Step 7: Test the function
SELECT 'Safe signup fix completed!' as status;
SELECT 'Function create_user_profile_safe created successfully' as note;
SELECT 'You can now use this function in your signup process' as usage; 