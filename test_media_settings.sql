-- Test script for media settings
-- Run this in Supabase SQL Editor to verify media settings are working

-- 1. Check current tournament media settings
SELECT '=== CURRENT TOURNAMENT MEDIA SETTINGS ===' as info;
SELECT 
    id,
    name,
    youtube_video_id,
    stream_url,
    created_at
FROM tournaments 
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

-- 2. Test updating YouTube video ID
SELECT '=== TEST YOUTUBE UPDATE ===' as info;
UPDATE tournaments 
SET youtube_video_id = 'dQw4w9WgXcQ',
    stream_url = NULL
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
RETURNING id, name, youtube_video_id, stream_url;

-- 3. Test updating webcam setting
SELECT '=== TEST WEBCAM UPDATE ===' as info;
UPDATE tournaments 
SET stream_url = 'webcam',
    youtube_video_id = NULL
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
RETURNING id, name, youtube_video_id, stream_url;

-- 4. Check final state
SELECT '=== FINAL STATE ===' as info;
SELECT 
    id,
    name,
    youtube_video_id,
    stream_url,
    created_at
FROM tournaments 
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

-- 5. Check RLS policies for tournaments table
SELECT '=== RLS POLICIES CHECK ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'tournaments'; 