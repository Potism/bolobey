-- Check what country values are currently in the database
SELECT 
  id,
  email,
  country,
  CASE 
    WHEN country = 'PH' THEN 'Philippines (Code)'
    WHEN country = 'Philippines' THEN 'Philippines (Name)'
    WHEN country IS NULL THEN 'NULL'
    ELSE country || ' (Unknown)'
  END as country_status
FROM users 
ORDER BY country;

-- Count by country type
SELECT 
  CASE 
    WHEN country = 'PH' THEN 'Philippines (Code)'
    WHEN country = 'Philippines' THEN 'Philippines (Name)'
    WHEN country IS NULL THEN 'NULL'
    ELSE 'Other'
  END as country_type,
  COUNT(*) as count
FROM users 
GROUP BY country_type; 