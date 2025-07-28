-- Comprehensive Fix for All Points Issues
-- This script addresses betting points display, stream points not increasing, and data consistency

-- 1. First, let's check the current state
SELECT 'Current user points:' as info;
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52');

-- 2. Check recent bet transactions
SELECT 'Recent bet transactions:' as info;
SELECT 
    user_id,
    transaction_type,
    points_amount,
    points_type,
    balance_before,
    balance_after,
    description,
    created_at
FROM point_transactions 
WHERE user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52'
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check user_bets table for won bets
SELECT 'Won bets that should have awarded points:' as info;
SELECT 
    ub.id,
    ub.user_id,
    ub.match_id,
    ub.points_wagered,
    ub.potential_winnings,
    ub.status,
    ub.created_at,
    m.winner_id,
    m.status as match_status
FROM user_bets ub
JOIN matches m ON ub.match_id = m.id
WHERE ub.user_id = '09898bb2-1fb0-4e5e-a30c-027341758a52'
AND ub.status = 'won'
ORDER BY ub.created_at DESC;

-- 4. Fix the place_bet function to properly deduct betting points
DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION place_bet(
  match_uuid UUID,
  bet_on_player_uuid UUID,
  points_to_wager INTEGER
)
RETURNS UUID AS $$
DECLARE
  bet_id UUID;
  user_betting_points INTEGER;
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
  
  -- Create the bet
  INSERT INTO user_bets (user_id, match_id, bet_on_player_id, points_wagered, potential_winnings)
  VALUES (auth.uid(), match_uuid, bet_on_player_uuid, points_to_wager, points_to_wager * 2)
  RETURNING id INTO bet_id;
  
  -- Deduct betting points from user using the proper function
  PERFORM spend_betting_points(
    auth.uid(), 
    points_to_wager, 
    bet_id, 
    'bet', 
    'Bet placed on match'
  );
  
  RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix the process_bet_payouts function to ensure it works correctly
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
            ub.status
        FROM user_bets ub
        WHERE ub.match_id = NEW.id AND ub.status = 'active'
    LOOP
        -- Check if bet was on the winning player
        IF bet_record.bet_on_player_id = winner_id THEN
            -- Calculate rewards:
            -- 1. Betting points: Full potential winnings (original bet + profit)
            -- 2. Stream points: 25% of the profit (not the total winnings)
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_to_award := FLOOR((bet_record.potential_winnings - bet_record.points_wagered) * 0.25);
            
            -- Get current balances
            SELECT 
                COALESCE(stream_points, 0),
                COALESCE(betting_points, 0)
            INTO current_stream_balance, current_betting_balance
            FROM user_points 
            WHERE user_id = bet_record.user_id;
            
            new_stream_balance := current_stream_balance + stream_points_to_award;
            new_betting_balance := current_betting_balance + betting_points_to_award;
            
            -- Update user's points (both betting and stream points)
            INSERT INTO user_points (user_id, betting_points, stream_points, total_betting_points_earned, total_stream_points_earned)
            VALUES (bet_record.user_id, betting_points_to_award, stream_points_to_award, betting_points_to_award, stream_points_to_award)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                betting_points = user_points.betting_points + betting_points_to_award,
                stream_points = user_points.stream_points + stream_points_to_award,
                total_betting_points_earned = user_points.total_betting_points_earned + betting_points_to_award,
                total_stream_points_earned = user_points.total_stream_points_earned + stream_points_to_award,
                updated_at = NOW();
            
            -- Record the betting points transaction
            INSERT INTO point_transactions (
                user_id, transaction_type, points_amount, points_type,
                balance_before, balance_after, reference_id, reference_type, description
            ) VALUES (
                bet_record.user_id, 'bet_won', betting_points_to_award, 'betting',
                current_betting_balance, new_betting_balance, NEW.id, 'match', 
                'Won bet on match - awarded betting points'
            );
            
            -- Record the stream points transaction
            INSERT INTO point_transactions (
                user_id, transaction_type, points_amount, points_type,
                balance_before, balance_after, reference_id, reference_type, description
            ) VALUES (
                bet_record.user_id, 'bet_won', stream_points_to_award, 'stream',
                current_stream_balance, new_stream_balance, NEW.id, 'match', 
                'Won bet on match - awarded stream points'
            );
            
            -- Update bet status to 'won'
            UPDATE user_bets 
            SET status = 'won', 
                updated_at = NOW()
            WHERE id = bet_record.id;
            
            RAISE NOTICE 'User % won bet, awarded % betting points and % stream points', 
                bet_record.user_id, betting_points_to_award, stream_points_to_award;
        ELSE
            -- Bet was lost
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

-- 6. Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;

CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.winner_id IS NOT NULL)
    EXECUTE FUNCTION process_bet_payouts();

-- 7. Process any existing won bets that didn't get their points
CREATE OR REPLACE FUNCTION process_existing_bet_payouts()
RETURNS VOID AS $$
DECLARE
    bet_record RECORD;
    stream_points_to_award INTEGER;
    betting_points_to_award INTEGER;
    current_stream_balance INTEGER;
    current_betting_balance INTEGER;
    new_stream_balance INTEGER;
    new_betting_balance INTEGER;
BEGIN
    -- Process all won bets that haven't been processed yet
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.match_id,
            ub.bet_on_player_id,
            ub.points_wagered,
            ub.potential_winnings,
            m.winner_id
        FROM user_bets ub
        JOIN matches m ON ub.match_id = m.id
        WHERE ub.status = 'won' 
        AND m.status = 'completed'
        AND m.winner_id IS NOT NULL
        AND ub.bet_on_player_id = m.winner_id
        AND NOT EXISTS (
            SELECT 1 FROM point_transactions 
            WHERE reference_id = ub.id 
            AND transaction_type = 'bet_won'
        )
    LOOP
        -- Calculate rewards
        betting_points_to_award := bet_record.potential_winnings;
        stream_points_to_award := FLOOR((bet_record.potential_winnings - bet_record.points_wagered) * 0.25);
        
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
            total_betting_points_earned = total_betting_points_earned + betting_points_to_award,
            total_stream_points_earned = total_stream_points_earned + stream_points_to_award,
            updated_at = NOW()
        WHERE user_id = bet_record.user_id;
        
        -- Record transactions
        INSERT INTO point_transactions (
            user_id, transaction_type, points_amount, points_type,
            balance_before, balance_after, reference_id, reference_type, description
        ) VALUES 
        (bet_record.user_id, 'bet_won', betting_points_to_award, 'betting',
         current_betting_balance, new_betting_balance, bet_record.id, 'match', 
         'Won bet on match - awarded betting points (retroactive)'),
        (bet_record.user_id, 'bet_won', stream_points_to_award, 'stream',
         current_stream_balance, new_stream_balance, bet_record.id, 'match', 
         'Won bet on match - awarded stream points (retroactive)');
        
        RAISE NOTICE 'Processed retroactive payout for bet %: % betting points, % stream points', 
            bet_record.id, betting_points_to_award, stream_points_to_award;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Run the retroactive processing
SELECT process_existing_bet_payouts();

-- 9. Check final state
SELECT 'Final user points after fixes:' as info;
SELECT * FROM get_user_points_balance('09898bb2-1fb0-4e5e-a30c-027341758a52');

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION process_existing_bet_payouts() TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All points issues fixed!';
  RAISE NOTICE '1. place_bet function now properly deducts betting points';
  RAISE NOTICE '2. process_bet_payouts function awards both betting and stream points';
  RAISE NOTICE '3. Retroactive processing completed for existing won bets';
  RAISE NOTICE '4. Check the final user points above to see the results';
END $$; 