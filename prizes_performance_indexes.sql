-- Prizes System Performance Indexes
-- Run this in Supabase SQL Editor to optimize database performance

-- 1. Prizes table indexes
CREATE INDEX IF NOT EXISTS idx_prizes_active_category ON prizes(is_active, category);
CREATE INDEX IF NOT EXISTS idx_prizes_points_cost ON prizes(points_cost);
CREATE INDEX IF NOT EXISTS idx_prizes_featured ON prizes(is_featured DESC);
CREATE INDEX IF NOT EXISTS idx_prizes_created_at ON prizes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prizes_name_search ON prizes USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_prizes_description_search ON prizes USING gin(to_tsvector('english', description));

-- 2. Prize redemptions indexes
CREATE INDEX IF NOT EXISTS idx_redemptions_user_status ON prize_redemptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_redemptions_created_at ON prize_redemptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON prize_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_prize_id ON prize_redemptions(prize_id);

-- 3. User points indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_stream_points ON user_points(stream_points);

-- 4. Point transactions indexes
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);

-- 5. Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prizes_active_featured_points ON prizes(is_active, is_featured DESC, points_cost ASC);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_created ON prize_redemptions(user_id, created_at DESC);

-- 6. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Performance indexes created successfully!';
  RAISE NOTICE '🚀 Database queries should now be much faster';
  RAISE NOTICE '📊 Pagination and filtering will be optimized';
END $$; 