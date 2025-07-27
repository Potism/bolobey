-- Update country field to use country codes instead of full names
-- This migration converts existing country names to their corresponding codes

-- First, let's see what countries are currently in the database
SELECT DISTINCT country FROM users WHERE country IS NOT NULL;

-- Update existing country names to their corresponding codes
UPDATE users 
SET country = CASE 
  WHEN country = 'Philippines' THEN 'PH'
  WHEN country = 'United States' THEN 'US'
  WHEN country = 'Canada' THEN 'CA'
  WHEN country = 'United Kingdom' THEN 'GB'
  WHEN country = 'Australia' THEN 'AU'
  WHEN country = 'Germany' THEN 'DE'
  WHEN country = 'France' THEN 'FR'
  WHEN country = 'Japan' THEN 'JP'
  WHEN country = 'South Korea' THEN 'KR'
  WHEN country = 'Other' THEN 'PH' -- Default to Philippines for "Other"
  ELSE 'PH' -- Default to Philippines for any unknown values
END
WHERE country IS NOT NULL;

-- Update the default value for new users
ALTER TABLE users 
ALTER COLUMN country SET DEFAULT 'PH';

-- Verify the changes
SELECT DISTINCT country FROM users WHERE country IS NOT NULL;

-- Success message
SELECT 'Country codes updated successfully! All countries now use ISO codes (e.g., PH, US, GB, etc.)' as status; 