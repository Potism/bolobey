-- Fix missing foreign key relationships for betting_matches table
-- This script creates the foreign key constraints that are missing

-- First, let's check the current table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'betting_matches' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if foreign key constraints exist
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'betting_matches';

-- Create foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key for player1_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'betting_matches_player1_id_fkey'
        AND table_name = 'betting_matches'
    ) THEN
        ALTER TABLE betting_matches 
        ADD CONSTRAINT betting_matches_player1_id_fkey 
        FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint: betting_matches_player1_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint betting_matches_player1_id_fkey already exists';
    END IF;

    -- Add foreign key for player2_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'betting_matches_player2_id_fkey'
        AND table_name = 'betting_matches'
    ) THEN
        ALTER TABLE betting_matches 
        ADD CONSTRAINT betting_matches_player2_id_fkey 
        FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint: betting_matches_player2_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint betting_matches_player2_id_fkey already exists';
    END IF;

    -- Add foreign key for tournament_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'betting_matches_tournament_id_fkey'
        AND table_name = 'betting_matches'
    ) THEN
        ALTER TABLE betting_matches 
        ADD CONSTRAINT betting_matches_tournament_id_fkey 
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint: betting_matches_tournament_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint betting_matches_tournament_id_fkey already exists';
    END IF;

    -- Add foreign key for winner_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'betting_matches_winner_id_fkey'
        AND table_name = 'betting_matches'
    ) THEN
        ALTER TABLE betting_matches 
        ADD CONSTRAINT betting_matches_winner_id_fkey 
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint: betting_matches_winner_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint betting_matches_winner_id_fkey already exists';
    END IF;
END $$;

-- Verify the foreign key constraints were created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'betting_matches';

-- Test a simple join query
SELECT 
    bm.id,
    bm.player1_id,
    bm.player2_id,
    p1.display_name as player1_name,
    p2.display_name as player2_name
FROM betting_matches bm
LEFT JOIN users p1 ON bm.player1_id = p1.id
LEFT JOIN users p2 ON bm.player2_id = p2.id
LIMIT 5;

SELECT 'Foreign key relationships fixed for betting_matches table!' as status; 