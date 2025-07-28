-- Fix Betting Matches Integration with New Points System
-- This script makes the old betting_matches table work with the new user_points system

-- 1. First, let's check if betting_matches table exists and has data
DO $$
DECLARE
    betting_matches_count INTEGER;
    user_bets_count INTEGER;
BEGIN
    RAISE NOTICE '=== CHECKING BETTING SYSTEM STATE ===';
    
    -- Check betting_matches table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'betting_matches') THEN
        SELECT COUNT(*) INTO betting_matches_count FROM betting_matches;
        RAISE NOTICE 'betting_matches table EXISTS with % records', betting_matches_count;
    ELSE
        RAISE NOTICE 'betting_matches table DOES NOT EXIST';
    END IF;
    
    -- Check user_bets table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bets') THEN
        SELECT COUNT(*) INTO user_bets_count FROM user_bets;
        RAISE NOTICE 'user_bets table EXISTS with % records', user_bets_count;
    ELSE
        RAISE NOTICE 'user_bets table DOES NOT EXIST';
    END IF;
END $$;

-- 2. Create a trigger for betting_matches to process payouts
-- This will make betting_matches work with the new user_points system

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_process_betting_matches_payouts ON betting_matches;

-- Create function to process betting_matches payouts
CREATE OR REPLACE FUNCTION process_betting_matches_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    user_betting_points INTEGER;
    user_stream_points INTEGER;
BEGIN
    -- Only process when a betting match is completed and has a winner
    IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL THEN
        RAISE NOTICE 'Processing betting_matches payouts for match % with winner %', NEW.id, NEW.winner_id;
        
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
            WHERE ub.match_id = NEW.id
            AND ub.status = 'pending'
        LOOP
            RAISE NOTICE 'Processing bet % for user %', bet_record.id, bet_record.user_id;
            
            -- Check if bet won
            IF bet_record.bet_on_player_id = NEW.winner_id THEN
                -- Calculate stream points bonus (Option B: 50% of bet amount)
                DECLARE
                    stream_points_bonus INTEGER := FLOOR(bet_record.points_wagered * 0.5);
                BEGIN
                    RAISE NOTICE 'Bet WON! Awarding % betting points and % stream points', 
                        bet_record.potential_winnings, stream_points_bonus;
                    
                    -- Get current user points
                    SELECT COALESCE(betting_points, 0), COALESCE(stream_points, 0)
                    INTO user_betting_points, user_stream_points
                    FROM user_points
                    WHERE user_id = bet_record.user_id;
                    
                    -- Update user points
                    UPDATE user_points
                    SET 
                        betting_points = user_betting_points + bet_record.potential_winnings,
                        stream_points = user_stream_points + stream_points_bonus,
                        updated_at = NOW()
                    WHERE user_id = bet_record.user_id;
                    
                    -- Record transactions
                    INSERT INTO point_transactions (
                        user_id, transaction_type, points_amount, points_type,
                        balance_before, balance_after, reference_id, reference_type, description
                    ) VALUES (
                        bet_record.user_id, 'bet_won', bet_record.potential_winnings, 'betting',
                        user_betting_points, user_betting_points + bet_record.potential_winnings,
                        bet_record.id, 'bet', 'Won bet on betting match'
                    );
                    
                    INSERT INTO point_transactions (
                        user_id, transaction_type, points_amount, points_type,
                        balance_before, balance_after, reference_id, reference_type, description
                    ) VALUES (
                        bet_record.user_id, 'stream_points_earned', stream_points_bonus, 'stream',
                        user_stream_points, user_stream_points + stream_points_bonus,
                        bet_record.id, 'bet', 'Stream points bonus for winning bet'
                    );
                    
                    -- Update bet status to won
                    UPDATE user_bets
                    SET status = 'won'
                    WHERE id = bet_record.id;
                    
                    RAISE NOTICE 'Successfully awarded points to user %', bet_record.user_id;
                END;
            ELSE
                RAISE NOTICE 'Bet LOST for user %', bet_record.user_id;
                
                -- Update bet status to lost
                UPDATE user_bets
                SET status = 'lost'
                WHERE id = bet_record.id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for betting_matches
CREATE TRIGGER trigger_process_betting_matches_payouts
    AFTER UPDATE ON betting_matches
    FOR EACH ROW
    EXECUTE FUNCTION process_betting_matches_payouts();

-- 3. Create a function to place bets on betting_matches (compatible with old system)
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
        bet_id, 'bet', 'Bet placed on betting match'
    );
    
    RAISE NOTICE 'Bet placed: % points wagered, % stream points bonus', points_to_wager, stream_points_bonus;
    
    RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION process_betting_matches_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION place_betting_match_bet(UUID, UUID, INTEGER) TO authenticated;

-- 5. Ensure user_bets table has stream_points_bonus column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_bets' AND column_name = 'stream_points_bonus'
    ) THEN
        ALTER TABLE user_bets ADD COLUMN stream_points_bonus INTEGER DEFAULT 0 CHECK (stream_points_bonus >= 0);
        RAISE NOTICE 'Added stream_points_bonus column to user_bets table';
    ELSE
        RAISE NOTICE 'stream_points_bonus column already exists in user_bets table';
    END IF;
END $$;

-- 6. Process any existing unprocessed bets from betting_matches
DO $$
DECLARE
    bet_record RECORD;
    user_betting_points INTEGER;
    user_stream_points INTEGER;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Processing existing unprocessed betting_matches bets...';
    
    -- Process all unprocessed bets for completed betting matches
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.bet_on_player_id,
            ub.points_wagered,
            ub.potential_winnings,
            bm.winner_id,
            bm.id as match_id
        FROM user_bets ub
        JOIN betting_matches bm ON ub.match_id = bm.id
        WHERE bm.status = 'completed' 
        AND bm.winner_id IS NOT NULL
        AND ub.status = 'pending'
    LOOP
        RAISE NOTICE 'Processing bet % for user % on betting match %', 
            bet_record.id, bet_record.user_id, bet_record.match_id;
        
        -- Check if bet won
        IF bet_record.bet_on_player_id = bet_record.winner_id THEN
            DECLARE
                stream_points_bonus INTEGER := FLOOR(bet_record.points_wagered * 0.5);
            BEGIN
                RAISE NOTICE 'Bet WON! Awarding % betting points and % stream points', 
                    bet_record.potential_winnings, stream_points_bonus;
                
                -- Get current user points
                SELECT COALESCE(betting_points, 0), COALESCE(stream_points, 0)
                INTO user_betting_points, user_stream_points
                FROM user_points
                WHERE user_id = bet_record.user_id;
                
                -- Update user points
                UPDATE user_points
                SET 
                    betting_points = user_betting_points + bet_record.potential_winnings,
                    stream_points = user_stream_points + stream_points_bonus,
                    updated_at = NOW()
                WHERE user_id = bet_record.user_id;
                
                -- Record transactions
                INSERT INTO point_transactions (
                    user_id, transaction_type, points_amount, points_type,
                    balance_before, balance_after, reference_id, reference_type, description
                ) VALUES (
                    bet_record.user_id, 'bet_won', bet_record.potential_winnings, 'betting',
                    user_betting_points, user_betting_points + bet_record.potential_winnings,
                    bet_record.id, 'bet', 'Won bet on betting match (manual processing)'
                );
                
                INSERT INTO point_transactions (
                    user_id, transaction_type, points_amount, points_type,
                    balance_before, balance_after, reference_id, reference_type, description
                ) VALUES (
                    bet_record.user_id, 'stream_points_earned', stream_points_bonus, 'stream',
                    user_stream_points, user_stream_points + stream_points_bonus,
                    bet_record.id, 'bet', 'Stream points bonus for winning bet (manual processing)'
                );
                
                -- Update bet status to won
                UPDATE user_bets
                SET status = 'won'
                WHERE id = bet_record.id;
                
                processed_count := processed_count + 1;
                RAISE NOTICE 'Successfully processed bet % for user %', bet_record.id, bet_record.user_id;
            END;
        ELSE
            RAISE NOTICE 'Bet LOST for user %', bet_record.user_id;
            
            -- Update bet status to lost
            UPDATE user_bets
            SET status = 'lost'
            WHERE id = bet_record.id;
            
            processed_count := processed_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Processing complete! Processed % betting_matches bets', processed_count;
END $$;

-- 7. Success message
DO $$
BEGIN
    RAISE NOTICE '=== BETTING MATCHES INTEGRATION COMPLETE ===';
    RAISE NOTICE 'betting_matches table now works with user_points system';
    RAISE NOTICE 'Trigger created: trigger_process_betting_matches_payouts';
    RAISE NOTICE 'Function created: place_betting_match_bet';
    RAISE NOTICE 'Option B implemented: 100%% winnings to betting points, 50%% bonus to stream points';
END $$; 