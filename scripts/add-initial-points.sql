-- Add initial points to users for testing the betting system
-- Run this in Supabase SQL Editor after creating the betting tables

-- Add 50 points to all existing users
INSERT INTO stream_points (user_id, points, transaction_type, description)
SELECT 
  id as user_id,
  50 as points,
  'admin_award' as transaction_type,
  'Welcome bonus for betting system' as description
FROM users
WHERE id NOT IN (
  SELECT DISTINCT user_id 
  FROM stream_points 
  WHERE transaction_type = 'admin_award' 
  AND description = 'Welcome bonus for betting system'
);

-- Verify the points were added
SELECT 
  u.display_name,
  COALESCE(SUM(sp.points), 0) as total_points
FROM users u
LEFT JOIN stream_points sp ON u.id = sp.user_id
GROUP BY u.id, u.display_name
ORDER BY total_points DESC; 