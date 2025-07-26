-- Fix RLS Policies for Prize Redemptions
-- Run this in Supabase SQL Editor

-- First, let's see the current RLS policies
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

-- Drop existing policies for prize_redemptions
DROP POLICY IF EXISTS "Users can view their own redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Users can create redemptions" ON prize_redemptions;
DROP POLICY IF EXISTS "Admins can update redemptions" ON prize_redemptions;

-- Create new policies that allow admin access
-- Policy 1: Users can view their own redemptions
CREATE POLICY "Users can view their own redemptions" ON prize_redemptions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 2: Users can create redemptions
CREATE POLICY "Users can create redemptions" ON prize_redemptions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Policy 3: Admins can update redemptions (this is the key one!)
CREATE POLICY "Admins can update redemptions" ON prize_redemptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 4: Admins can delete redemptions
CREATE POLICY "Admins can delete redemptions" ON prize_redemptions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Also fix RLS for prizes table to allow admin updates
DROP POLICY IF EXISTS "Admins can update prizes" ON prizes;
CREATE POLICY "Admins can update prizes" ON prizes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Fix RLS for stream_points table to allow admin inserts
DROP POLICY IF EXISTS "Admins can insert stream points" ON stream_points;
CREATE POLICY "Admins can insert stream points" ON stream_points
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Show the updated policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('prize_redemptions', 'prizes', 'stream_points')
ORDER BY tablename, policyname;

-- Success message
SELECT '✅ RLS policies updated successfully! Admin can now update redemptions.' as status; 