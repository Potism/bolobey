-- Check if user_points table exists and create it if missing
-- This fixes the "relation user_points does not exist" error

-- Step 1: Check if user_points table exists
SELECT 
    'Checking if user_points table exists:' as info,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_points'
    ) as table_exists;

-- Step 2: Create user_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_points (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 50 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    total_betting_points_earned INTEGER DEFAULT 0 CHECK (total_betting_points_earned >= 0),
    total_stream_points_earned INTEGER DEFAULT 0 CHECK (total_stream_points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_betting_points ON user_points(betting_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_stream_points ON user_points(stream_points DESC);

-- Step 4: Create RLS policies for user_points
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own points
DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
CREATE POLICY "Users can view their own points" ON user_points
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own points
DROP POLICY IF EXISTS "Users can update their own points" ON user_points;
CREATE POLICY "Users can update their own points" ON user_points
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Service role can manage all points
DROP POLICY IF EXISTS "Service role can manage all points" ON user_points;
CREATE POLICY "Service role can manage all points" ON user_points
    FOR ALL USING (auth.role() = 'service_role');

-- Step 5: Create user_points for existing users that don't have them
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
SELECT 
    'user_points table created/fixed!' as status,
    'Total users:' as info1, (SELECT COUNT(*) FROM users) as user_count,
    'Users with points:' as info2, (SELECT COUNT(*) FROM user_points) as points_count,
    'Missing points:' as info3, (
        SELECT COUNT(*) 
        FROM users u 
        LEFT JOIN user_points up ON u.id = up.user_id 
        WHERE up.user_id IS NULL
    ) as missing_count; 