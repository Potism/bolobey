-- Fix user registration by updating handle_new_user function
-- This combines user profile creation with initial points award

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the corrected handle_new_user function that does both:
-- 1. Creates user profile in users table
-- 2. Awards initial points in stream_points table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- First, create the user profile in users table
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
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
    NEW.raw_user_meta_data ->> 'shipping_address',
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'state_province',
    NEW.raw_user_meta_data ->> 'postal_code',
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'PH')
  );

  -- Then, award initial points
  INSERT INTO stream_points (user_id, points, transaction_type, description)
  VALUES (NEW.id, 50, 'admin_award', 'Welcome bonus for new user');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
SELECT 'User registration fixed successfully! New users will now have both profile and initial points.' as status; 