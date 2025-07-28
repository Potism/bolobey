-- Fix Betting Payout Functions
-- Ensures all functions use correct field names

-- 1. Drop and recreate the betting_matches payout function
DROP FUNCTION IF EXISTS process_betting_matches_payouts() CASCADE;

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
        -- Determine if bet was won (using bet_on_player_id)
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

-- 2. Drop and recreate the regular matches payout function
DROP FUNCTION IF EXISTS process_bet_payouts() CASCADE;

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
        -- Determine if bet was won (using bet_on_player_id)
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
            
            RAISE NOTICE 'User % won match bet, awarded % betting points and % stream points', 
                bet_record.user_id, betting_points_to_award, stream_points_to_award;
        ELSE
            -- Bet was lost
            -- Update bet status
            UPDATE user_bets 
            SET status = 'lost', 
                updated_at = NOW()
            WHERE id = bet_record.id;
            
            RAISE NOTICE 'User % lost match bet', bet_record.user_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate triggers
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

CREATE TRIGGER trigger_process_betting_matches_payouts
    AFTER UPDATE ON betting_matches
    FOR EACH ROW
    EXECUTE FUNCTION process_betting_matches_payouts();

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION process_betting_matches_payouts() TO authenticated;

-- 5. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Betting payout functions fixed!';
  RAISE NOTICE '✅ All functions now use bet_on_player_id correctly';
  RAISE NOTICE '✅ Triggers recreated successfully';
  RAISE NOTICE '✅ Ready to process payouts without errors';
END $$; 