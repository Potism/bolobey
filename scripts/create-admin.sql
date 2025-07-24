-- Run this in your Supabase SQL editor to create an admin user
-- Replace the values with your desired admin credentials

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(), -- This will be the user ID
  'admin@bolobey.com',
  crypt('admin123456', gen_salt('bf')), -- Password: admin123456
  NOW(),
  NOW(),
  NOW(),
  '{"display_name": "Admin User"}',
  false,
  '',
  '',
  '',
  ''
);

-- Get the user ID that was just created
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@bolobey.com' 
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Create the user profile
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'admin@bolobey.com',
    'Admin User',
    'admin',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Admin user created with ID: %', admin_user_id;
END $$; 