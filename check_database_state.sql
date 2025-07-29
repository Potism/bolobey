-- Check current database state
-- Let's see what's actually in the database

-- 1. Check all users
SELECT 'All users in database:' as info, COUNT(*) as count FROM users;

-- 2. Check all tournament participants
SELECT 'All tournament participants:' as info, COUNT(*) as count FROM tournament_participants;

-- 3. Check specific tournament participants
SELECT 
    'Tournament participants for Stream2:' as info,
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    tp.seed,
    u.display_name,
    u.email
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eff49c0e-7e49-435d-b0da-f3a6fdb10ffa';

-- 4. Check if there are any users at all
SELECT 'Sample of all users:' as info, id, display_name, email FROM users LIMIT 5;

-- 5. Check if there are any auth users
SELECT 'Auth users count:' as info, COUNT(*) as count FROM auth.users; 