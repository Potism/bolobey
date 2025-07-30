-- Fix Supabase Foreign Key Constraints
-- This script adds the missing foreign key constraints for tournaments table

-- Check current constraints
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  a.attname as column_name,
  confrelid::regclass as foreign_table_name,
  af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'tournaments'::regclass;

-- Add missing foreign key constraints
-- First, check if they already exist
DO $$
BEGIN
    -- Check if tournaments_created_by_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tournaments_created_by_fkey'
    ) THEN
        ALTER TABLE tournaments 
        ADD CONSTRAINT tournaments_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
        RAISE NOTICE 'Added tournaments_created_by_fkey constraint';
    ELSE
        RAISE NOTICE 'tournaments_created_by_fkey constraint already exists';
    END IF;

    -- Check if tournaments_winner_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tournaments_winner_id_fkey'
    ) THEN
        ALTER TABLE tournaments 
        ADD CONSTRAINT tournaments_winner_id_fkey 
        FOREIGN KEY (winner_id) REFERENCES users(id);
        RAISE NOTICE 'Added tournaments_winner_id_fkey constraint';
    ELSE
        RAISE NOTICE 'tournaments_winner_id_fkey constraint already exists';
    END IF;
END $$;

-- Verify the constraints were added
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  a.attname as column_name,
  confrelid::regclass as foreign_table_name,
  af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'tournaments'::regclass;

-- Test the joins
SELECT 
  t.id,
  t.name,
  t.created_by,
  t.winner_id,
  creator.display_name as creator_name,
  winner.display_name as winner_name
FROM tournaments t
LEFT JOIN users creator ON t.created_by = creator.id
LEFT JOIN users winner ON t.winner_id = winner.id
LIMIT 5; 