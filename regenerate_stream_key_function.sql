-- Function to regenerate stream key for a specific tournament
CREATE OR REPLACE FUNCTION regenerate_tournament_stream_key(tournament_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  -- Generate new stream key
  new_key := generate_stream_key();
  
  -- Update the tournament with new stream key
  UPDATE tournaments 
  SET stream_key = new_key
  WHERE id = tournament_uuid;
  
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 