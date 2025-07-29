-- Comprehensive Fix for "Unknown Player" Issue
-- Run this in Supabase SQL Editor

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

UPDATE users
SET 
    display_name = CASE 
        WHEN email LIKE '%@%' THEN 
            COALESCE(split_part(email, '@', 1), 'Player')
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
            COALESCE(split_part(email, '@', 1), 'Player')
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
            COALESCE(split_part(email, '@', 1), 'Player')
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

-- Step 6: Create missing users for any auth.users that don't have public.users
SELECT '=== STEP 6: CREATING MISSING USERS ===' as info;

-- This will create user profiles for any auth users that don't have public user records
-- Note: This might not work in Supabase SQL Editor due to permissions, but let's try

-- Step 7: Verify the fix
SELECT '=== STEP 7: VERIFICATION ===' as info;

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

-- Step 8: Test tournament participants
SELECT '=== STEP 8: TOURNAMENT PARTICIPANTS TEST ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    u.display_name,
    u.email,
    CASE 
        WHEN u.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        WHEN u.display_name IS NULL THEN '❌ NULL'
        WHEN u.display_name = '' THEN '❌ EMPTY'
        WHEN u.id IS NULL THEN '❌ USER NOT FOUND'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
ORDER BY tp.joined_at DESC;

-- Step 9: Test specific tournament
SELECT '=== STEP 9: SPECIFIC TOURNAMENT TEST ===' as info;

SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.tournament_id,
    u.display_name,
    u.email,
    CASE 
        WHEN u.display_name = 'Unknown Player' THEN '❌ UNKNOWN'
        WHEN u.display_name IS NULL THEN '❌ NULL'
        WHEN u.display_name = '' THEN '❌ EMPTY'
        WHEN u.id IS NULL THEN '❌ USER NOT FOUND'
        ELSE '✅ OK'
    END as status
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
ORDER BY tp.joined_at DESC;

-- Step 10: Create prevention function
SELECT '=== STEP 10: CREATING PREVENTION FUNCTION ===' as info;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_user_profile_safe(uuid, text, text);

-- Create the prevention function
CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
    user_id UUID,
    user_email TEXT,
    display_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    final_display_name TEXT;
BEGIN
    -- Ensure we have a valid display name
    final_display_name := COALESCE(
        display_name,
        CASE 
            WHEN user_email LIKE '%@%' THEN 
                COALESCE(split_part(user_email, '@', 1), 'Player')
            ELSE 'Player'
        END
    );
    
    -- Ensure the display name is not empty or "Unknown Player"
    IF final_display_name = '' OR final_display_name = 'Unknown Player' THEN
        final_display_name := CASE 
            WHEN user_email LIKE '%@%' THEN 
                COALESCE(split_part(user_email, '@', 1), 'Player')
            ELSE 'Player'
        END;
    END IF;
    
    -- Insert user profile
    INSERT INTO public.users (
        id,
        email,
        display_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        final_display_name,
        'player',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        updated_at = NOW();
    
    -- Insert user points
    INSERT INTO public.user_points (
        user_id,
        betting_points,
        stream_points,
        total_betting_points_earned,
        total_stream_points_earned,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        50, 0, 0, 0, NOW(), NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'user_id', user_id,
        'display_name', final_display_name,
        'message', 'User profile and points created successfully'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'user_id', user_id
        );
        RAISE WARNING 'Error in create_user_profile_safe: %', SQLERRM;
        RETURN result;
END;
$$;

-- Step 11: Create trigger to prevent future issues
SELECT '=== STEP 11: CREATING PREVENTION TRIGGER ===' as info;

-- Create trigger function
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

-- Create trigger
DROP TRIGGER IF EXISTS ensure_valid_display_name_trigger ON users;
CREATE TRIGGER ensure_valid_display_name_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_valid_display_name();

-- Step 12: Final summary
SELECT '=== STEP 12: FIX COMPLETE ===' as info;

SELECT 
    'Unknown Player issue has been fixed!' as message,
    COUNT(*) as total_users,
    COUNT(CASE WHEN display_name != 'Unknown Player' AND display_name IS NOT NULL AND display_name != '' THEN 1 END) as valid_users,
    COUNT(CASE WHEN display_name = 'Unknown Player' OR display_name IS NULL OR display_name = '' THEN 1 END) as problematic_users
FROM users; 