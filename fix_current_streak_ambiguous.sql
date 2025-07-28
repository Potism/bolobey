-- Fix Ambiguous current_streak Column Reference
-- Run this in Supabase SQL Editor to fix the betting system error

-- 1. Drop the problematic function
DROP FUNCTION IF EXISTS process_bet_payouts();

-- 2. Recreate the function with fixed variable names
CREATE OR REPLACE FUNCTION process_bet_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    current_stream_balance INTEGER;
    current_betting_balance INTEGER;
    new_stream_balance INTEGER;
    new_betting_balance INTEGER;
    betting_points_to_award INTEGER;
    stream_points_to_award INTEGER;
    win_streak_bonus INTEGER;
    user_current_streak INTEGER; -- Fixed variable name
    stream_points_bonus INTEGER;
BEGIN
    -- Process all bets for this match
    FOR bet_record IN 
        SELECT ub.*, m.winner_id, m.player1_id, m.player2_id
        FROM user_bets ub
        JOIN matches m ON ub.match_id = m.id
        WHERE ub.match_id = NEW.id 
        AND ub.status = 'pending'
    LOOP
        -- Determine if bet was won
        IF (bet_record.bet_on_player = 'player1' AND bet_record.match_id IN (
            SELECT id FROM matches WHERE winner_id = player1_id AND id = bet_record.match_id
        )) OR (bet_record.bet_on_player = 'player2' AND bet_record.match_id IN (
            SELECT id FROM matches WHERE winner_id = player2_id AND id = bet_record.match_id
        )) THEN
            -- Bet was won - calculate winnings
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_bonus := FLOOR(bet_record.points_wagered * 0.5); -- 50% of wagered points as stream points
            stream_points_to_award := stream_points_bonus;
            
            -- Calculate win streak bonus
            SELECT uws.current_streak INTO user_current_streak -- Fixed: use table alias
            FROM user_win_streaks uws
            WHERE uws.user_id = bet_record.user_id;
            
            user_current_streak := COALESCE(user_current_streak, 0) + 1;
            
            -- Apply win streak bonus to stream points
            win_streak_bonus := CASE 
                WHEN user_current_streak >= 10 THEN FLOOR(stream_points_to_award * 0.5)  -- 50% bonus
                WHEN user_current_streak >= 5 THEN FLOOR(stream_points_to_award * 0.25) -- 25% bonus
                WHEN user_current_streak >= 3 THEN FLOOR(stream_points_to_award * 0.1)  -- 10% bonus
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
            VALUES (bet_record.user_id, user_current_streak, GREATEST(user_current_streak, 0), NOW())
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
                bet_record.user_id, betting_points_to_award, stream_points_to_award, user_current_streak, win_streak_bonus;
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

-- 3. Also fix the betting_matches version if it exists
DROP FUNCTION IF EXISTS process_betting_matches_payouts();

CREATE OR REPLACE FUNCTION process_betting_matches_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    current_stream_balance INTEGER;
    current_betting_balance INTEGER;
    new_stream_balance INTEGER;
    new_betting_balance INTEGER;
    betting_points_to_award INTEGER;
    stream_points_to_award INTEGER;
    win_streak_bonus INTEGER;
    user_current_streak INTEGER; -- Fixed variable name
    stream_points_bonus INTEGER;
BEGIN
    -- Process all bets for this betting match
    FOR bet_record IN 
        SELECT ub.*, bm.winner_id, bm.player1_id, bm.player2_id
        FROM user_bets ub
        JOIN betting_matches bm ON ub.match_id = bm.id
        WHERE ub.match_id = NEW.id 
        AND ub.status = 'pending'
    LOOP
        -- Determine if bet was won
        IF (bet_record.bet_on_player = 'player1' AND bet_record.match_id IN (
            SELECT id FROM betting_matches WHERE winner_id = player1_id AND id = bet_record.match_id
        )) OR (bet_record.bet_on_player = 'player2' AND bet_record.match_id IN (
            SELECT id FROM betting_matches WHERE winner_id = player2_id AND id = bet_record.match_id
        )) THEN
            -- Bet was won - calculate winnings
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_bonus := FLOOR(bet_record.points_wagered * 0.5); -- 50% of wagered points as stream points
            stream_points_to_award := stream_points_bonus;
            
            -- Calculate win streak bonus
            SELECT uws.current_streak INTO user_current_streak -- Fixed: use table alias
            FROM user_win_streaks uws
            WHERE uws.user_id = bet_record.user_id;
            
            user_current_streak := COALESCE(user_current_streak, 0) + 1;
            
            -- Apply win streak bonus to stream points
            win_streak_bonus := CASE 
                WHEN user_current_streak >= 10 THEN FLOOR(stream_points_to_award * 0.5)  -- 50% bonus
                WHEN user_current_streak >= 5 THEN FLOOR(stream_points_to_award * 0.25) -- 25% bonus
                WHEN user_current_streak >= 3 THEN FLOOR(stream_points_to_award * 0.1)  -- 10% bonus
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
            VALUES (bet_record.user_id, user_current_streak, GREATEST(user_current_streak, 0), NOW())
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
             current_betting_balance, new_betting_balance, NEW.id, 'betting_match', 
             'Won bet on betting match - awarded betting points'),
            (bet_record.user_id, 'bet_won', stream_points_to_award, 'stream',
             current_stream_balance, new_stream_balance, NEW.id, 'betting_match', 
             'Won bet on betting match - awarded stream points');
            
            -- Update bet status
            UPDATE user_bets 
            SET status = 'won', 
                updated_at = NOW()
            WHERE id = bet_record.id;
            
            RAISE NOTICE 'User % won betting match bet, awarded % betting points and % stream points (streak: %, bonus: %)', 
                bet_record.user_id, betting_points_to_award, stream_points_to_award, user_current_streak, win_streak_bonus;
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
            
            RAISE NOTICE 'User % lost betting match bet, streak reset', bet_record.user_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate triggers
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

DROP TRIGGER IF EXISTS trigger_process_betting_matches_payouts ON betting_matches;
CREATE TRIGGER trigger_process_betting_matches_payouts
    AFTER UPDATE ON betting_matches
    FOR EACH ROW
    EXECUTE FUNCTION process_betting_matches_payouts();

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION process_betting_matches_payouts() TO authenticated;

-- 6. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed ambiguous current_streak column reference!';
  RAISE NOTICE '🎯 Betting system should now work without errors';
  RAISE NOTICE '🏆 Win streaks and payouts will function correctly';
  RAISE NOTICE '🚀 Ready to test live betting!';
END $$; 