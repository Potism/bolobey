-- Fixed spectator tracking setup

-- Drop existing objects if they exist
DROP FUNCTION IF EXISTS add_tournament_spectator(UUID, UUID, TEXT, TEXT, INET);
DROP FUNCTION IF EXISTS add_tournament_spectator(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS remove_tournament_spectator(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_tournament_spectator_count(UUID);
DROP FUNCTION IF EXISTS cleanup_old_spectators();
DROP VIEW IF EXISTS tournament_spectator_counts;
DROP TABLE IF EXISTS tournament_spectators;

-- Create tournament spectators tracking table
CREATE TABLE tournament_spectators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL,
  user_id UUID,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tournament_id, user_id, session_id)
);

-- Create index for efficient queries
CREATE INDEX idx_tournament_spectators_tournament_id ON tournament_spectators(tournament_id);
CREATE INDEX idx_tournament_spectators_active ON tournament_spectators(is_active);
CREATE INDEX idx_tournament_spectators_last_seen ON tournament_spectators(last_seen);

-- Function to get active spectator count for a tournament
CREATE OR REPLACE FUNCTION get_tournament_spectator_count(tournament_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM tournament_spectators
    WHERE tournament_id = tournament_uuid
      AND is_active = true
      AND last_seen > NOW() - INTERVAL '5 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add/update spectator (FIXED parameter order)
CREATE OR REPLACE FUNCTION add_tournament_spectator(
  tournament_uuid UUID,
  session_id_param TEXT,
  user_uuid UUID DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO tournament_spectators (
    tournament_id,
    user_id,
    session_id,
    user_agent,
    ip_address,
    joined_at,
    last_seen,
    is_active
  ) VALUES (
    tournament_uuid,
    user_uuid,
    session_id_param,
    user_agent_param,
    ip_address_param,
    NOW(),
    NOW(),
    true
  )
  ON CONFLICT (tournament_id, user_id, session_id)
  DO UPDATE SET
    last_seen = NOW(),
    is_active = true,
    user_agent = COALESCE(user_agent_param, tournament_spectators.user_agent),
    ip_address = COALESCE(ip_address_param, tournament_spectators.ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove spectator
CREATE OR REPLACE FUNCTION remove_tournament_spectator(
  tournament_uuid UUID,
  session_id_param TEXT,
  user_uuid UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE tournament_spectators
  SET is_active = false
  WHERE tournament_id = tournament_uuid
    AND (user_id = user_uuid OR (user_id IS NULL AND user_uuid IS NULL))
    AND session_id = session_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old spectator records
CREATE OR REPLACE FUNCTION cleanup_old_spectators()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM tournament_spectators
  WHERE last_seen < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for easy spectator count queries
CREATE OR REPLACE VIEW tournament_spectator_counts AS
SELECT 
  tournament_id,
  COUNT(*) as active_spectators,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as authenticated_spectators,
  COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous_spectators
FROM tournament_spectators
WHERE is_active = true
  AND last_seen > NOW() - INTERVAL '5 minutes'
GROUP BY tournament_id;

-- Grant permissions
GRANT SELECT ON tournament_spectator_counts TO authenticated;
GRANT SELECT ON tournament_spectator_counts TO anon;
GRANT ALL ON tournament_spectators TO authenticated;
GRANT ALL ON tournament_spectators TO anon;

-- Test the setup
SELECT 'Tournament spectators tracking system created successfully!' as status;

-- Show what was created
SELECT 'Tables:' as info;
SELECT table_name FROM information_schema.tables WHERE table_name = 'tournament_spectators';

SELECT 'Functions:' as info;
SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%spectator%';

SELECT 'Views:' as info;
SELECT table_name FROM information_schema.views WHERE table_name = 'tournament_spectator_counts'; 