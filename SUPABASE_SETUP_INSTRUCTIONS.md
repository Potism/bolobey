# Supabase Leaderboard Setup Instructions

## 🔧 **Problem Identified:**

The frontend is connecting to Supabase at `https://dajnapokhtsyrfobssut.supabase.co`, but the leaderboard views don't exist in that database.

## 📋 **Solution: Setup Views in Supabase**

### **Step 1: Access Supabase Dashboard**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: `dajnapokhtsyrfobssut`

### **Step 2: Open SQL Editor**

1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New Query"** to create a new SQL script

### **Step 3: Run the Setup Script**

Copy and paste the entire contents of `setup_supabase_leaderboard_views.sql` into the SQL editor, then click **"Run"**.

### **Step 4: Verify Setup**

After running the script, you should see:

```
=== TESTING VIEWS ===
player_stats_count: [number]
simple_player_stats_count: [number]
```

## 🎯 **Alternative: Quick Fix**

If you want a quick test, you can also run this simpler script in Supabase SQL Editor:

```sql
-- Quick Leaderboard View Setup
CREATE OR REPLACE VIEW player_stats AS
SELECT
  u.id,
  u.display_name,
  COUNT(DISTINCT tp.tournament_id) as tournaments_played,
  COUNT(DISTINCT CASE WHEN t.winner_id = u.id THEN t.id END) as tournaments_won,
  COALESCE(SUM(tp.matches_played), 0) as total_matches,
  COALESCE(SUM(tp.matches_won), 0) as matches_won,
  COALESCE(SUM(tp.total_points), 0) as total_points,
  CASE
    WHEN COALESCE(SUM(tp.matches_played), 0) > 0
    THEN ROUND((COALESCE(SUM(tp.matches_won), 0)::DECIMAL / COALESCE(SUM(tp.matches_played), 1)) * 100, 2)
    ELSE 0
  END as win_percentage,
  COALESCE(SUM(tp.burst_points), 0) as total_burst_points,
  COALESCE(SUM(tp.ringout_points), 0) as total_ringout_points,
  COALESCE(SUM(tp.spinout_points), 0) as total_spinout_points
FROM users u
LEFT JOIN tournament_participants tp ON u.id = tp.user_id
LEFT JOIN tournaments t ON tp.tournament_id = t.id
WHERE (u.role = 'player' OR u.role = 'admin')
GROUP BY u.id, u.display_name
HAVING COUNT(DISTINCT tp.tournament_id) > 0
ORDER BY tournaments_won DESC, total_points DESC, win_percentage DESC;

-- Grant permissions
GRANT SELECT ON player_stats TO anon;
GRANT SELECT ON player_stats TO authenticated;
```

## ✅ **After Setup:**

1. **Test the leaderboard** by navigating to `/leaderboard`
2. **Check browser console** for success messages
3. **Verify real data** is displayed (not demo data)

## 🔍 **Expected Results:**

- ✅ No more "relation does not exist" errors
- ✅ Real player statistics displayed
- ✅ Tournament winners shown correctly
- ✅ Working search and sort functionality

## 🚨 **If Issues Persist:**

1. **Check Supabase logs** in the dashboard
2. **Verify table structure** matches the view queries
3. **Test permissions** by running a simple SELECT query
4. **Check RLS policies** if they exist

The leaderboard should work perfectly once the views are created in Supabase! 🏆
