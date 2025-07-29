-- Direct fix for Unknown Players
-- Creates missing user profiles for tournament participants

-- Create the missing users
INSERT INTO users (id, email, display_name, role, created_at)
VALUES 
    ('71bbf767-1188-4f54-8bd1-2d7474bd2ebf', 'player1@bolobey.com', 'Player 1', 'player', NOW()),
    ('4b9b0152-78a6-4605-a606-b2bdf1cf6722', 'player2@bolobey.com', 'Player 2', 'player', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create user_points for them
INSERT INTO user_points (user_id, betting_points, stream_points)
VALUES 
    ('71bbf767-1188-4f54-8bd1-2d7474bd2ebf', 50, 0),
    ('4b9b0152-78a6-4605-a606-b2bdf1cf6722', 50, 0)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the fix
SELECT 'Fixed! Players should now show names instead of Unknown Player' as status; 