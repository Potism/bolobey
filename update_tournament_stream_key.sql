-- Function to update tournament stream key
CREATE OR REPLACE FUNCTION update_tournament_stream_key(
  tournament_uuid UUID,
  stream_key TEXT,
  stream_url TEXT DEFAULT 'rtmp://live-api-s.facebook.com/rtmp/'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE tournaments 
  SET stream_key = update_tournament_stream_key.stream_key,
      stream_url = update_tournament_stream_key.stream_url
  WHERE id = tournament_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 