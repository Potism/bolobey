-- Check tournament foreign key relationships
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='tournaments';

-- Check if the foreign key constraints exist
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

-- Check tournaments table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
ORDER BY ordinal_position;

-- Test a simple join to see if it works
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