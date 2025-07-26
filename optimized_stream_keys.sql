-- Optimized function to generate stream key only when needed
CREATE OR REPLACE FUNCTION generate_stream_key()
RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  -- Use timestamp for uniqueness (more efficient than random bytes)
  timestamp_part := extract(epoch from now())::bigint::text;
  
  -- Generate shorter random part
  random_part := substr(md5(random()::text), 1, 8);
  
  -- Return Facebook Gaming style key
  RETURN 'FB-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to get or generate stream key (lazy generation)
CREATE OR REPLACE FUNCTION get_or_generate_stream_key(tournament_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  existing_key TEXT;
  new_key TEXT;
BEGIN
  -- Check if stream key already exists
  SELECT stream_key INTO existing_key 
  FROM tournaments 
  WHERE id = tournament_uuid;
  
  -- Return existing key if found
  IF existing_key IS NOT NULL THEN
    RETURN existing_key;
  END IF;
  
  -- Generate new key only when needed
  new_key := generate_stream_key();
  
  -- Update tournament with new key
  UPDATE tournaments 
  SET stream_key = new_key,
      stream_url = 'rtmp://live-api-s.facebook.com/rtmp/'
  WHERE id = tournament_uuid;
  
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to regenerate stream key
CREATE OR REPLACE FUNCTION regenerate_tournament_stream_key(tournament_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  new_key := generate_stream_key();
  
  UPDATE tournaments 
  SET stream_key = new_key
  WHERE id = tournament_uuid;
  
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the automatic trigger (we'll generate on-demand instead)
DROP TRIGGER IF EXISTS on_tournament_created ON tournaments;
DROP FUNCTION IF EXISTS set_default_stream_settings();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_stream_key ON tournaments(stream_key) WHERE stream_key IS NOT NULL; 