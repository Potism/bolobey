-- Check if chat_messages table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'chat_messages'
);

-- Check table structure if it exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND table_schema = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'chat_messages';

-- Check if realtime is enabled
SELECT * FROM pg_publication_tables WHERE tablename = 'chat_messages'; 