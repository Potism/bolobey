-- Fix YouTube Save Function
-- Run this in Supabase SQL Editor

-- Drop the existing function first
DROP FUNCTION IF EXISTS update_youtube_stream_settings(UUID, TEXT, TEXT, TEXT);

-- Create a simpler, more robust function
CREATE OR REPLACE FUNCTION update_youtube_stream_settings(
  tournament_uuid UUID,
  youtube_video_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update the tournament with YouTube video ID
  UPDATE tournaments 
  SET youtube_video_id = update_youtube_stream_settings.youtube_video_id,
      stream_url = 'rtmp://a.rtmp.youtube.com/live2',
      stream_platform = 'youtube'
  WHERE id = tournament_uuid;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Tournament not found'
    );
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', 'YouTube video ID saved successfully',
    'tournament_id', tournament_uuid,
    'youtube_video_id', youtube_video_id
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error updating YouTube settings: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_youtube_stream_settings(UUID, TEXT) TO authenticated;

-- Test the function
SELECT update_youtube_stream_settings(
  (SELECT id FROM tournaments LIMIT 1),
  'test-video-id'
);

-- Success message
SELECT '✅ YouTube save function fixed!' as status; 