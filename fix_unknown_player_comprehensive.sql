-- Comprehensive Fix for "Unknown Player" Issue
-- This script addresses all possible causes of the "Unknown Player" problem

-- Step 1: Check current state
SELECT '=== STEP 1: CURRENT STATE ANALYSIS ===' as info;

-- Check all users with problematic display names
SELECT 
    id,
    email,
    display_name,
    created_at,
    CASE 
        WHEN display_name = 'Unknown Player' THEN '❌ UNKNOWN PLAYER'
        WHEN display_name IS NULL THEN '❌ NULL'
        WHEN display_name = '' THEN '❌ EMPTY'
        WHEN display_name = 'User' THEN '❌ GENERIC'
        ELSE '✅ OK'
    END as status
FROM users
WHERE display_name = 'Unknown Player' 
   OR display_name IS NULL 
   OR display_name = '' 
   OR display_name = 'User'
ORDER BY created_at DESC;

-- Step 2: Fix users with "Unknown Player" display names
SELECT '=== STEP 2: FIXING UNKNOWN PLAYER NAMES ===' as info;

-- Update users with "Unknown Player" to use email prefix or a better name
UPDATE users
SET 
    display_name = CASE 
        WHEN email LIKE '%@%' THEN 
            COALESCE(
                split_part(email, '@', 1),
                'Player'
            )
        ELSE 'Player'
    END,
    updated_at = NOW()
WHERE display_name = 'Unknown Player';

-- Step 3: Fix users with NULL or empty display names
SELECT '=== STEP 3: FIXING NULL/EMPTY NAMES ===' as info;

UPDATE users
SET 
    display_name = CASE 
        WHEN email LIKE '%@%' THEN 
            COALESCE(
                split_part(email, '@', 1),
                'Player'
            )
        ELSE 'Player'
    END,
    updated_at = NOW()
WHERE display_name IS NULL OR display_name = '';

-- Step 4: Fix users with generic "User" names
SELECT '=== STEP 4: FIXING GENERIC USER NAMES ===' as info;

UPDATE users
SET 
    display_name = CASE 
        WHEN email LIKE '%@%' THEN 
            COALESCE(
                split_part(email, '@', 1),
                'Player'
            )
        ELSE 'Player'
    END,
    updated_at = NOW()
WHERE display_name = 'User';

-- Step 5: Ensure all users have user_points records
SELECT '=== STEP 5: ENSURING USER_POINTS EXIST ===' as info;

-- Create user_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_points (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 50,
    stream_points INTEGER DEFAULT 0,
    total_betting_points_earned INTEGER DEFAULT 0,
    total_stream_points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert missing user_points records
INSERT INTO user_points (user_id, betting_points, stream_points)
SELECT 
    u.id,
    50 as betting_points,
    0 as stream_points
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Verify the fix
SELECT '=== STEP 6: VERIFICATION ===' as info;

-- Check if any users still have problematic names
SELECT 
    COUNT(*) as problematic_users_count
FROM users
WHERE display_name = 'Unknown Player' 
   OR display_name IS NULL 
   OR display_name = '' 
   OR display_name = 'User';

-- Show all users after the fix
SELECT 
    id,
    email,
    display_name,
    created_at,
    CASE 
        WHEN display_name = 'Unknown Player' THEN '❌ UNKNOWN PLAYER'
        WHEN display_name IS NULL THEN '❌ NULL'
        WHEN display_name = '' THEN '❌ EMPTY'
        WHEN display_name = 'User' THEN '❌ GENERIC'
        ELSE '✅ OK'
    END as status
FROM users
ORDER BY created_at DESC;

-- Step 7: Test tournament participants
SELECT '=== STEP 7: TOURNAMENT PARTICIPANTS TEST ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    u.display_name,
    u.email,
    CASE 
        WHEN u.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        WHEN u.display_name IS NULL THEN '❌ NULL'
        WHEN u.display_name = '' THEN '❌ EMPTY'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
ORDER BY tp.joined_at DESC;

-- Step 8: Test betting matches view
SELECT '=== STEP 8: BETTING MATCHES VIEW TEST ===' as info;

SELECT 
    id,
    player1_id,
    player2_id,
    player1_name,
    player2_name,
    CASE 
        WHEN player1_name = 'Unknown Player' OR player2_name = 'Unknown Player' THEN '❌ HAS UNKNOWN PLAYER'
        ELSE '✅ OK'
    END as status
FROM current_betting_matches
ORDER BY created_at DESC;

-- Step 9: Create a function to prevent future "Unknown Player" issues
SELECT '=== STEP 9: CREATING PREVENTION FUNCTION ===' as info;

CREATE OR REPLACE FUNCTION ensure_valid_display_name()
RETURNS TRIGGER AS $$
BEGIN
    -- If display_name is NULL, empty, or "Unknown Player", set a better default
    IF NEW.display_name IS NULL OR NEW.display_name = '' OR NEW.display_name = 'Unknown Player' THEN
        NEW.display_name := CASE 
            WHEN NEW.email LIKE '%@%' THEN 
                COALESCE(split_part(NEW.email, '@', 1), 'Player')
            ELSE 'Player'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent future issues
DROP TRIGGER IF EXISTS ensure_valid_display_name_trigger ON users;
CREATE TRIGGER ensure_valid_display_name_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_valid_display_name();

-- Step 10: Final summary
SELECT '=== STEP 10: FIX COMPLETE ===' as info;

SELECT 
    'Unknown Player issue has been fixed!' as message,
    COUNT(*) as total_users,
    COUNT(CASE WHEN display_name != 'Unknown Player' AND display_name IS NOT NULL AND display_name != '' THEN 1 END) as valid_users,
    COUNT(CASE WHEN display_name = 'Unknown Player' OR display_name IS NULL OR display_name = '' THEN 1 END) as problematic_users
FROM users; 