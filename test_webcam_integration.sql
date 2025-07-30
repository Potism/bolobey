-- Test script for webcam integration
-- Run this in Supabase SQL Editor to test webcam mode

-- 1. Check current tournament settings
SELECT '=== CURRENT TOURNAMENT SETTINGS ===' as info;
SELECT 
    id,
    name,
    youtube_video_id,
    stream_url,
    created_at
FROM tournaments 
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

-- 2. Test setting webcam mode
SELECT '=== SETTING WEBCAM MODE ===' as info;
UPDATE tournaments 
SET stream_url = 'webcam',
    youtube_video_id = NULL
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
RETURNING id, name, youtube_video_id, stream_url;

-- 3. Verify webcam mode is set
SELECT '=== VERIFYING WEBCAM MODE ===' as info;
SELECT 
    id,
    name,
    CASE 
        WHEN stream_url = 'webcam' THEN '✅ WEBCAM MODE'
        WHEN youtube_video_id IS NOT NULL THEN '✅ YOUTUBE MODE'
        ELSE '❌ NO MEDIA SET'
    END as media_status,
    youtube_video_id,
    stream_url
FROM tournaments 
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5';

-- 4. Test setting YouTube mode
SELECT '=== SETTING YOUTUBE MODE ===' as info;
UPDATE tournaments 
SET youtube_video_id = 'dQw4w9WgXcQ',
    stream_url = NULL
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'
RETURNING id, name, youtube_video_id, stream_url;

-- 5. Final verification
SELECT '=== FINAL VERIFICATION ===' as info;
SELECT 
    id,
    name,
    CASE 
        WHEN stream_url = 'webcam' THEN '✅ WEBCAM MODE'
        WHEN youtube_video_id IS NOT NULL THEN '✅ YOUTUBE MODE'
        ELSE '❌ NO MEDIA SET'
    END as media_status,
    youtube_video_id,
    stream_url
FROM tournaments 
WHERE id = 'eb888ca8-6871-4e33-964d-8ad778489cd5'; 