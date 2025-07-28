-- Fix Notifications and Points Display Issues (Safe Version)
-- This script fixes both notification messages and ensures proper point tracking
-- Handles existing objects gracefully

-- 1. Create user_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON user_notifications
    FOR INSERT WITH CHECK (true);

-- Enable realtime if not already enabled
ALTER TABLE user_notifications REPLICA IDENTITY FULL;

-- 3. Fix the notification function to show correct amounts
CREATE OR REPLACE FUNCTION create_betting_notification(
  user_uuid UUID,
  notification_type TEXT,
  bet_amount INTEGER,
  match_details JSONB
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  title_text TEXT;
  message_text TEXT;
  actual_winnings INTEGER;
  stream_points INTEGER;
BEGIN
  -- Extract actual winnings from match details
  actual_winnings := (match_details->>'potential_winnings')::INTEGER;
  stream_points := FLOOR((actual_winnings - bet_amount) * 0.5);
  
  -- Set title and message based on notification type
  CASE notification_type
    WHEN 'bet_won' THEN
      title_text := '🎉 Bet Won!';
      message_text := format('Congratulations! You won %s betting points + %s stream points!', 
                            actual_winnings, stream_points);
    WHEN 'bet_lost' THEN
      title_text := '😔 Bet Lost';
      message_text := format('Your bet of %s points was not successful this time.', bet_amount);
    WHEN 'bet_placed' THEN
      title_text := '✅ Bet Placed';
      message_text := format('Your bet of %s points has been placed successfully.', bet_amount);
    ELSE
      title_text := 'Betting Update';
      message_text := 'Your betting status has been updated.';
  END CASE;

  -- Insert notification
  INSERT INTO user_notifications (user_id, type, title, message, data, priority)
  VALUES (
    user_uuid,
    notification_type,
    title_text,
    message_text,
    jsonb_build_object(
      'bet_amount', bet_amount,
      'actual_winnings', actual_winnings,
      'stream_points_awarded', stream_points,
      'match_details', match_details,
      'timestamp', NOW()
    ),
    CASE WHEN notification_type = 'bet_won' THEN 'high' ELSE 'normal' END
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the trigger to pass correct data
CREATE OR REPLACE FUNCTION trigger_bet_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification when bet status changes
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'won' THEN
        PERFORM create_betting_notification(
          NEW.user_id,
          'bet_won',
          NEW.points_wagered, -- This is the bet amount for context
          jsonb_build_object(
            'match_id', NEW.match_id,
            'potential_winnings', NEW.potential_winnings, -- This is the actual winnings
            'bet_on_player_id', NEW.bet_on_player_id
          )
        );
      WHEN 'lost' THEN
        PERFORM create_betting_notification(
          NEW.user_id,
          'bet_lost',
          NEW.points_wagered,
          jsonb_build_object(
            'match_id', NEW.match_id,
            'bet_on_player_id', NEW.bet_on_player_id
          )
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop and recreate the trigger
DROP TRIGGER IF EXISTS bet_notifications_trigger ON user_bets;
CREATE TRIGGER bet_notifications_trigger
  AFTER UPDATE ON user_bets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bet_notifications();

-- 6. Ensure the get_user_points_balance function returns correct data
CREATE OR REPLACE FUNCTION get_user_points_balance(user_uuid UUID)
RETURNS TABLE (
    betting_points INTEGER,
    stream_points INTEGER,
    total_betting_points_earned INTEGER,
    total_stream_points_earned INTEGER,
    total_points_spent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(up.betting_points, 0) as betting_points,
        COALESCE(up.stream_points, 0) as stream_points,
        COALESCE(up.total_betting_points_earned, 0) as total_betting_points_earned,
        COALESCE(up.total_stream_points_earned, 0) as total_stream_points_earned,
        COALESCE(up.total_points_spent, 0) as total_points_spent
    FROM user_points up
    WHERE up.user_id = user_uuid;
    
    -- If no record exists, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to manually process existing bets and create notifications
CREATE OR REPLACE FUNCTION process_existing_bets_with_notifications()
RETURNS VOID AS $$
DECLARE
    bet_record RECORD;
BEGIN
    -- Process all won bets that don't have notifications yet
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.match_id,
            ub.points_wagered,
            ub.potential_winnings,
            ub.bet_on_player_id,
            ub.status
        FROM user_bets ub
        WHERE ub.status = 'won'
        AND NOT EXISTS (
            SELECT 1 FROM user_notifications un
            WHERE un.user_id = ub.user_id
            AND un.type = 'bet_won'
            AND (un.data->>'match_id')::UUID = ub.match_id
        )
    LOOP
        -- Create notification for this won bet
        PERFORM create_betting_notification(
            bet_record.user_id,
            'bet_won',
            bet_record.points_wagered,
            jsonb_build_object(
                'match_id', bet_record.match_id,
                'potential_winnings', bet_record.potential_winnings,
                'bet_on_player_id', bet_record.bet_on_player_id
            )
        );
        
        RAISE NOTICE 'Created notification for user % bet on match %', 
            bet_record.user_id, bet_record.match_id;
    END LOOP;
    
    RAISE NOTICE 'Processed existing bets with notifications';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions (safe - won't fail if already granted)
DO $$
BEGIN
    BEGIN
        GRANT EXECUTE ON FUNCTION create_betting_notification(UUID, TEXT, INTEGER, JSONB) TO authenticated;
    EXCEPTION WHEN OTHERS THEN
        -- Function might not exist yet, ignore
    END;
    
    BEGIN
        GRANT EXECUTE ON FUNCTION trigger_bet_notifications() TO authenticated;
    EXCEPTION WHEN OTHERS THEN
        -- Function might not exist yet, ignore
    END;
    
    BEGIN
        GRANT EXECUTE ON FUNCTION get_user_points_balance(UUID) TO authenticated;
    EXCEPTION WHEN OTHERS THEN
        -- Function might not exist yet, ignore
    END;
    
    BEGIN
        GRANT EXECUTE ON FUNCTION process_existing_bets_with_notifications() TO authenticated;
    EXCEPTION WHEN OTHERS THEN
        -- Function might not exist yet, ignore
    END;
    
    BEGIN
        GRANT SELECT, INSERT, UPDATE ON user_notifications TO authenticated;
    EXCEPTION WHEN OTHERS THEN
        -- Permissions might already exist, ignore
    END;
END $$;

-- 9. Success message
DO $$
BEGIN
    RAISE NOTICE 'Fixed notification system and points display!';
    RAISE NOTICE 'Notifications now show:';
    RAISE NOTICE '  - Correct betting points won (full potential winnings)';
    RAISE NOTICE '  - Correct stream points awarded (50%% of profit)';
    RAISE NOTICE 'Run SELECT process_existing_bets_with_notifications(); to create notifications for existing won bets.';
END $$; 