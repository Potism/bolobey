-- Fix RLS Policies for Betting Matches
-- This script fixes the row-level security policies that are preventing betting match creation

-- First, let's check the current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'betting_matches';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view betting matches" ON betting_matches;
DROP POLICY IF EXISTS "Users can insert betting matches" ON betting_matches;
DROP POLICY IF EXISTS "Users can update betting matches" ON betting_matches;
DROP POLICY IF EXISTS "Users can delete betting matches" ON betting_matches;

-- Create new policies that allow tournament creators and admins to manage betting matches

-- Policy for viewing betting matches (anyone can view)
CREATE POLICY "Anyone can view betting matches" ON betting_matches
    FOR SELECT USING (true);

-- Policy for inserting betting matches (tournament creators and admins)
CREATE POLICY "Tournament creators and admins can insert betting matches" ON betting_matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = betting_matches.tournament_id 
            AND (
                t.created_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role = 'admin'
                )
            )
        )
    );

-- Policy for updating betting matches (tournament creators and admins)
CREATE POLICY "Tournament creators and admins can update betting matches" ON betting_matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = betting_matches.tournament_id 
            AND (
                t.created_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role = 'admin'
                )
            )
        )
    );

-- Policy for deleting betting matches (tournament creators and admins)
CREATE POLICY "Tournament creators and admins can delete betting matches" ON betting_matches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = betting_matches.tournament_id 
            AND (
                t.created_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role = 'admin'
                )
            )
        )
    );

-- Also fix RLS policies for matches table (for regular matches)
DROP POLICY IF EXISTS "Users can view matches" ON matches;
DROP POLICY IF EXISTS "Users can insert matches" ON matches;
DROP POLICY IF EXISTS "Users can update matches" ON matches;
DROP POLICY IF EXISTS "Users can delete matches" ON matches;

-- Create policies for matches table
CREATE POLICY "Anyone can view matches" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Tournament creators and admins can insert matches" ON matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = matches.tournament_id 
            AND (
                t.created_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Tournament creators and admins can update matches" ON matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = matches.tournament_id 
            AND (
                t.created_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Tournament creators and admins can delete matches" ON matches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = matches.tournament_id 
            AND (
                t.created_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role = 'admin'
                )
            )
        )
    );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('betting_matches', 'matches')
ORDER BY tablename, policyname;

-- Test message
SELECT 'RLS policies fixed for betting_matches and matches tables!' as status; 