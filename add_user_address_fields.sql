-- Add address and phone number fields to users table for shipping prizes
-- Run this in Supabase SQL Editor

-- Add shipping address fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state_province TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Philippines';

-- Create index for better performance on address searches
CREATE INDEX IF NOT EXISTS idx_users_shipping_address ON users(shipping_address) WHERE shipping_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;

-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    display_name,
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
    NEW.raw_user_meta_data ->> 'shipping_address',
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'state_province',
    NEW.raw_user_meta_data ->> 'postal_code',
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'Philippines')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 