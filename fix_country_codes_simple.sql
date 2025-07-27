-- Simple fix for country codes
-- Convert existing country names to ISO codes

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
  WHEN country = 'Other' THEN 'PH'
  WHEN country IS NULL THEN 'PH'
  ELSE country -- Keep as is if it's already a code
END;

-- Set default for new users
ALTER TABLE users 
ALTER COLUMN country SET DEFAULT 'PH';

-- Verify
SELECT DISTINCT country FROM users WHERE country IS NOT NULL; 