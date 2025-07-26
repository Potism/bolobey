-- YouTube Live Stream Setup
-- Run this in Supabase SQL Editor

-- 1. Add YouTube-specific columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS youtube_video_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_key TEXT,
ADD COLUMN IF NOT EXISTS stream_platform TEXT DEFAULT 'youtube' CHECK (stream_platform IN ('youtube', 'facebook', 'twitch', 'custom'));

-- Add comments for documentation
COMMENT ON COLUMN tournaments.youtube_video_id IS 'YouTube video ID for live stream embedding';
COMMENT ON COLUMN tournaments.youtube_channel_id IS 'YouTube channel ID for stream management';
COMMENT ON COLUMN tournaments.youtube_stream_key IS 'YouTube stream key for OBS integration';
COMMENT ON COLUMN tournaments.stream_platform IS 'Primary streaming platform for this tournament';

-- 2. Function to generate YouTube-style stream key
CREATE OR REPLACE FUNCTION generate_youtube_stream_key()
RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  -- Use timestamp for uniqueness
  timestamp_part := extract(epoch from now())::bigint::text;
  
  -- Generate random part (YouTube keys are typically longer)
  random_part := substr(md5(random()::text), 1, 12);
  
  -- Return YouTube-style key
  RETURN 'yt-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get or generate YouTube stream key
CREATE OR REPLACE FUNCTION get_or_generate_youtube_stream_key(tournament_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  existing_key TEXT;
  new_key TEXT;
BEGIN
  -- Check if YouTube stream key already exists
  SELECT youtube_stream_key INTO existing_key 
  FROM tournaments 
  WHERE id = tournament_uuid;
  
  -- Return existing key if found
  IF existing_key IS NOT NULL THEN
    RETURN existing_key;
  END IF;
  
  -- Generate new YouTube stream key
  new_key := generate_youtube_stream_key();
  
  -- Update tournament with new YouTube stream key and settings
  UPDATE tournaments 
  SET youtube_stream_key = new_key,
      stream_url = 'rtmp://a.rtmp.youtube.com/live2',
      stream_platform = 'youtube'
  WHERE id = tournament_uuid;
  
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to regenerate YouTube stream key
CREATE OR REPLACE FUNCTION regenerate_youtube_stream_key(tournament_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  new_key := generate_youtube_stream_key();
  
  UPDATE tournaments 
  SET youtube_stream_key = new_key,
      stream_url = 'rtmp://a.rtmp.youtube.com/live2',
      stream_platform = 'youtube'
  WHERE id = tournament_uuid;
  
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to update YouTube stream settings
CREATE OR REPLACE FUNCTION update_youtube_stream_settings(
  tournament_uuid UUID,
  youtube_video_id TEXT DEFAULT NULL,
  youtube_channel_id TEXT DEFAULT NULL,
  youtube_stream_key TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE tournaments 
  SET youtube_video_id = update_youtube_stream_settings.youtube_video_id,
      youtube_channel_id = update_youtube_stream_settings.youtube_channel_id,
      youtube_stream_key = COALESCE(update_youtube_stream_settings.youtube_stream_key, youtube_stream_key),
      stream_url = 'rtmp://a.rtmp.youtube.com/live2',
      stream_platform = 'youtube'
  WHERE id = tournament_uuid;
  
  result := json_build_object(
    'success', true,
    'message', 'YouTube stream settings updated successfully',
    'tournament_id', tournament_uuid
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get YouTube stream info
CREATE OR REPLACE FUNCTION get_youtube_stream_info(tournament_uuid UUID)
RETURNS JSON AS $$
DECLARE
  tournament_record RECORD;
  result JSON;
BEGIN
  SELECT 
    id,
    name,
    youtube_video_id,
    youtube_channel_id,
    youtube_stream_key,
    stream_url,
    stream_platform,
    status
  INTO tournament_record
  FROM tournaments 
  WHERE id = tournament_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Tournament not found');
  END IF;
  
  result := json_build_object(
    'success', true,
    'tournament_id', tournament_record.id,
    'tournament_name', tournament_record.name,
    'youtube_video_id', tournament_record.youtube_video_id,
    'youtube_channel_id', tournament_record.youtube_channel_id,
    'youtube_stream_key', tournament_record.youtube_stream_key,
    'stream_url', tournament_record.stream_url,
    'stream_platform', tournament_record.stream_platform,
    'status', tournament_record.status
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_youtube_stream_key() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_generate_youtube_stream_key(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_youtube_stream_key(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_youtube_stream_settings(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_youtube_stream_info(UUID) TO authenticated;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_youtube_stream_key ON tournaments(youtube_stream_key) WHERE youtube_stream_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournaments_stream_platform ON tournaments(stream_platform);

-- 9. Update existing tournaments to use YouTube as default platform
UPDATE tournaments 
SET stream_platform = 'youtube'
WHERE stream_platform IS NULL;

-- Success message
SELECT '✅ YouTube Live Stream setup completed successfully!' as status; 