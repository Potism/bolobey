-- Simple spectator tracking setup

-- Create the table
CREATE TABLE IF NOT EXISTS tournament_spectators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL,
  user_id UUID,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create the view
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

-- Simple function to add spectator
CREATE OR REPLACE FUNCTION add_tournament_spectator(
  tournament_uuid UUID,
  user_uuid UUID DEFAULT NULL,
  session_id_param TEXT,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO tournament_spectators (
    tournament_id,
    user_id,
    session_id,
    user_agent,
    last_seen,
    is_active
  ) VALUES (
    tournament_uuid,
    user_uuid,
    session_id_param,
    user_agent_param,
    NOW(),
    true
  )
  ON CONFLICT (tournament_id, user_id, session_id)
  DO UPDATE SET
    last_seen = NOW(),
    is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON tournament_spectator_counts TO authenticated;
GRANT SELECT ON tournament_spectator_counts TO anon;
GRANT ALL ON tournament_spectators TO authenticated;
GRANT ALL ON tournament_spectators TO anon;

SELECT 'Simple spectator tracking setup completed!' as status; 