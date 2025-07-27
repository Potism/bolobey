-- Fix existing users who might not have profiles in the users table
-- This ensures all auth users have corresponding profiles

-- Insert missing user profiles for existing auth users
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
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1)),
  'player',
  au.raw_user_meta_data ->> 'shipping_address',
  au.raw_user_meta_data ->> 'phone_number',
  au.raw_user_meta_data ->> 'city',
  au.raw_user_meta_data ->> 'state_province',
  au.raw_user_meta_data ->> 'postal_code',
  COALESCE(au.raw_user_meta_data ->> 'country', 'PH')
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Award initial points to existing users who don't have any points
INSERT INTO stream_points (user_id, points, transaction_type, description)
SELECT 
  u.id, 
  50, 
  'admin_award', 
  'Welcome bonus for existing user'
FROM public.users u
LEFT JOIN stream_points sp ON u.id = sp.user_id
WHERE sp.user_id IS NULL
  OR (SELECT COALESCE(SUM(points), 0) FROM stream_points WHERE user_id = u.id) = 0;

-- Success message
SELECT 'Existing users fixed successfully!' as status; 