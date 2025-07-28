-- Test Redemptions Pagination
-- Run this in Supabase SQL Editor to verify pagination works

-- 1. Check total redemptions
SELECT 'Total Redemptions:' as test, COUNT(*) as count FROM prize_redemptions;

-- 2. Test the admin function
SELECT 'Admin Function Test:' as test, COUNT(*) as count FROM get_all_redemptions_admin();

-- 3. Test pagination logic (simulate page 1 with 20 items per page)
SELECT 'Page 1 (Items 1-20):' as test, COUNT(*) as count 
FROM (
  SELECT * FROM get_all_redemptions_admin() 
  ORDER BY created_at DESC 
  LIMIT 20 OFFSET 0
) as page1;

-- 4. Test pagination logic (simulate page 2 with 20 items per page)
SELECT 'Page 2 (Items 21-40):' as test, COUNT(*) as count 
FROM (
  SELECT * FROM get_all_redemptions_admin() 
  ORDER BY created_at DESC 
  LIMIT 20 OFFSET 20
) as page2;

-- 5. Check if we have enough data for pagination
SELECT 
  'Pagination Info:' as test,
  COUNT(*) as total_redemptions,
  CEIL(COUNT(*)::float / 20) as total_pages,
  CASE 
    WHEN COUNT(*) > 20 THEN 'Pagination needed'
    ELSE 'Single page sufficient'
  END as pagination_status
FROM get_all_redemptions_admin();

-- 6. Test filtering by status
SELECT 'Pending Redemptions:' as test, COUNT(*) as count 
FROM get_all_redemptions_admin() 
WHERE status = 'pending';

SELECT 'Approved Redemptions:' as test, COUNT(*) as count 
FROM get_all_redemptions_admin() 
WHERE status = 'approved';

-- 7. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Redemptions pagination test completed!';
  RAISE NOTICE '📊 Check the results above to verify pagination works';
  RAISE NOTICE '🎯 Admin function should return all redemptions';
  RAISE NOTICE '📄 Pagination should work with 20 items per page';
END $$; 