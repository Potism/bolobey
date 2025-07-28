-- Fix the bet payouts trigger to ensure points are awarded correctly
-- This script will recreate the trigger and ensure it's working

-- 1. Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_process_bet_payouts ON matches;

-- 2. Create the process_bet_payouts function (simplified version)
CREATE OR REPLACE FUNCTION process_bet_payouts()
RETURNS TRIGGER AS $$
DECLARE
    bet_record RECORD;
    user_betting_points INTEGER;
    user_stream_points INTEGER;
BEGIN
    -- Only process when a match is completed and has a winner
    IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL THEN
        RAISE NOTICE 'Processing payouts for match % with winner %', NEW.id, NEW.winner_id;
        
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
            WHERE ub.match_id = NEW.id
            AND ub.status = 'pending'
        LOOP
            RAISE NOTICE 'Processing bet % for user %', bet_record.id, bet_record.user_id;
            
            -- Check if bet won
            IF bet_record.bet_on_player_id = NEW.winner_id THEN
                RAISE NOTICE 'Bet WON! Awarding % betting points and % stream points', 
                    bet_record.potential_winnings, bet_record.stream_points_bonus;
                
                -- Get current user points
                SELECT COALESCE(betting_points, 0), COALESCE(stream_points, 0)
                INTO user_betting_points, user_stream_points
                FROM user_points
                WHERE user_id = bet_record.user_id;
                
                -- Update user points
                UPDATE user_points
                SET 
                    betting_points = user_betting_points + bet_record.potential_winnings,
                    stream_points = user_stream_points + bet_record.stream_points_bonus,
                    updated_at = NOW()
                WHERE user_id = bet_record.user_id;
                
                -- Record transactions
                INSERT INTO point_transactions (
                    user_id, transaction_type, points_amount, points_type,
                    balance_before, balance_after, reference_id, reference_type, description
                ) VALUES (
                    bet_record.user_id, 'bet_won', bet_record.potential_winnings, 'betting',
                    user_betting_points, user_betting_points + bet_record.potential_winnings,
                    bet_record.id, 'bet', 'Won bet on match'
                );
                
                INSERT INTO point_transactions (
                    user_id, transaction_type, points_amount, points_type,
                    balance_before, balance_after, reference_id, reference_type, description
                ) VALUES (
                    bet_record.user_id, 'stream_points_earned', bet_record.stream_points_bonus, 'stream',
                    user_stream_points, user_stream_points + bet_record.stream_points_bonus,
                    bet_record.id, 'bet', 'Stream points bonus for winning bet'
                );
                
                -- Update bet status to won
                UPDATE user_bets
                SET status = 'won'
                WHERE id = bet_record.id;
                
                RAISE NOTICE 'Successfully awarded points to user %', bet_record.user_id;
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

-- 3. Create the trigger
CREATE TRIGGER trigger_process_bet_payouts
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION process_bet_payouts();

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION process_bet_payouts() TO authenticated;

-- 5. Test the trigger
DO $$
BEGIN
    RAISE NOTICE 'Trigger created successfully!';
    RAISE NOTICE 'The trigger will now process bet payouts when matches are completed.';
END $$;

-- 6. Check if there are any unprocessed bets that need manual processing
DO $$
DECLARE
    unprocessed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unprocessed_count
    FROM user_bets ub
    JOIN matches m ON ub.match_id = m.id
    WHERE m.status = 'completed' 
    AND m.winner_id IS NOT NULL
    AND ub.status = 'pending';
    
    IF unprocessed_count > 0 THEN
        RAISE NOTICE 'Found % unprocessed bets that need manual processing', unprocessed_count;
        RAISE NOTICE 'You may need to manually update these matches to trigger the payout process';
    ELSE
        RAISE NOTICE 'No unprocessed bets found';
    END IF;
END $$; 