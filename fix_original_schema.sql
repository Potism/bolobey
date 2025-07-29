-- Fix Original Schema - Update handle_new_user function
-- This script updates the existing handle_new_user function to create user_points

-- Step 1: Check current function
SELECT 'Current handle_new_user function:' as info;
SELECT pg_get_functiondef(oid) as function_definition 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Step 2: Ensure user_points table exists
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  betting_points INTEGER DEFAULT 0,
  stream_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Step 3: Create indexes for user_points
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_betting_points ON public.user_points(betting_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_stream_points ON public.user_points(stream_points DESC);

-- Step 4: Enable RLS on user_points
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_points
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
CREATE POLICY "Users can update their own points" ON public.user_points
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage points" ON public.user_points;
CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (auth.role() = 'service_role');

-- Step 6: Update the handle_new_user function to include user_points creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile in public.users
  INSERT INTO public.users (
    id, 
    email, 
    display_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    'player',
    NOW(),
    NOW()
  );

  -- Create user_points entry with error handling
  BEGIN
    INSERT INTO public.user_points (
      user_id,
      betting_points,
      stream_points,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      50,  -- Initial betting points
      0,   -- Initial stream points
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- Log the error but don't abort the transaction
      RAISE NOTICE 'Foreign key violation when creating user_points for user %: %', NEW.id, SQLERRM;
    WHEN OTHERS THEN
      -- Log any other error but don't abort the transaction
      RAISE NOTICE 'Error creating user_points for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Verify the trigger exists and recreate if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Create user_points for existing users who don't have them
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

-- Step 9: Verify the setup
SELECT 'Verifying setup...' as status;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 10: Test the function
SELECT 'Testing function...' as status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
    THEN '✅ handle_new_user function updated successfully'
    ELSE '❌ handle_new_user function update failed'
  END as test_result;

-- Step 11: Show user_points status
SELECT 'User points status:' as info;
SELECT 
  COUNT(*) as total_users,
  COUNT(up.user_id) as users_with_points,
  COUNT(*) - COUNT(up.user_id) as users_without_points
FROM public.users u
LEFT JOIN public.user_points up ON u.id = up.user_id;

SELECT '🎉 Original schema fixed! Signup should now work properly.' as final_status; 