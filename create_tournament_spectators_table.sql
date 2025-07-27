-- Create tournament spectators tracking table
CREATE TABLE IF NOT EXISTS tournament_spectators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- To track multiple browser sessions
  user_agent TEXT,
  ip_address INET,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tournament_id, user_id, session_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tournament_spectators_tournament_id ON tournament_spectators(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_spectators_active ON tournament_spectators(is_active);
CREATE INDEX IF NOT EXISTS idx_tournament_spectators_last_seen ON tournament_spectators(last_seen);

-- Function to get active spectator count for a tournament
CREATE OR REPLACE FUNCTION get_tournament_spectator_count(tournament_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM tournament_spectators
    WHERE tournament_id = tournament_uuid
      AND is_active = true
      AND last_seen > NOW() - INTERVAL '5 minutes' -- Consider inactive after 5 minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add/update spectator
CREATE OR REPLACE FUNCTION add_tournament_spectator(
  tournament_uuid UUID,
  user_uuid UUID DEFAULT NULL,
  session_id_param TEXT,
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
  user_uuid UUID DEFAULT NULL,
  session_id_param TEXT
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

-- Function to cleanup old spectator records (run periodically)
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

-- Enable RLS
ALTER TABLE tournament_spectators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to spectator counts" ON tournament_spectators
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to add themselves as spectators" ON tournament_spectators
  FOR INSERT WITH CHECK (
    (user_id IS NULL) OR (user_id = auth.uid())
  );

CREATE POLICY "Allow users to update their own spectator record" ON tournament_spectators
  FOR UPDATE USING (
    (user_id IS NULL) OR (user_id = auth.uid())
  );

CREATE POLICY "Allow users to remove their own spectator record" ON tournament_spectators
  FOR DELETE USING (
    (user_id IS NULL) OR (user_id = auth.uid())
  );

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

SELECT 'Tournament spectators tracking system created successfully!' as status; 