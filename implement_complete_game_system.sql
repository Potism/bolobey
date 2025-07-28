-- Complete Game System Implementation
-- This implements the betting flow, win streaks, tournaments, challenges, and risk/reward system

-- 1. Create tables for new game mechanics

-- Win streak tracking
CREATE TABLE IF NOT EXISTS user_win_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_win_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Daily/Weekly challenges
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'achievement'
    requirement_type VARCHAR(50) NOT NULL, -- 'win_bets', 'place_bets', 'tournament_participation'
    requirement_count INTEGER NOT NULL,
    stream_points_reward INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    progress_count INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- Tournament bonuses tracking
CREATE TABLE IF NOT EXISTS tournament_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    bonus_type VARCHAR(50) NOT NULL, -- 'winner', 'runner_up', 'participation'
    stream_points_awarded INTEGER NOT NULL,
    awarded_at TIMESTAMP DEFAULT NOW()
);

-- 2. Insert default challenges
INSERT INTO challenges (name, description, challenge_type, requirement_type, requirement_count, stream_points_reward) VALUES
-- Daily challenges
('Daily Winner', 'Win 5 bets today', 'daily', 'win_bets', 5, 100),
('Daily Bettor', 'Place 10 bets today', 'daily', 'place_bets', 10, 50),
('Daily Streak', 'Win 3 bets in a row today', 'daily', 'win_streak', 3, 150),

-- Weekly challenges  
('Weekly Champion', 'Win 25 bets this week', 'weekly', 'win_bets', 25, 500),
('Weekly Gambler', 'Place 50 bets this week', 'weekly', 'place_bets', 50, 200),
('Weekly Streak Master', 'Win 10 bets in a row this week', 'weekly', 'win_streak', 10, 1000),

-- Achievement challenges
('First Win', 'Win your first bet', 'achievement', 'win_bets', 1, 50),
('Betting Beginner', 'Place 10 bets total', 'achievement', 'place_bets', 10, 100),
('Betting Pro', 'Place 100 bets total', 'achievement', 'place_bets', 100, 500),
('Win Streak Legend', 'Win 20 bets in a row', 'achievement', 'win_streak', 20, 2000);

-- 3. Enhanced place_bet function with risk/reward system
CREATE OR REPLACE FUNCTION place_bet(
  match_uuid UUID,
  bet_on_player_uuid UUID,
  points_to_wager INTEGER
)
RETURNS UUID AS $$
DECLARE
  bet_id UUID;
  user_betting_points INTEGER;
  stream_points_bonus INTEGER;
BEGIN
  -- Get user's betting points balance
  SELECT betting_points INTO user_betting_points
  FROM user_points
  WHERE user_id = auth.uid();
  
  -- Check if user has enough betting points
  IF user_betting_points IS NULL OR user_betting_points < points_to_wager THEN
    RAISE EXCEPTION 'Insufficient betting points. You have % betting points, need % points', 
      COALESCE(user_betting_points, 0), points_to_wager;
  END IF;
  
  -- Check if betting is still open
  IF NOT EXISTS (
    SELECT 1 FROM betting_matches 
    WHERE id = match_uuid 
    AND status = 'betting_open'
    AND NOW() BETWEEN betting_start_time AND betting_end_time
  ) THEN
    RAISE EXCEPTION 'Betting is not open for this match';
  END IF;
  
  -- Calculate stream points bonus based on bet amount (Risk/Reward)
  stream_points_bonus := CASE 
    WHEN points_to_wager >= 1000 THEN 350
    WHEN points_to_wager >= 500 THEN 150
    WHEN points_to_wager >= 100 THEN 50
    ELSE 25
  END;
  
  -- Create the bet with stream points bonus
  INSERT INTO user_bets (user_id, match_id, bet_on_player_id, points_wagered, potential_winnings, stream_points_bonus)
  VALUES (auth.uid(), match_uuid, bet_on_player_uuid, points_to_wager, points_to_wager * 2, stream_points_bonus)
  RETURNING id INTO bet_id;
  
  -- Deduct betting points from user
  PERFORM spend_betting_points(
    auth.uid(), 
    points_to_wager, 
    bet_id, 
    'bet', 
    'Bet placed on match'
  );
  
  -- Update daily challenge progress
  PERFORM update_challenge_progress(auth.uid(), 'place_bets', 1);
  
  RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enhanced process_bet_payouts with win streaks and bonuses
CREATE OR REPLACE FUNCTION process_bet_payouts()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    bet_record RECORD;
    winner_id UUID;
    stream_points_to_award INTEGER;
    betting_points_to_award INTEGER;
    current_stream_balance INTEGER;
    current_betting_balance INTEGER;
    new_stream_balance INTEGER;
    new_betting_balance INTEGER;
    win_streak_bonus INTEGER;
    current_streak INTEGER;
BEGIN
    -- Get match details from trigger context
    match_record := NEW;
    winner_id := NEW.winner_id;
    
    -- Check if match is completed and has a winner
    IF match_record.status != 'completed' OR match_record.winner_id IS NULL THEN
        RAISE NOTICE 'Match % is not completed or has no winner', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Process all bets for this match
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.bet_on_player_id,
            ub.points_wagered,
            ub.potential_winnings,
            ub.stream_points_bonus,
            ub.status
        FROM user_bets ub
        WHERE ub.match_id = NEW.id AND ub.status = 'active'
    LOOP
        -- Check if bet was on the winning player
        IF bet_record.bet_on_player_id = winner_id THEN
            -- Calculate base rewards
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_to_award := bet_record.stream_points_bonus;
            
            -- Calculate win streak bonus
            SELECT current_streak INTO current_streak
            FROM user_win_streaks
            WHERE user_id = bet_record.user_id;
            
            current_streak := COALESCE(current_streak, 0) + 1;
            
            -- Apply win streak bonus to stream points
            win_streak_bonus := CASE 
                WHEN current_streak >= 10 THEN FLOOR(stream_points_to_award * 0.5)  -- 50% bonus
                WHEN current_streak >= 5 THEN FLOOR(stream_points_to_award * 0.25) -- 25% bonus
                WHEN current_streak >= 3 THEN FLOOR(stream_points_to_award * 0.1)  -- 10% bonus
                ELSE 0
            END;
            
            stream_points_to_award := stream_points_to_award + win_streak_bonus;
            
            -- Get current balances
            SELECT 
                COALESCE(stream_points, 0),
                COALESCE(betting_points, 0)
            INTO current_stream_balance, current_betting_balance
            FROM user_points 
            WHERE user_id = bet_record.user_id;
            
            new_stream_balance := current_stream_balance + stream_points_to_award;
            new_betting_balance := current_betting_balance + betting_points_to_award;
            
            -- Update user's points
            INSERT INTO user_points (user_id, betting_points, stream_points, total_betting_points_earned, total_stream_points_earned)
            VALUES (bet_record.user_id, betting_points_to_award, stream_points_to_award, betting_points_to_award, stream_points_to_award)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                betting_points = user_points.betting_points + betting_points_to_award,
                stream_points = user_points.stream_points + stream_points_to_award,
                total_betting_points_earned = user_points.total_betting_points_earned + betting_points_to_award,
                total_stream_points_earned = user_points.total_stream_points_earned + stream_points_to_award,
                updated_at = NOW();
            
            -- Update win streak
            INSERT INTO user_win_streaks (user_id, current_streak, longest_streak, last_win_date)
            VALUES (bet_record.user_id, current_streak, GREATEST(current_streak, 0), NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                current_streak = EXCLUDED.current_streak,
                longest_streak = GREATEST(user_win_streaks.longest_streak, EXCLUDED.current_streak),
                last_win_date = EXCLUDED.last_win_date,
                updated_at = NOW();
            
            -- Record transactions
            INSERT INTO point_transactions (
                user_id, transaction_type, points_amount, points_type,
                balance_before, balance_after, reference_id, reference_type, description
            ) VALUES 
            (bet_record.user_id, 'bet_won', betting_points_to_award, 'betting',
             current_betting_balance, new_betting_balance, NEW.id, 'match', 
             'Won bet on match - awarded betting points'),
            (bet_record.user_id, 'bet_won', stream_points_to_award, 'stream',
             current_stream_balance, new_stream_balance, NEW.id, 'match', 
             'Won bet on match - awarded stream points');
            
            -- Update bet status
            UPDATE user_bets 
            SET status = 'won', 
                updated_at = NOW()
            WHERE id = bet_record.id;
            
            -- Update challenge progress
            PERFORM update_challenge_progress(bet_record.user_id, 'win_bets', 1);
            PERFORM update_challenge_progress(bet_record.user_id, 'win_streak', current_streak);
            
            RAISE NOTICE 'User % won bet, awarded % betting points and % stream points (streak: %)', 
                bet_record.user_id, betting_points_to_award, stream_points_to_award, current_streak;
        ELSE
            -- Bet was lost - reset win streak
            UPDATE user_win_streaks 
            SET current_streak = 0, updated_at = NOW()
            WHERE user_id = bet_record.user_id;
            
            -- Update bet status
            UPDATE user_bets 
            SET status = 'lost', 
                updated_at = NOW()
            WHERE id = bet_record.id;
            
            RAISE NOTICE 'User % lost bet, streak reset', bet_record.user_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(
    user_uuid UUID,
    challenge_type VARCHAR(50),
    progress_amount INTEGER
)
RETURNS VOID AS $$
DECLARE
    challenge_record RECORD;
    current_progress INTEGER;
BEGIN
    -- Update progress for all active challenges of this type
    FOR challenge_record IN 
        SELECT c.id, c.requirement_count
        FROM challenges c
        WHERE c.is_active = TRUE 
        AND c.requirement_type = challenge_type
    LOOP
        -- Get current progress
        SELECT progress_count INTO current_progress
        FROM user_challenge_progress
        WHERE user_id = user_uuid AND challenge_id = challenge_record.id;
        
        current_progress := COALESCE(current_progress, 0) + progress_amount;
        
        -- Update or insert progress
        INSERT INTO user_challenge_progress (user_id, challenge_id, progress_count, is_completed)
        VALUES (user_uuid, challenge_record.id, current_progress, current_progress >= challenge_record.requirement_count)
        ON CONFLICT (user_id, challenge_id) 
        DO UPDATE SET 
            progress_count = EXCLUDED.progress_count,
            is_completed = EXCLUDED.is_completed,
            completed_at = CASE WHEN EXCLUDED.is_completed AND NOT user_challenge_progress.is_completed 
                               THEN NOW() ELSE user_challenge_progress.completed_at END;
        
        -- Award stream points if challenge completed
        IF current_progress >= challenge_record.requirement_count AND 
           NOT EXISTS (SELECT 1 FROM user_challenge_progress 
                      WHERE user_id = user_uuid AND challenge_id = challenge_record.id AND is_completed = TRUE) THEN
            
            -- Award stream points
            UPDATE user_points 
            SET stream_points = stream_points + challenge_record.stream_points_reward,
                total_stream_points_earned = total_stream_points_earned + challenge_record.stream_points_reward,
                updated_at = NOW()
            WHERE user_id = user_uuid;
            
            -- Record transaction
            INSERT INTO point_transactions (
                user_id, transaction_type, points_amount, points_type,
                reference_type, description
            ) VALUES (
                user_uuid, 'challenge_completed', challenge_record.stream_points_reward, 'stream',
                'challenge', 'Completed challenge: ' || challenge_record.name
            );
            
            RAISE NOTICE 'User % completed challenge % and earned % stream points', 
                user_uuid, challenge_record.name, challenge_record.stream_points_reward;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to award tournament bonuses
CREATE OR REPLACE FUNCTION award_tournament_bonus(
    tournament_uuid UUID,
    user_uuid UUID,
    bonus_type VARCHAR(50)
)
RETURNS VOID AS $$
DECLARE
    stream_points_award INTEGER;
BEGIN
    -- Determine bonus amount based on type
    stream_points_award := CASE bonus_type
        WHEN 'winner' THEN 500
        WHEN 'runner_up' THEN 250
        WHEN 'participation' THEN 50
        ELSE 0
    END;
    
    IF stream_points_award > 0 THEN
        -- Award stream points
        UPDATE user_points 
        SET stream_points = stream_points + stream_points_award,
            total_stream_points_earned = total_stream_points_earned + stream_points_award,
            updated_at = NOW()
        WHERE user_id = user_uuid;
        
        -- Record bonus
        INSERT INTO tournament_bonuses (user_id, tournament_id, bonus_type, stream_points_awarded)
        VALUES (user_uuid, tournament_uuid, bonus_type, stream_points_award);
        
        -- Record transaction
        INSERT INTO point_transactions (
            user_id, transaction_type, points_amount, points_type,
            reference_id, reference_type, description
        ) VALUES (
            user_uuid, 'tournament_bonus', stream_points_award, 'stream',
            tournament_uuid, 'tournament', 'Tournament bonus: ' || bonus_type
        );
        
        RAISE NOTICE 'User % awarded % stream points for tournament % bonus', 
            user_uuid, stream_points_award, bonus_type;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_win_streaks_user_id ON user_win_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user_id ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_bonuses_user_id ON tournament_bonuses(user_id);

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION update_challenge_progress(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION award_tournament_bonus(UUID, UUID, VARCHAR) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON user_win_streaks TO authenticated;
GRANT SELECT ON challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_challenge_progress TO authenticated;
GRANT SELECT ON tournament_bonuses TO authenticated;

-- 9. Success message
DO $$
BEGIN
  RAISE NOTICE 'Complete game system implemented!';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '- Enhanced betting with risk/reward system';
  RAISE NOTICE '- Win streak bonuses (3/5/10 wins)';
  RAISE NOTICE '- Daily/Weekly challenges';
  RAISE NOTICE '- Tournament bonuses';
  RAISE NOTICE '- Achievement system';
  RAISE NOTICE 'Ready for game guide creation!';
END $$; 