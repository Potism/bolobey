# 🔧 Fix Function Return Type Error

## Error Analysis

### **Problem**

```
ERROR: 42P13: cannot change return type of existing function
HINT: Use DROP FUNCTION place_bet(uuid,uuid,integer) first.
```

**Issue**: The `place_bet` function already exists with a different return type, and PostgreSQL won't let you change it without dropping it first.

## 🛠️ **Solution**

### **Use the Safe Script**

The `setup_betting_system_safe.sql` script I created handles this automatically by:

1. **Dropping the existing function first**:

   ```sql
   DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER);
   ```

2. **Creating the new function with correct return type**:
   ```sql
   CREATE OR REPLACE FUNCTION place_bet(
     match_uuid UUID,
     bet_on_player_uuid UUID,
     points_to_wager INTEGER
   )
   RETURNS UUID AS $$
   ```

## 📋 **Step-by-Step Fix**

### **Option 1: Use the Safe Script (Recommended)**

1. **Go to your Supabase SQL Editor**
2. **Copy the contents of `setup_betting_system_safe.sql`**
3. **Paste and run the script**
4. **You should see**: `Betting system setup completed successfully!`

### **Option 2: Manual Fix (If you prefer)**

If you want to fix it manually:

```sql
-- 1. Drop the existing function
DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER);

-- 2. Create the new function
CREATE OR REPLACE FUNCTION place_bet(
  match_uuid UUID,
  bet_on_player_uuid UUID,
  points_to_wager INTEGER
)
RETURNS UUID AS $$
DECLARE
  bet_id UUID;
  user_points INTEGER;
BEGIN
  -- Check if user has enough points
  user_points := get_user_points_balance(auth.uid());

  IF user_points < points_to_wager THEN
    RAISE EXCEPTION 'Insufficient points. You have % points, need % points', user_points, points_to_wager;
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

  -- Create the bet
  INSERT INTO user_bets (user_id, match_id, bet_on_player_id, points_wagered, potential_winnings)
  VALUES (auth.uid(), match_uuid, bet_on_player_uuid, points_to_wager, points_to_wager * 2)
  RETURNING id INTO bet_id;

  -- Deduct points from user
  INSERT INTO stream_points (user_id, points, transaction_type, description, reference_id, reference_type)
  VALUES (auth.uid(), -points_to_wager, 'bet_lost', 'Bet placed', bet_id, 'bet');

  RETURN bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔍 **What the Safe Script Does**

The safe script handles all potential conflicts:

✅ **Drops existing functions** before recreating them  
✅ **Checks for existing tables** before creating them  
✅ **Checks for existing policies** before creating them  
✅ **Checks for existing indexes** before creating them  
✅ **Uses `CREATE OR REPLACE`** for functions that can be replaced  
✅ **Uses `DROP IF EXISTS`** for functions that need to be recreated

## 🧪 **Test After Fix**

After running the safe script:

1. **Check Console**: No more function errors
2. **Test Betting**: Try placing a bet
3. **Test Notifications**: Check if betting notifications work
4. **Test Admin**: Verify admin betting controls

## 📊 **Expected Results**

After the fix:

- ✅ No more function return type errors
- ✅ `place_bet` function works correctly
- ✅ Betting system functions properly
- ✅ All database objects created successfully

## 🚨 **If You Still See Errors**

If you encounter other function-related errors:

1. **Check existing functions**:

   ```sql
   SELECT routine_name, data_type
   FROM information_schema.routines
   WHERE routine_name LIKE '%bet%';
   ```

2. **Drop all betting functions and recreate**:

   ```sql
   DROP FUNCTION IF EXISTS place_bet(UUID, UUID, INTEGER);
   DROP FUNCTION IF EXISTS get_user_points_balance(UUID);
   DROP FUNCTION IF EXISTS handle_new_user_points();
   ```

3. **Run the safe script again**

## 🎯 **Summary**

- **Problem**: Function return type conflict
- **Solution**: Use `setup_betting_system_safe.sql`
- **Key Fix**: `DROP FUNCTION IF EXISTS` before `CREATE OR REPLACE`
- **Result**: Clean setup, working betting system
