# 🔧 Fix Console Errors

## Error Analysis

### **Main Issue: Supabase 406 Error**

```
GET https://dajnapokhtsyrfobssut.supabase.co/rest/v1/current_betting_matches?se…n.%28betting_open%2Cbetting_closed%2Clive%29&order=created_at.desc&limit=1 406 (Not Acceptable)
```

**Problem**: The `current_betting_matches` view doesn't exist in your database.

### **Secondary Issue: YouTube/Ad Blocker Errors**

```
GET https://www.youtube.com/generate_204?3fu0kw net::ERR_BLOCKED_BY_CLIENT
POST https://play.google.com/log?hasfast=true&auth=... net::ERR_BLOCKED_BY_CLIENT
```

**Problem**: Ad blocker extensions blocking YouTube analytics (not affecting your app).

## 🛠️ **Quick Fix**

### **Step 1: Fix the Supabase Error**

1. **Go to your Supabase SQL Editor**

2. **Run the Betting System Setup**:
   - Copy the contents of `setup_betting_system_safe.sql`
   - Paste into Supabase SQL Editor
   - Run the script
   - You should see: `Betting system setup completed successfully!`

### **Step 2: Verify the Fix**

After running the script, check your browser console. The 406 error should be gone.

### **Step 3: Ignore YouTube Errors**

The YouTube/Google Play errors are just ad blockers and don't affect your app functionality. You can safely ignore them.

## 🔍 **What the Fix Does**

The `setup_betting_system_safe.sql` script:

✅ **Creates missing tables**:

- `betting_matches`
- `user_bets`
- `stream_points`

✅ **Creates the missing view**:

- `current_betting_matches`

✅ **Sets up proper permissions**:

- RLS policies for security
- Grants for authenticated users

✅ **Enables real-time updates**:

- Adds tables to Supabase realtime

✅ **Creates helper functions**:

- `get_user_points_balance()`
- `place_bet()`

## 🧪 **Test After Fix**

1. **Check Console**: No more 406 errors
2. **Test Betting**: Try accessing betting features
3. **Test Notifications**: Place a bet to test notifications
4. **Test Admin**: Check admin betting controls

## 📊 **Expected Results**

After the fix:

- ✅ No more 406 errors in console
- ✅ Betting features work properly
- ✅ Notifications system works
- ✅ Admin controls function correctly

## 🚨 **If You Still See Errors**

If you still see 406 errors after running the script:

1. **Check if the view was created**:

   ```sql
   SELECT * FROM current_betting_matches LIMIT 1;
   ```

2. **Check permissions**:

   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_name = 'current_betting_matches';
   ```

3. **Verify RLS policies**:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename IN ('betting_matches', 'user_bets', 'stream_points');
   ```

## 🎯 **Summary**

- **Main Issue**: Missing `current_betting_matches` view
- **Solution**: Run `setup_betting_system_complete.sql`
- **YouTube Errors**: Ignore them (ad blocker related)
- **Result**: Clean console, working betting system
