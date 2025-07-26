-- Fix Status Check Constraint for Prize Redemptions
-- Run this in Supabase SQL Editor

-- 1. Check current constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'prize_redemptions'::regclass 
AND contype = 'c';

-- 2. Drop the existing status check constraint
ALTER TABLE prize_redemptions DROP CONSTRAINT IF EXISTS prize_redemptions_status_check;

-- 3. Create new constraint that allows all valid statuses
ALTER TABLE prize_redemptions ADD CONSTRAINT prize_redemptions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));

-- 4. Test the constraint by trying to update a redemption
UPDATE prize_redemptions 
SET status = 'rejected' 
WHERE id = (SELECT id FROM prize_redemptions WHERE status = 'pending' LIMIT 1);

-- 5. Show the updated constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'prize_redemptions'::regclass 
AND contype = 'c';

-- 6. Show current redemption statuses
SELECT 
    'Current redemption statuses' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM prize_redemptions;

-- Success message
SELECT '✅ Status constraint fixed! Reject functionality should now work.' as status; 