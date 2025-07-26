-- 1. Check if handle_new_user function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- 2. Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Check if stream_points table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'stream_points'
);

-- 4. Check your current points
SELECT user_id, SUM(points) as total_points
FROM stream_points 
WHERE user_id = 'YOUR_USER_ID_HERE'
GROUP BY user_id; 