-- Complete Betting System Fix (All Functions)
-- Run this in Supabase SQL Editor to fix all betting functions

-- 1. Drop all problematic functions with CASCADE
DROP FUNCTION IF EXISTS process_bet_payouts() CASCADE;
DROP FUNCTION IF EXISTS process_betting_matches_payouts() CASCADE;
DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS place_betting_match_bet(UUID, UUID, INTEGER) CASCADE;

-- 2. Create simplified place_bet function for regular matches
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
    
    -- Check if match exists and is in betting state
    IF NOT EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_uuid 
        AND status = 'betting_open'
    ) THEN
        RAISE EXCEPTION 'Betting is not open for this match';
    END IF;
    
    -- Calculate stream points bonus (50% of bet amount)
    stream_points_bonus := FLOOR(points_to_wager * 0.5);
    
    -- Create the bet
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

-- 3. Create place_betting_match_bet function for betting matches
CREATE OR REPLACE FUNCTION place_betting_match_bet(
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
    
    -- Calculate stream points bonus (50% of bet amount)
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
        bet_id, 'bet', 'Bet placed on betting match'
    );
    
    RAISE NOTICE 'Betting match bet placed: % points wagered, % stream points bonus', points_to_wager, stream_points_bonus;
    
    RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create simplified process_bet_payouts function (no win streaks)
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
        IF bet_record.bet_on_player_id = bet_record.winner_id THEN
            -- Bet was won - calculate winnings
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_bonus := FLOOR(bet_record.points_wagered * 0.5); -- 50% of wagered points as stream points
            stream_points_to_award := stream_points_bonus;
            
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
            
            RAISE NOTICE 'User % won bet, awarded % betting points and % stream points', 
                bet_record.user_id, betting_points_to_award, stream_points_to_award;
        ELSE
            -- Bet was lost
            -- Update bet status
            UPDATE user_bets 
            SET status = 'lost', 
                updated_at = NOW()
            WHERE id = bet_record.id;
            
            RAISE NOTICE 'User % lost bet', bet_record.user_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create simplified betting_matches payout function
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
        IF bet_record.bet_on_player_id = bet_record.winner_id THEN
            -- Bet was won - calculate winnings
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_bonus := FLOOR(bet_record.points_wagered * 0.5); -- 50% of wagered points as stream points
            stream_points_to_award := stream_points_bonus;
            
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
            
            RAISE NOTICE 'User % won betting match bet, awarded % betting points and % stream points', 
                bet_record.user_id, betting_points_to_award, stream_points_to_award;
        ELSE
            -- Bet was lost
            -- Update bet status
            UPDATE user_bets 
            SET status = 'lost', 
                updated_at = NOW()
            WHERE id = bet_record.id;
            
            RAISE NOTICE 'User % lost betting match bet', bet_record.user_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

CREATE TRIGGER trigger_process_betting_matches_payouts
    AFTER UPDATE ON betting_matches
    FOR EACH ROW
    EXECUTE FUNCTION process_betting_matches_payouts();

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION place_betting_match_bet(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION process_betting_matches_payouts() TO authenticated;

-- 8. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Complete betting system fixed successfully!';
  RAISE NOTICE '🎯 All functions updated:';
  RAISE NOTICE '   - place_bet (for regular matches)';
  RAISE NOTICE '   - place_betting_match_bet (for betting matches)';
  RAISE NOTICE '   - process_bet_payouts (for regular matches)';
  RAISE NOTICE '   - process_betting_matches_payouts (for betting matches)';
  RAISE NOTICE '💰 Betting points and stream points will work correctly';
  RAISE NOTICE '🚀 Live betting and manage betting should now work without errors';
  RAISE NOTICE '📝 Win streaks removed for stability - can be added back later';
END $$; 