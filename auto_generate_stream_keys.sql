-- Function to generate a random stream key
CREATE OR REPLACE FUNCTION generate_stream_key()
RETURNS TEXT AS $$
BEGIN
  -- Generate a random stream key (similar to Facebook Gaming format)
  RETURN 'FB-' || 
         floor(random() * 1000000000000)::text || '-' ||
         floor(random() * 10)::text || '-' ||
         encode(gen_random_bytes(12), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set stream settings for new tournaments
CREATE OR REPLACE FUNCTION set_default_stream_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default stream URL and generate stream key for new tournaments
  NEW.stream_url = 'rtmp://live-api-s.facebook.com/rtmp/';
  NEW.stream_key = generate_stream_key();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set stream settings for new tournaments
DROP TRIGGER IF EXISTS on_tournament_created ON tournaments;
CREATE TRIGGER on_tournament_created
  BEFORE INSERT ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_default_stream_settings();

-- Update existing tournaments that don't have stream settings
UPDATE tournaments 
SET stream_url = 'rtmp://live-api-s.facebook.com/rtmp/',
    stream_key = generate_stream_key()
WHERE stream_url IS NULL OR stream_key IS NULL; 