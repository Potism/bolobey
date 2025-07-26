-- Add Sample Prizes to Database
-- Run this in Supabase SQL Editor to populate the prizes table

-- Insert sample prizes
INSERT INTO prizes (name, description, points_cost, category, stock_quantity, is_featured, image_url) VALUES
('🏆 Golden Trophy', 'Exclusive golden trophy for champions', 5000, 'Trophies', 10, true, 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400'),
('🎮 Gaming Headset', 'Premium wireless gaming headset', 2500, 'Electronics', 25, true, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'),
('⚡ Energy Drink Pack', 'Pack of 12 energy drinks', 500, 'Food & Drinks', 50, false, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
('🎨 Custom T-Shirt', 'Personalized tournament t-shirt', 800, 'Clothing', 30, false, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'),
('🏅 Silver Medal', 'Beautiful silver medal', 3000, 'Trophies', 15, true, 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400'),
('📱 Phone Stand', 'Adjustable phone stand', 300, 'Accessories', 40, false, 'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=400'),
('🍕 Pizza Voucher', 'Free pizza from local restaurant', 1200, 'Food & Drinks', 20, false, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'),
('🎯 Dart Set', 'Professional dart set', 1500, 'Sports', 12, false, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
('💎 Diamond Ring', 'Luxury diamond ring (just kidding!)', 10000, 'Jewelry', 1, true, 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400'),
('🎪 Circus Tickets', '2 tickets to the circus', 800, 'Entertainment', 8, false, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sample prizes added successfully!';
  RAISE NOTICE '🎉 Your admin dashboard should now show prizes!';
  RAISE NOTICE '📊 Refresh your admin page to see the full UI.';
END $$; 