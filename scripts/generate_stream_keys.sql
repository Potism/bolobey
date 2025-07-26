-- Generate stream keys for tournaments
-- Run this in Supabase SQL Editor

-- Function to generate a random stream key
CREATE OR REPLACE FUNCTION generate_stream_key()
RETURNS TEXT AS $$
BEGIN
  -- Generate a 16-character alphanumeric key
  RETURN 'bolobey_' || 
         array_to_string(ARRAY(
           SELECT chr((65 + round(random() * 25))::integer) 
           FROM generate_series(1, 8)
         ), '') ||
         array_to_string(ARRAY(
           SELECT chr((48 + round(random() * 9))::integer) 
           FROM generate_series(1, 8)
         ), '');
END;
$$ LANGUAGE plpgsql;

-- Update existing tournaments with stream keys
UPDATE tournaments 
SET stream_key = generate_stream_key()
WHERE stream_key IS NULL;

-- Function to generate new stream key for a tournament
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

-- Example usage:
-- SELECT regenerate_tournament_stream_key('your-tournament-id-here');

-- View current stream keys (admin only)
CREATE VIEW tournament_stream_info AS
SELECT 
  id,
  name,
  stream_url,
  stream_key,
  created_at
FROM tournaments
WHERE stream_key IS NOT NULL
ORDER BY created_at DESC; 