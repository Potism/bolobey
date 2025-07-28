-- Fix Betting Points Issue
-- Ensure betting points are properly awarded and displayed

-- 1. First, let's check if the process_bet_payouts function is working correctly
-- The issue might be that betting points aren't being awarded properly

-- 2. Create a function to manually fix betting points for existing wins
CREATE OR REPLACE FUNCTION fix_betting_points_for_existing_wins()
RETURNS VOID AS $$
DECLARE
    bet_record RECORD;
    current_betting_balance INTEGER;
    new_betting_balance INTEGER;
BEGIN
    -- Process all won bets that might not have betting points awarded
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.match_id,
            ub.points_wagered,
            ub.potential_winnings,
            ub.bet_on_player_id,
            ub.status
        FROM user_bets ub
        WHERE ub.status = 'won'
        AND ub.potential_winnings > 0
    LOOP
        -- Get current betting balance
        SELECT COALESCE(betting_points, 0)
        INTO current_betting_balance
        FROM user_points 
        WHERE user_id = bet_record.user_id;
        
        new_betting_balance := current_betting_balance + bet_record.potential_winnings;
        
        -- Update user's betting points
        INSERT INTO user_points (user_id, betting_points, total_betting_points_earned)
        VALUES (bet_record.user_id, bet_record.potential_winnings, bet_record.potential_winnings)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            betting_points = user_points.betting_points + bet_record.potential_winnings,
            total_betting_points_earned = user_points.total_betting_points_earned + bet_record.potential_winnings,
            updated_at = NOW();
        
        -- Record the betting points transaction
        INSERT INTO point_transactions (
            user_id, transaction_type, points_amount, points_type,
            balance_before, balance_after, reference_id, reference_type, description
        ) VALUES (
            bet_record.user_id, 'bet_won', bet_record.potential_winnings, 'betting',
            current_betting_balance, new_betting_balance, bet_record.match_id, 'match', 
            'Won bet on match - awarded betting points (manual fix)'
        );
        
        RAISE NOTICE 'Fixed betting points for user %: awarded % betting points', 
            bet_record.user_id, bet_record.potential_winnings;
    END LOOP;
    
    RAISE NOTICE 'Fixed betting points for existing wins';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the get_user_points_balance function returns correct data
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

-- 4. Create a function to check and fix a specific user's points
CREATE OR REPLACE FUNCTION check_and_fix_user_points(target_user_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    betting_points INTEGER,
    stream_points INTEGER,
    total_betting_points_earned INTEGER,
    total_stream_points_earned INTEGER,
    total_points_spent INTEGER,
    status TEXT
) AS $$
DECLARE
    user_record RECORD;
    expected_betting_points INTEGER;
    expected_stream_points INTEGER;
BEGIN
    -- Get current user points
    SELECT * INTO user_record
    FROM user_points 
    WHERE user_points.user_id = target_user_uuid;
    
    -- Calculate expected points from won bets
    SELECT 
        COALESCE(SUM(potential_winnings), 0),
        COALESCE(SUM(FLOOR((potential_winnings - points_wagered) * 0.5)), 0)
    INTO expected_betting_points, expected_stream_points
    FROM user_bets 
    WHERE user_bets.user_id = target_user_uuid AND status = 'won';
    
    -- If user record doesn't exist, create it
    IF user_record IS NULL THEN
        INSERT INTO user_points (
            user_id, 
            betting_points, 
            stream_points, 
            total_betting_points_earned, 
            total_stream_points_earned,
            total_points_spent
        ) VALUES (
            target_user_uuid,
            expected_betting_points,
            expected_stream_points,
            expected_betting_points,
            expected_stream_points,
            0
        );
        
        RETURN QUERY SELECT 
            target_user_uuid,
            expected_betting_points,
            expected_stream_points,
            expected_betting_points,
            expected_stream_points,
            0,
            'Created new record'::TEXT;
    ELSE
        -- Check if points need to be updated
        IF user_record.betting_points != expected_betting_points OR user_record.stream_points != expected_stream_points THEN
            UPDATE user_points 
            SET 
                betting_points = expected_betting_points,
                stream_points = expected_stream_points,
                total_betting_points_earned = expected_betting_points,
                total_stream_points_earned = expected_stream_points,
                updated_at = NOW()
            WHERE user_points.user_id = target_user_uuid;
            
            RETURN QUERY SELECT 
                target_user_uuid,
                expected_betting_points,
                expected_stream_points,
                expected_betting_points,
                expected_stream_points,
                COALESCE(user_record.total_points_spent, 0),
                'Updated points'::TEXT;
        ELSE
            RETURN QUERY SELECT 
                user_record.user_id,
                user_record.betting_points,
                user_record.stream_points,
                user_record.total_betting_points_earned,
                user_record.total_stream_points_earned,
                user_record.total_points_spent,
                'Points are correct'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION fix_betting_points_for_existing_wins() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_fix_user_points(UUID) TO authenticated;

-- 6. Success message
DO $$
BEGIN
    RAISE NOTICE 'Betting points fix functions created!';
    RAISE NOTICE 'To fix all existing wins: SELECT fix_betting_points_for_existing_wins();';
    RAISE NOTICE 'To check/fix specific user: SELECT * FROM check_and_fix_user_points(''your-user-id'');';
END $$; 