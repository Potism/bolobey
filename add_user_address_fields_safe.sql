-- Add address and phone number fields to users table for shipping prizes
-- SAFE VERSION - Checks for existing columns before adding
-- Run this in Supabase SQL Editor

-- Add shipping address fields to users table (only if they don't exist)
DO $$ 
BEGIN
  -- Add shipping_address column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'shipping_address') THEN
    ALTER TABLE users ADD COLUMN shipping_address TEXT;
  END IF;

  -- Add phone_number column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone_number') THEN
    ALTER TABLE users ADD COLUMN phone_number TEXT;
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'city') THEN
    ALTER TABLE users ADD COLUMN city TEXT;
  END IF;

  -- Add state_province column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'state_province') THEN
    ALTER TABLE users ADD COLUMN state_province TEXT;
  END IF;

  -- Add postal_code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'postal_code') THEN
    ALTER TABLE users ADD COLUMN postal_code TEXT;
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'country') THEN
    ALTER TABLE users ADD COLUMN country TEXT DEFAULT 'Philippines';
  END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_shipping_address') THEN
    CREATE INDEX idx_users_shipping_address ON users(shipping_address) WHERE shipping_address IS NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_phone_number') THEN
    CREATE INDEX idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;
  END IF;
END $$;

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

-- Success message
SELECT 'User address fields setup completed successfully!' as status; 