-- Add stream_url column to tournaments table for OBS integration
-- Run this in Supabase SQL Editor

-- Add stream_url column
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS stream_url TEXT;

-- Add stream_key column for OBS setup
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS stream_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tournaments.stream_url IS 'URL for live stream (RTMP, HLS, etc.)';
COMMENT ON COLUMN tournaments.stream_key IS 'Stream key for OBS integration';

-- Update existing tournaments with sample stream URLs (optional)
-- UPDATE tournaments 
-- SET stream_url = 'rtmp://your-streaming-server/live',
--     stream_key = 'demo-key-' || id
-- WHERE stream_url IS NULL; 