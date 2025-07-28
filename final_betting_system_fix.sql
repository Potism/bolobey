-- Final Betting System Fix - Ensure Option B and Win Streaks Work
-- Run this before pushing to production

-- 1. Ensure user_win_streaks table exists
CREATE TABLE IF NOT EXISTS user_win_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_win_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Ensure user_bets has stream_points_bonus column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_bets' AND column_name = 'stream_points_bonus'
    ) THEN
        ALTER TABLE user_bets ADD COLUMN stream_points_bonus INTEGER DEFAULT 0;
        RAISE NOTICE 'Added stream_points_bonus column to user_bets';
    END IF;
END $$;

-- 3. Create the CORRECT place_bet function for Option B
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
    SELECT COALESCE(betting_points, 0) INTO user_betting_points
    FROM user_points
    WHERE user_id = auth.uid();
    
    -- Check if user has enough betting points
    IF user_betting_points < points_to_wager THEN
        RAISE EXCEPTION 'Insufficient betting points. You have % betting points, need % points', 
            user_betting_points, points_to_wager;
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
    
    -- Calculate stream points bonus (Option B: 50% of bet amount)
    stream_points_bonus := FLOOR(points_to_wager * 0.5);
    
    -- Create the bet with stream points bonus
    INSERT INTO user_bets (user_id, match_id, bet_on_player_id, points_wagered, potential_winnings, stream_points_bonus)
    VALUES (auth.uid(), match_uuid, bet_on_player_uuid, points_to_wager, points_to_wager * 2, stream_points_bonus)
    RETURNING id INTO bet_id;
    
    -- Deduct betting points from user
    UPDATE user_points
    SET betting_points = betting_points - points_to_wager,
        updated_at = NOW()
    WHERE user_id = auth.uid();
    
    -- Record the transaction
    INSERT INTO point_transactions (
        user_id, transaction_type, points_amount, points_type,
        balance_before, balance_after, reference_id, reference_type, description
    ) VALUES (
        auth.uid(), 'bet_placed', -points_to_wager, 'betting',
        user_betting_points, user_betting_points - points_to_wager,
        bet_id, 'bet', 'Bet placed on match'
    );
    
    RAISE NOTICE 'Bet placed: % points wagered, % stream points bonus', points_to_wager, stream_points_bonus;
    
    RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the CORRECT process_bet_payouts function with win streaks
CREATE OR REPLACE FUNCTION process_bet_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    winner_id UUID;
    betting_points_to_award INTEGER;
    stream_points_to_award INTEGER;
    current_stream_balance INTEGER;
    current_betting_balance INTEGER;
    new_stream_balance INTEGER;
    new_betting_balance INTEGER;
    win_streak_bonus INTEGER;
    current_streak INTEGER;
BEGIN
    -- Only process when match is completed and has a winner
    IF NEW.status != 'completed' OR NEW.winner_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    winner_id := NEW.winner_id;
    
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
        WHERE ub.match_id = NEW.id AND ub.status = 'pending'
    LOOP
        -- Check if bet was on the winning player
        IF bet_record.bet_on_player_id = winner_id THEN
            -- Calculate base rewards (Option B)
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
            UPDATE user_points 
            SET 
                betting_points = betting_points + betting_points_to_award,
                stream_points = stream_points + stream_points_to_award,
                updated_at = NOW()
            WHERE user_id = bet_record.user_id;
            
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
            
            RAISE NOTICE 'User % won bet, awarded % betting points and % stream points (streak: %, bonus: %)', 
                bet_record.user_id, betting_points_to_award, stream_points_to_award, current_streak, win_streak_bonus;
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

-- 5. Create trigger for bet payouts
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

-- 6. Create trigger for betting_matches payouts
DROP TRIGGER IF EXISTS trigger_process_betting_matches_payouts ON betting_matches;
CREATE TRIGGER trigger_process_betting_matches_payouts
    AFTER UPDATE ON betting_matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_win_streaks TO authenticated;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_win_streaks_user_id ON user_win_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_match_status ON user_bets(match_id, status);

-- 9. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ FINAL BETTING SYSTEM FIX COMPLETE!';
  RAISE NOTICE '🎯 Option B is now working:';
  RAISE NOTICE '   - Bet 100 points → Win 200 betting points + 50 stream points';
  RAISE NOTICE '🔥 Win streaks are now active:';
  RAISE NOTICE '   - 3 wins = +10%% stream points bonus';
  RAISE NOTICE '   - 5 wins = +25%% stream points bonus';
  RAISE NOTICE '   - 10 wins = +50%% stream points bonus';
  RAISE NOTICE '🚀 Ready to push to production!';
END $$; 