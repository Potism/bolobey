-- Enable RLS on all tables to fix the "Unknown Player" issue
-- Run this in Supabase SQL Editor

-- Step 1: Enable RLS on users table
SELECT '=== STEP 1: ENABLING RLS ON USERS TABLE ===' as info;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Enable RLS on tournaments table
SELECT '=== STEP 2: ENABLING RLS ON TOURNAMENTS TABLE ===' as info;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Step 3: Enable RLS on tournament_participants table
SELECT '=== STEP 3: ENABLING RLS ON TOURNAMENT_PARTICIPANTS TABLE ===' as info;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Step 4: Enable RLS on matches table
SELECT '=== STEP 4: ENABLING RLS ON MATCHES TABLE ===' as info;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Step 5: Enable RLS on betting_matches table
SELECT '=== STEP 5: ENABLING RLS ON BETTING_MATCHES TABLE ===' as info;
ALTER TABLE public.betting_matches ENABLE ROW LEVEL SECURITY;

-- Step 6: Enable RLS on user_points table
SELECT '=== STEP 6: ENABLING RLS ON USER_POINTS TABLE ===' as info;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Step 7: Enable RLS on user_bets table (if it exists)
SELECT '=== STEP 7: ENABLING RLS ON USER_BETS TABLE ===' as info;
ALTER TABLE public.user_bets ENABLE ROW LEVEL SECURITY;

-- Step 8: Create/Update RLS policies for users table
SELECT '=== STEP 8: CREATING RLS POLICIES FOR USERS ===' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users" ON public.users;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Step 9: Create/Update RLS policies for tournaments table
SELECT '=== STEP 9: CREATING RLS POLICIES FOR TOURNAMENTS ===' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tournaments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tournaments;
DROP POLICY IF EXISTS "Enable update for tournament creators" ON public.tournaments;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON public.tournaments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.tournaments
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable update for tournament creators" ON public.tournaments
    FOR UPDATE USING (auth.uid() = created_by);

-- Step 10: Create/Update RLS policies for tournament_participants table
SELECT '=== STEP 10: CREATING RLS POLICIES FOR TOURNAMENT_PARTICIPANTS ===' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tournament_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tournament_participants;
DROP POLICY IF EXISTS "Enable update for participants" ON public.tournament_participants;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON public.tournament_participants
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.tournament_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for participants" ON public.tournament_participants
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 11: Create/Update RLS policies for matches table
SELECT '=== STEP 11: CREATING RLS POLICIES FOR MATCHES ===' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.matches;
DROP POLICY IF EXISTS "Enable insert for tournament creators" ON public.matches;
DROP POLICY IF EXISTS "Enable update for tournament creators" ON public.matches;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON public.matches
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for tournament creators" ON public.matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tournaments 
            WHERE tournaments.id = matches.tournament_id 
            AND tournaments.created_by = auth.uid()
        )
    );

CREATE POLICY "Enable update for tournament creators" ON public.matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.tournaments 
            WHERE tournaments.id = matches.tournament_id 
            AND tournaments.created_by = auth.uid()
        )
    );

-- Step 12: Create/Update RLS policies for betting_matches table
SELECT '=== STEP 12: CREATING RLS POLICIES FOR BETTING_MATCHES ===' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read betting matches" ON public.betting_matches;
DROP POLICY IF EXISTS "Admins can manage betting matches" ON public.betting_matches;

-- Create new policies
CREATE POLICY "Anyone can read betting matches" ON public.betting_matches
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage betting matches" ON public.betting_matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Step 13: Create/Update RLS policies for user_points table
SELECT '=== STEP 13: CREATING RLS POLICIES FOR USER_POINTS ===' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update own points" ON public.user_points;

-- Create new policies
CREATE POLICY "Users can view own points" ON public.user_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own points" ON public.user_points
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 14: Create/Update RLS policies for user_bets table
SELECT '=== STEP 14: CREATING RLS POLICIES FOR USER_BETS ===' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bets" ON public.user_bets;
DROP POLICY IF EXISTS "Users can insert own bets" ON public.user_bets;
DROP POLICY IF EXISTS "Users can update own bets" ON public.user_bets;

-- Create new policies
CREATE POLICY "Users can view own bets" ON public.user_bets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bets" ON public.user_bets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bets" ON public.user_bets
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 15: Verify RLS is enabled
SELECT '=== STEP 15: VERIFICATION ===' as info;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'tournaments', 'tournament_participants', 'matches', 'betting_matches', 'user_points', 'user_bets')
ORDER BY tablename;

-- Step 16: Test the fix
SELECT '=== STEP 16: TESTING THE FIX ===' as info;

-- Test if we can read user data
SELECT 
    COUNT(*) as users_count
FROM public.users;

-- Test if we can read tournament participants
SELECT 
    COUNT(*) as participants_count
FROM public.tournament_participants;

-- Test specific tournament
SELECT 
    tp.user_id,
    u.display_name,
    u.email
FROM tournament_participants tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

SELECT 'RLS has been enabled successfully! The "Unknown Player" issue should now be resolved.' as status; 