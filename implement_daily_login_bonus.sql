-- Daily Login Bonus System for Stream Points
-- This script implements a daily login reward system to increase user engagement

-- 1. Create daily login tracking table
CREATE TABLE IF NOT EXISTS user_daily_logins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stream_points_awarded INTEGER NOT NULL,
  streak_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, login_date)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_daily_logins_user_id ON user_daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_logins_date ON user_daily_logins(login_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_logins_streak ON user_daily_logins(user_id, streak_count);

-- 3. Enable Row Level Security
ALTER TABLE user_daily_logins ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "Users can read their own daily logins" ON user_daily_logins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create daily logins" ON user_daily_logins
  FOR INSERT WITH CHECK (true);

-- 5. Create function to award daily login bonus
CREATE OR REPLACE FUNCTION award_daily_login_bonus(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  last_login_date DATE;
  current_streak INTEGER;
  bonus_amount INTEGER;
  streak_bonus INTEGER;
  total_bonus INTEGER;
  result JSONB;
BEGIN
  -- Check if user already logged in today
  IF EXISTS (
    SELECT 1 FROM user_daily_logins 
    WHERE user_id = user_uuid AND login_date = current_date
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already claimed today''s login bonus',
      'bonus_amount', 0,
      'streak_count', 0
    );
  END IF;

  -- Get last login date and current streak
  SELECT 
    MAX(login_date),
    MAX(streak_count)
  INTO last_login_date, current_streak
  FROM user_daily_logins 
  WHERE user_id = user_uuid;

  -- Calculate new streak
  IF last_login_date IS NULL THEN
    -- First time login
    current_streak := 1;
  ELSIF last_login_date = current_date - INTERVAL '1 day' THEN
    -- Consecutive day
    current_streak := current_streak + 1;
  ELSE
    -- Streak broken
    current_streak := 1;
  END IF;

  -- Calculate bonus amount (5-10 base points)
  bonus_amount := 5 + floor(random() * 6);
  
  -- Calculate streak bonus
  streak_bonus := 0;
  IF current_streak >= 7 THEN
    streak_bonus := 25; -- 7-day streak bonus
  ELSIF current_streak >= 3 THEN
    streak_bonus := 10; -- 3-day streak bonus
  END IF;

  total_bonus := bonus_amount + streak_bonus;

  -- Record the daily login
  INSERT INTO user_daily_logins (user_id, login_date, stream_points_awarded, streak_count)
  VALUES (user_uuid, current_date, total_bonus, current_streak);

  -- Award stream points to user
  INSERT INTO user_points (user_id, stream_points, total_stream_points_earned)
  VALUES (user_uuid, total_bonus, total_bonus)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    stream_points = user_points.stream_points + total_bonus,
    total_stream_points_earned = user_points.total_stream_points_earned + total_bonus,
    updated_at = NOW();

  -- Record the transaction
  INSERT INTO point_transactions (
    user_id, transaction_type, points_amount, points_type,
    balance_before, balance_after, reference_id, reference_type, description
  ) VALUES (
    user_uuid, 'daily_login', total_bonus, 'stream',
    0, total_bonus, gen_random_uuid(), 'daily_login', 
    format('Daily login bonus (Day %s streak)', current_streak)
  );

  -- Create notification
  INSERT INTO user_notifications (user_id, type, title, message, data, priority)
  VALUES (
    user_uuid,
    'points_awarded',
    '🎁 Daily Login Bonus!',
    format('You earned %s stream points for logging in today! (Day %s streak)', total_bonus, current_streak),
    jsonb_build_object(
      'bonus_amount', total_bonus,
      'streak_count', current_streak,
      'base_bonus', bonus_amount,
      'streak_bonus', streak_bonus,
      'timestamp', NOW()
    ),
    'normal'
  );

  -- Return result
  result := jsonb_build_object(
    'success', true,
    'message', format('Daily login bonus awarded! Day %s streak', current_streak),
    'bonus_amount', total_bonus,
    'streak_count', current_streak,
    'base_bonus', bonus_amount,
    'streak_bonus', streak_bonus
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get user's login streak info
CREATE OR REPLACE FUNCTION get_user_login_streak(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  current_streak INTEGER;
  longest_streak INTEGER;
  total_logins INTEGER;
  last_login_date DATE;
  can_claim_today BOOLEAN;
BEGIN
  -- Get current streak
  SELECT MAX(streak_count) INTO current_streak
  FROM user_daily_logins 
  WHERE user_id = user_uuid;

  -- Get longest streak
  SELECT MAX(streak_count) INTO longest_streak
  FROM user_daily_logins 
  WHERE user_id = user_uuid;

  -- Get total logins
  SELECT COUNT(*) INTO total_logins
  FROM user_daily_logins 
  WHERE user_id = user_uuid;

  -- Get last login date
  SELECT MAX(login_date) INTO last_login_date
  FROM user_daily_logins 
  WHERE user_id = user_uuid;

  -- Check if can claim today
  can_claim_today := NOT EXISTS (
    SELECT 1 FROM user_daily_logins 
    WHERE user_id = user_uuid AND login_date = CURRENT_DATE
  );

  RETURN jsonb_build_object(
    'current_streak', COALESCE(current_streak, 0),
    'longest_streak', COALESCE(longest_streak, 0),
    'total_logins', COALESCE(total_logins, 0),
    'last_login_date', last_login_date,
    'can_claim_today', can_claim_today,
    'next_bonus_amount', CASE 
      WHEN COALESCE(current_streak, 0) >= 7 THEN 30 -- 5-10 base + 25 streak
      WHEN COALESCE(current_streak, 0) >= 3 THEN 15 -- 5-10 base + 10 streak
      ELSE 10 -- 5-10 base
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION award_daily_login_bonus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_login_streak(UUID) TO authenticated;

-- 8. Enable realtime for daily logins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_daily_logins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_daily_logins;
  END IF;
END $$;

-- 9. Success message
DO $$
BEGIN
  RAISE NOTICE 'Daily login bonus system created successfully!';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - 5-10 stream points per day';
  RAISE NOTICE '  - 3-day streak: +10 bonus points';
  RAISE NOTICE '  - 7-day streak: +25 bonus points';
  RAISE NOTICE '  - Automatic notifications';
  RAISE NOTICE '  - Streak tracking';
END $$; 