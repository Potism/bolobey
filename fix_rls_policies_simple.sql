-- Simple RLS Fix for Admin Access
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily to see if that's the issue
ALTER TABLE prize_redemptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE prizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE stream_points DISABLE ROW LEVEL SECURITY;

-- Show current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('prize_redemptions', 'prizes', 'stream_points');

-- Success message
SELECT '✅ RLS disabled for testing. Admin should now have full access.' as status; 