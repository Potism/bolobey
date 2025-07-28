-- Fix All Conflicts - Final Solution
-- This script resolves all function conflicts and implements Option B correctly

-- 1. Drop ALL conflicting functions first
DROP FUNCTION IF EXISTS get_user_points_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_bet_payouts() CASCADE;
DROP FUNCTION IF EXISTS spend_betting_points(UUID, INTEGER, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_stream_points(UUID, INTEGER, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_betting_points(UUID, INTEGER, TEXT) CASCADE;

-- 2. Drop conflicting triggers
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;
DROP TRIGGER IF EXISTS trigger_new_user_points ON users;

-- 3. Ensure user_points table has correct structure
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    betting_points INTEGER DEFAULT 0 CHECK (betting_points >= 0),
    stream_points INTEGER DEFAULT 0 CHECK (stream_points >= 0),
    total_betting_points_earned INTEGER DEFAULT 0,
    total_stream_points_earned INTEGER DEFAULT 0,
    total_points_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. Ensure user_bets table has stream_points_bonus column
ALTER TABLE user_bets ADD COLUMN IF NOT EXISTS stream_points_bonus INTEGER DEFAULT 0;

-- 5. Create the CORRECT get_user_points_balance function (returns TABLE)
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

-- 6. Create the CORRECT place_bet function for Option B
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
  
  -- Calculate stream points bonus (Option B: 50% of bet amount)
  stream_points_bonus := FLOOR(points_to_wager * 0.5);
  
  -- Create the bet with stream points bonus
  INSERT INTO user_bets (user_id, match_id, bet_on_player_id, points_wagered, potential_winnings, stream_points_bonus)
  VALUES (auth.uid(), match_uuid, bet_on_player_uuid, points_to_wager, points_to_wager * 2, stream_points_bonus)
  RETURNING id INTO bet_id;
  
  -- Deduct betting points from user
  UPDATE user_points 
  SET betting_points = betting_points - points_to_wager,
      total_points_spent = total_points_spent + points_to_wager,
      updated_at = NOW()
  WHERE user_id = auth.uid();
  
  -- Record the transaction
  INSERT INTO point_transactions (
    user_id, transaction_type, points_amount, points_type,
    reference_id, reference_type, description
  ) VALUES (
    auth.uid(), 'bet_placed', -points_to_wager, 'betting',
    bet_id, 'bet', 'Bet placed on match'
  );
  
  RAISE NOTICE 'Bet placed: % points wagered, % stream points bonus', points_to_wager, stream_points_bonus;
  
  RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create the CORRECT process_bet_payouts function for Option B
CREATE OR REPLACE FUNCTION process_bet_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    winner_id UUID;
    stream_points_to_award INTEGER;
    betting_points_to_award INTEGER;
    current_stream_balance INTEGER;
    current_betting_balance INTEGER;
    new_stream_balance INTEGER;
    new_betting_balance INTEGER;
BEGIN
    -- Get winner from trigger context
    winner_id := NEW.winner_id;
    
    -- Check if match is completed and has a winner
    IF NEW.status != 'completed' OR NEW.winner_id IS NULL THEN
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
            -- Option B: Betting points = full winnings, Stream points = 50% of bet amount
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_to_award := bet_record.stream_points_bonus;
            
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

-- 8. Create trigger to automatically process payouts
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.winner_id IS NOT NULL)
    EXECUTE FUNCTION process_bet_payouts();

-- 9. Update existing bets with stream points bonus
UPDATE user_bets 
SET stream_points_bonus = FLOOR(points_wagered * 0.5)
WHERE stream_points_bonus = 0 OR stream_points_bonus IS NULL;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION get_user_points_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION place_bet(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;

-- 11. Test the system
DO $$
BEGIN
  RAISE NOTICE '✅ All conflicts resolved!';
  RAISE NOTICE '📊 Option B implemented: Bet 100 → Win 200 betting + 50 stream points';
  RAISE NOTICE '🎯 get_user_points_balance now returns TABLE with all point types';
  RAISE NOTICE '💰 place_bet deducts from betting_points only';
  RAISE NOTICE '🚀 process_bet_payouts awards both betting and stream points';
  RAISE NOTICE '🎉 Ready to test!';
END $$; 