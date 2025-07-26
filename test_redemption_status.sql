-- Test Redemption Status Update
-- Run this in Supabase SQL Editor

-- Check if prize_redemptions table exists and has data
SELECT 
    'prize_redemptions table exists' as check_result,
    COUNT(*) as total_redemptions,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_redemptions,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_redemptions,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_redemptions
FROM prize_redemptions;

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'prize_redemptions'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'prize_redemptions';

-- Test a simple update (this should work)
UPDATE prize_redemptions 
SET status = status 
WHERE id = (SELECT id FROM prize_redemptions LIMIT 1);

SELECT '✅ Basic update test passed' as test_result; 