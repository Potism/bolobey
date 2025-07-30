-- Fix Public Access for Streaming Overlay and Control
-- This script allows anonymous users to view tournament data for streaming purposes

-- Step 1: Check current RLS status
SELECT '=== CHECKING CURRENT RLS STATUS ===' as info;

SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tournaments', 'matches', 'tournament_participants', 'tournament_spectators', 'users');

-- Step 2: Update RLS policies to allow public read access for streaming
SELECT '=== UPDATING RLS POLICIES FOR PUBLIC ACCESS ===' as info;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Anyone can view matches" ON matches;
DROP POLICY IF EXISTS "Anyone can view participants" ON tournament_participants;
DROP POLICY IF EXISTS "Anyone can view users" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;

-- Create new policies that allow anonymous access for streaming
CREATE POLICY "Public can view tournaments for streaming" ON tournaments
    FOR SELECT USING (true);

CREATE POLICY "Public can view matches for streaming" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Public can view participants for streaming" ON tournament_participants
    FOR SELECT USING (true);

CREATE POLICY "Public can view user profiles for streaming" ON users
    FOR SELECT USING (true);

-- Keep existing authenticated user policies for modifications
-- (These should already exist from previous setup)

-- Step 3: Ensure tournament_spectators table has public read access
SELECT '=== SETTING UP TOURNAMENT_SPECTATORS PUBLIC ACCESS ===' as info;

-- Create tournament_spectators table if it doesn't exist
CREATE TABLE IF NOT EXISTS tournament_spectators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    active_spectators INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Enable RLS on tournament_spectators
ALTER TABLE tournament_spectators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view tournament spectators" ON tournament_spectators;
DROP POLICY IF EXISTS "Users can manage their own spectatorship" ON tournament_spectators;

-- Create new policies
CREATE POLICY "Public can view tournament spectators" ON tournament_spectators
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own spectatorship" ON tournament_spectators
    FOR ALL USING (auth.uid() = user_id);

-- Step 4: Create indexes for better performance
SELECT '=== CREATING PERFORMANCE INDEXES ===' as info;

CREATE INDEX IF NOT EXISTS idx_tournaments_id ON tournaments(id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_spectators_tournament_id ON tournament_spectators(tournament_id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Step 5: Grant necessary permissions
SELECT '=== GRANTING PERMISSIONS ===' as info;

-- Grant SELECT permissions to anonymous users for streaming data
GRANT SELECT ON tournaments TO anon;
GRANT SELECT ON matches TO anon;
GRANT SELECT ON tournament_participants TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON tournament_spectators TO anon;

-- Grant SELECT permissions to authenticated users
GRANT SELECT ON tournaments TO authenticated;
GRANT SELECT ON matches TO authenticated;
GRANT SELECT ON tournament_participants TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON tournament_spectators TO authenticated;

-- Step 6: Verify the setup
SELECT '=== VERIFICATION ===' as info;

-- Check that policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('tournaments', 'matches', 'tournament_participants', 'tournament_spectators', 'users')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;

SELECT '✅ Public access for streaming overlay and control has been configured!' as status;
SELECT '✅ Anonymous users can now view tournament data for streaming purposes' as note;
SELECT '✅ Multi-device access should now work properly' as note; 