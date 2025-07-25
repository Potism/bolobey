-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'message' CHECK (message_type IN ('message', 'system', 'match_update')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read messages for tournaments they're participating in
CREATE POLICY "Users can read chat messages for tournaments they participate in" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournament_participants 
      WHERE tournament_participants.tournament_id = chat_messages.tournament_id 
      AND tournament_participants.user_id = auth.uid()
    )
  );

-- Users can insert messages for tournaments they're participating in
CREATE POLICY "Users can insert chat messages for tournaments they participate in" ON chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tournament_participants 
      WHERE tournament_participants.tournament_id = chat_messages.tournament_id 
      AND tournament_participants.user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own chat messages" ON chat_messages
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete their own chat messages" ON chat_messages
  FOR DELETE USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_tournament_id ON chat_messages(tournament_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages; 