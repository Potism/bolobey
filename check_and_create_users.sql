-- Check and create users if needed
-- This script will help diagnose the "Unknown Player" issue

-- Check if users table has any data
SELECT COUNT(*) as total_users FROM users;

-- Check sample users
SELECT 
    id,
    display_name,
    email,
    created_at
FROM users 
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any users with display names
SELECT COUNT(*) as users_with_names 
FROM users 
WHERE display_name IS NOT NULL AND display_name != '';

-- Check if there are any users without display names
SELECT COUNT(*) as users_without_names 
FROM users 
WHERE display_name IS NULL OR display_name = '';

-- Check tournament participants
SELECT 
    tp.tournament_id,
    tp.user_id,
    tp.seed,
    u.display_name,
    u.email
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
LIMIT 10;

-- Check if there are participants without corresponding users
SELECT 
    tp.user_id,
    tp.tournament_id
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE u.id IS NULL;

-- Create test users if none exist
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    IF user_count = 0 THEN
        RAISE NOTICE 'No users found, creating test users...';
        
        -- Create test users
        INSERT INTO users (id, display_name, email, role, created_at, updated_at) VALUES
        ('test-user-1', 'Test Player 1', 'player1@test.com', 'user', NOW(), NOW()),
        ('test-user-2', 'Test Player 2', 'player2@test.com', 'user', NOW(), NOW()),
        ('test-user-3', 'Test Player 3', 'player3@test.com', 'user', NOW(), NOW()),
        ('test-user-4', 'Test Player 4', 'player4@test.com', 'user', NOW(), NOW()),
        ('test-admin', 'Test Admin', 'admin@test.com', 'admin', NOW(), NOW());
        
        RAISE NOTICE 'Created 5 test users';
    ELSE
        RAISE NOTICE 'Found % existing users', user_count;
    END IF;
END $$;

-- Create user_points for test users if they don't exist
INSERT INTO user_points (user_id, betting_points, stream_points, created_at, updated_at)
SELECT 
    u.id,
    1000, -- Starting betting points
    500,  -- Starting stream points
    NOW(),
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_points up WHERE up.user_id = u.id
);

-- Verify the results
SELECT 
    u.id,
    u.display_name,
    u.email,
    up.betting_points,
    up.stream_points
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
ORDER BY u.created_at DESC
LIMIT 10;

SELECT 'User check and creation completed!' as status; 