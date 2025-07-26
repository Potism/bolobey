-- Enhanced Notification System for Betting Wins and Prize Approvals
-- SAFE VERSION - Checks for existing objects before creating
-- Run this in Supabase SQL Editor

-- 1. Create comprehensive notifications table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'bet_won',
    'bet_lost',
    'bet_placed',
    'prize_redemption',
    'prize_approved',
    'prize_shipped',
    'prize_delivered',
    'tournament_start',
    'tournament_end',
    'match_start',
    'match_result',
    'points_awarded',
    'achievement_unlocked',
    'system_announcement'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB, -- Store additional data like bet amounts, prize details, etc.
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_notifications_user_id') THEN
    CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_notifications_type') THEN
    CREATE INDEX idx_user_notifications_type ON user_notifications(type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_notifications_read') THEN
    CREATE INDEX idx_user_notifications_read ON user_notifications(read);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_notifications_created_at') THEN
    CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_notifications_priority') THEN
    CREATE INDEX idx_user_notifications_priority ON user_notifications(priority);
  END IF;
END $$;

-- 3. Enable Row Level Security (only if not already enabled)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies (only if they don't exist)
DO $$ 
BEGIN
  -- Users can read their own notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can read their own notifications') THEN
    CREATE POLICY "Users can read their own notifications" ON user_notifications
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- Users can update their own notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications" ON user_notifications
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- System can create notifications for users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'System can create notifications for users') THEN
    CREATE POLICY "System can create notifications for users" ON user_notifications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 5. Create notification functions (replace if they exist)
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
BEGIN
  CASE notification_type
    WHEN 'bet_won' THEN
      title_text := '🎉 Bet Won!';
      message_text := format('Congratulations! You won %s points on your bet!', bet_amount);
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

  INSERT INTO user_notifications (user_id, type, title, message, data, priority)
  VALUES (
    user_uuid,
    notification_type,
    title_text,
    message_text,
    jsonb_build_object(
      'bet_amount', bet_amount,
      'match_details', match_details,
      'timestamp', NOW()
    ),
    CASE WHEN notification_type = 'bet_won' THEN 'high' ELSE 'normal' END
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_prize_notification(
  user_uuid UUID,
  notification_type TEXT,
  prize_name TEXT,
  redemption_id UUID,
  additional_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  title_text TEXT;
  message_text TEXT;
BEGIN
  CASE notification_type
    WHEN 'prize_redemption' THEN
      title_text := '🎁 Prize Redemption';
      message_text := format('Your redemption for "%s" has been submitted and is under review.', prize_name);
    WHEN 'prize_approved' THEN
      title_text := '✅ Prize Approved!';
      message_text := format('Your redemption for "%s" has been approved and will be shipped soon!', prize_name);
    WHEN 'prize_shipped' THEN
      title_text := '📦 Prize Shipped!';
      message_text := format('Your "%s" has been shipped! Check your email for tracking details.', prize_name);
    WHEN 'prize_delivered' THEN
      title_text := '🎉 Prize Delivered!';
      message_text := format('Your "%s" has been delivered! Enjoy your prize!', prize_name);
    ELSE
      title_text := 'Prize Update';
      message_text := format('Update regarding your "%s" redemption.', prize_name);
  END CASE;

  INSERT INTO user_notifications (user_id, type, title, message, data, priority)
  VALUES (
    user_uuid,
    notification_type,
    title_text,
    message_text,
    jsonb_build_object(
      'prize_name', prize_name,
      'redemption_id', redemption_id,
      'timestamp', NOW()
    ) || additional_data,
    CASE
      WHEN notification_type IN ('prize_approved', 'prize_shipped', 'prize_delivered') THEN 'high'
      ELSE 'normal'
    END
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_notifications
  SET read = TRUE
  WHERE id = notification_uuid AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET read = TRUE
  WHERE user_id = auth.uid() AND read = FALSE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for automatic notifications (replace if they exist)
CREATE OR REPLACE FUNCTION trigger_bet_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'won' THEN
        PERFORM create_betting_notification(
          NEW.user_id,
          'bet_won',
          NEW.points_wagered,
          jsonb_build_object(
            'match_id', NEW.match_id,
            'potential_winnings', NEW.potential_winnings,
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

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS bet_notifications_trigger ON user_bets;
CREATE TRIGGER bet_notifications_trigger
  AFTER UPDATE ON user_bets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bet_notifications();

CREATE OR REPLACE FUNCTION trigger_prize_notifications()
RETURNS TRIGGER AS $$
DECLARE
  prize_name TEXT;
BEGIN
  SELECT name INTO prize_name FROM prizes WHERE id = NEW.prize_id;

  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'approved' THEN
        PERFORM create_prize_notification(
          NEW.user_id,
          'prize_approved',
          prize_name,
          NEW.id,
          jsonb_build_object('admin_notes', NEW.admin_notes)
        );
      WHEN 'shipped' THEN
        PERFORM create_prize_notification(
          NEW.user_id,
          'prize_shipped',
          prize_name,
          NEW.id,
          jsonb_build_object('tracking_number', NEW.tracking_number)
        );
      WHEN 'delivered' THEN
        PERFORM create_prize_notification(
          NEW.user_id,
          'prize_delivered',
          prize_name,
          NEW.id
        );
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS prize_notifications_trigger ON prize_redemptions;
CREATE TRIGGER prize_notifications_trigger
  AFTER UPDATE ON prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_prize_notifications();

-- 7. Enable realtime for notifications (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
  END IF;
END $$;

-- 8. Create view for unread notification count (replace if exists)
DROP VIEW IF EXISTS user_unread_notifications_count;
CREATE VIEW user_unread_notifications_count AS
SELECT
  user_id,
  COUNT(*) as unread_count,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count
FROM user_notifications
WHERE read = FALSE
GROUP BY user_id;

-- Success message
SELECT 'Enhanced notification system setup completed successfully!' as status; 