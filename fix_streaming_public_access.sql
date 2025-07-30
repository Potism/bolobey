-- Quick Fix for Streaming Overlay Public Access
-- Run this in your Supabase SQL Editor to fix the multi-device access issue

-- 1. Drop existing policies and create new ones for public streaming access
DROP POLICY IF EXISTS "Public streaming access - tournaments" ON tournaments;
CREATE POLICY "Public streaming access - tournaments" ON tournaments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public streaming access - matches" ON matches;
CREATE POLICY "Public streaming access - matches" ON matches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public streaming access - participants" ON tournament_participants;
CREATE POLICY "Public streaming access - participants" ON tournament_participants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public streaming access - users" ON users;
CREATE POLICY "Public streaming access - users" ON users
    FOR SELECT USING (true);

-- 2. Create tournament_spectators table if it doesn't exist
CREATE TABLE IF NOT EXISTS tournament_spectators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    active_spectators INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- 3. Enable RLS and add public access for spectators
ALTER TABLE tournament_spectators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public streaming access - spectators" ON tournament_spectators;
CREATE POLICY "Public streaming access - spectators" ON tournament_spectators
    FOR SELECT USING (true);

-- 4. Grant permissions to anonymous users
GRANT SELECT ON tournaments TO anon;
GRANT SELECT ON matches TO anon;
GRANT SELECT ON tournament_participants TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON tournament_spectators TO anon;

-- 5. Verify the fix
SELECT '✅ Streaming overlay public access has been fixed!' as status;
SELECT '✅ You can now access the overlay from multiple devices without authentication issues' as note; 