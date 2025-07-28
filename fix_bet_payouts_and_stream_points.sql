-- Enhanced Bet Payouts and Stream Points Award System
-- This script fixes notifications and implements dual rewards for winning bets

-- 1. Create enhanced function to process bet payouts when a match is completed
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
            -- 2. Stream points: 50% of the profit (not the total winnings)
            betting_points_to_award := bet_record.potential_winnings;
            stream_points_to_award := FLOOR((bet_record.potential_winnings - bet_record.points_wagered) * 0.5);
            
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

-- 2. Create trigger to automatically process payouts when match is completed
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;

CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.winner_id IS NOT NULL)
    EXECUTE FUNCTION process_bet_payouts();

-- 3. Fix the notification function to show actual winnings instead of bet amount
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

-- 4. Update the trigger to pass potential_winnings instead of points_wagered
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

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS bet_notifications_trigger ON user_bets;
CREATE TRIGGER bet_notifications_trigger
  AFTER UPDATE ON user_bets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bet_notifications();

-- 5. Create function to manually process payouts for existing completed matches
CREATE OR REPLACE FUNCTION process_existing_bet_payouts()
RETURNS VOID AS $$
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
    -- Process all completed matches that haven't had payouts processed
    FOR match_record IN 
        SELECT * FROM matches 
        WHERE status = 'completed' 
        AND winner_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM user_bets 
            WHERE match_id = matches.id 
            AND status = 'active'
        )
    LOOP
        winner_id := match_record.winner_id;
        
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
            WHERE ub.match_id = match_record.id AND ub.status = 'active'
        LOOP
            -- Check if bet was on the winning player
            IF bet_record.bet_on_player_id = winner_id THEN
                -- Calculate rewards:
                -- 1. Betting points: Full potential winnings (original bet + profit)
                -- 2. Stream points: 50% of the profit (not the total winnings)
                betting_points_to_award := bet_record.potential_winnings;
                stream_points_to_award := FLOOR((bet_record.potential_winnings - bet_record.points_wagered) * 0.5);
                
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
                    current_betting_balance, new_betting_balance, match_record.id, 'match', 
                    'Won bet on match - awarded betting points'
                );
                
                -- Record the stream points transaction
                INSERT INTO point_transactions (
                    user_id, transaction_type, points_amount, points_type,
                    balance_before, balance_after, reference_id, reference_type, description
                ) VALUES (
                    bet_record.user_id, 'bet_won', stream_points_to_award, 'stream',
                    current_stream_balance, new_stream_balance, match_record.id, 'match', 
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
    END LOOP;
    
    RAISE NOTICE 'Processed payouts for existing completed matches';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to check bet status and balance
CREATE OR REPLACE FUNCTION get_user_bet_summary(user_uuid UUID)
RETURNS TABLE (
    total_bets_placed INTEGER,
    total_bets_won INTEGER,
    total_bets_lost INTEGER,
    total_points_wagered INTEGER,
    total_betting_points_earned INTEGER,
    total_stream_points_earned INTEGER,
    win_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bets_placed,
        COUNT(*) FILTER (WHERE ub.status = 'won') as total_bets_won,
        COUNT(*) FILTER (WHERE ub.status = 'lost') as total_bets_lost,
        COALESCE(SUM(ub.points_wagered), 0) as total_points_wagered,
        COALESCE(SUM(
            CASE 
                WHEN ub.status = 'won' THEN ub.potential_winnings
                ELSE 0 
            END
        ), 0) as total_betting_points_earned,
        COALESCE(SUM(
            CASE 
                WHEN ub.status = 'won' THEN FLOOR((ub.potential_winnings - ub.points_wagered) * 0.5)
                ELSE 0 
            END
        ), 0) as total_stream_points_earned,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE ub.status = 'won')::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
            ELSE 0 
        END as win_rate
    FROM user_bets ub
    WHERE ub.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION process_existing_bet_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_bet_summary(UUID) TO authenticated;

-- 8. Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced bet payout system created successfully!';
    RAISE NOTICE 'Winners now receive:';
    RAISE NOTICE '  - Full potential winnings as betting points';
    RAISE NOTICE '  - 50%% of profit as stream points';
    RAISE NOTICE 'Notifications now show actual winnings instead of bet amount';
    RAISE NOTICE 'Run SELECT process_existing_bet_payouts(); to process existing completed matches.';
END $$; 