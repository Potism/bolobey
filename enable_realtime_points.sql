-- Enable real-time subscriptions for points-related tables
-- This will allow the UI to automatically update when points change

-- Enable realtime for user_points table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_points'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_points;
    RAISE NOTICE 'Added user_points to realtime publication';
  ELSE
    RAISE NOTICE 'user_points already in realtime publication';
  END IF;
END $$;

-- Enable realtime for point_transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'point_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE point_transactions;
    RAISE NOTICE 'Added point_transactions to realtime publication';
  ELSE
    RAISE NOTICE 'point_transactions already in realtime publication';
  END IF;
END $$;

-- Enable realtime for user_bets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_bets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_bets;
    RAISE NOTICE 'Added user_bets to realtime publication';
  ELSE
    RAISE NOTICE 'user_bets already in realtime publication';
  END IF;
END $$;

-- Check current realtime publications
SELECT 
    'Current Realtime Tables' as info,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Test realtime is working by checking publication
SELECT 
    'Publication Status' as info,
    pubname,
    puballtables,
    pubinsert,
    pubupdate,
    pubdelete
FROM pg_publication 
WHERE pubname = 'supabase_realtime'; 