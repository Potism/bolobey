-- Check what's already set up in the prizes system
-- Run this in Supabase SQL Editor to see what exists

-- Check if basic tables exist
SELECT 
  'prizes' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prizes') as exists
UNION ALL
SELECT 
  'prize_redemptions' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prize_redemptions') as exists
UNION ALL
SELECT 
  'prize_notifications' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prize_notifications') as exists
UNION ALL
SELECT 
  'prize_wishlist' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prize_wishlist') as exists;

-- Check if sample prizes exist
SELECT COUNT(*) as sample_prizes_count FROM prizes WHERE name LIKE '%Beyblade%' OR name LIKE '%Gaming%';

-- Check if functions exist
SELECT 
  'redeem_prize' as function_name,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'redeem_prize') as exists
UNION ALL
SELECT 
  'add_prize' as function_name,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'add_prize') as exists
UNION ALL
SELECT 
  'add_to_wishlist' as function_name,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'add_to_wishlist') as exists;

-- Check if views exist
SELECT 
  'prizes_with_stats' as view_name,
  EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'prizes_with_stats') as exists
UNION ALL
SELECT 
  'user_redemption_history' as view_name,
  EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_redemption_history') as exists; 