-- Check if betting views exist and diagnose the issue
-- This script will help us understand why the betting components are failing

-- Check if current_betting_matches_v3 view exists
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'current_betting_matches_v3';

-- Check if current_betting_matches view exists
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'current_betting_matches';

-- Check if betting_matches table exists
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'betting_matches';

-- Check if matches table exists
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'matches';

-- Check RLS status on betting_matches
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'betting_matches';

-- Check RLS status on matches
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'matches';

-- Check if there are any betting matches in the database
SELECT COUNT(*) as betting_matches_count FROM betting_matches;

-- Check if there are any regular matches in the database
SELECT COUNT(*) as matches_count FROM matches;

-- Check sample betting match data
SELECT 
    id,
    tournament_id,
    player1_id,
    player2_id,
    status,
    created_at
FROM betting_matches 
LIMIT 5;

-- Check if users table has data
SELECT COUNT(*) as users_count FROM users;

-- Check sample users
SELECT 
    id,
    display_name,
    email
FROM users 
LIMIT 5;

-- Test query to current_betting_matches_v3 (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'current_betting_matches_v3') THEN
        RAISE NOTICE 'current_betting_matches_v3 view exists';
        -- Try to query it
        PERFORM 1 FROM current_betting_matches_v3 LIMIT 1;
        RAISE NOTICE 'Query to current_betting_matches_v3 successful';
    ELSE
        RAISE NOTICE 'current_betting_matches_v3 view does NOT exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error querying current_betting_matches_v3: %', SQLERRM;
END $$;

-- Test query to current_betting_matches (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'current_betting_matches') THEN
        RAISE NOTICE 'current_betting_matches view exists';
        -- Try to query it
        PERFORM 1 FROM current_betting_matches LIMIT 1;
        RAISE NOTICE 'Query to current_betting_matches successful';
    ELSE
        RAISE NOTICE 'current_betting_matches view does NOT exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error querying current_betting_matches: %', SQLERRM;
END $$; 