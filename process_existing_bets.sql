-- Manually process existing unprocessed bets
-- This will award points for bets that should have been processed

DO $$
DECLARE
    bet_record RECORD;
    user_betting_points INTEGER;
    user_stream_points INTEGER;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Processing existing unprocessed bets...';
    
    -- Process all unprocessed bets for completed matches
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.bet_on_player_id,
            ub.points_wagered,
            ub.potential_winnings,
            ub.stream_points_bonus,
            m.winner_id,
            m.id as match_id
        FROM user_bets ub
        JOIN matches m ON ub.match_id = m.id
        WHERE m.status = 'completed' 
        AND m.winner_id IS NOT NULL
        AND ub.status = 'pending'
    LOOP
        RAISE NOTICE 'Processing bet % for user % on match %', 
            bet_record.id, bet_record.user_id, bet_record.match_id;
        
        -- Check if bet won
        IF bet_record.bet_on_player_id = bet_record.winner_id THEN
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
                bet_record.id, 'bet', 'Won bet on match (manual processing)'
            );
            
            INSERT INTO point_transactions (
                user_id, transaction_type, points_amount, points_type,
                balance_before, balance_after, reference_id, reference_type, description
            ) VALUES (
                bet_record.user_id, 'stream_points_earned', bet_record.stream_points_bonus, 'stream',
                user_stream_points, user_stream_points + bet_record.stream_points_bonus,
                bet_record.id, 'bet', 'Stream points bonus for winning bet (manual processing)'
            );
            
            -- Update bet status to won
            UPDATE user_bets
            SET status = 'won'
            WHERE id = bet_record.id;
            
            processed_count := processed_count + 1;
            RAISE NOTICE 'Successfully processed bet % for user %', bet_record.id, bet_record.user_id;
        ELSE
            RAISE NOTICE 'Bet LOST for user %', bet_record.user_id;
            
            -- Update bet status to lost
            UPDATE user_bets
            SET status = 'lost'
            WHERE id = bet_record.id;
            
            processed_count := processed_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Processing complete! Processed % bets', processed_count;
END $$;

-- Check the results
SELECT 
    'Processing Results' as info,
    COUNT(*) as total_bets,
    COUNT(CASE WHEN ub.status = 'won' THEN 1 END) as won_bets,
    COUNT(CASE WHEN ub.status = 'lost' THEN 1 END) as lost_bets,
    COUNT(CASE WHEN ub.status = 'pending' THEN 1 END) as pending_bets
FROM user_bets ub
JOIN matches m ON ub.match_id = m.id
WHERE m.status = 'completed' 
AND m.winner_id IS NOT NULL;

-- Show updated user points
SELECT 
    'Updated User Points' as info,
    user_id,
    betting_points,
    stream_points,
    updated_at
FROM user_points 
WHERE user_id = auth.uid(); 