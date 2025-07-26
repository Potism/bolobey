# 🔧 Database Setup Troubleshooting

## Error: Policy Already Exists

### Problem

```
ERROR: 42710: policy "Users can read their own notifications" for table "user_notifications" already exists
```

### Solution

Use the **safe versions** of the SQL scripts that check for existing objects before creating them:

1. **Use `add_user_address_fields_safe.sql`** instead of `add_user_address_fields.sql`
2. **Use `create_enhanced_notifications_safe.sql`** instead of `create_enhanced_notifications.sql`

### What the Safe Scripts Do

- ✅ Check if columns exist before adding them
- ✅ Check if policies exist before creating them
- ✅ Check if indexes exist before creating them
- ✅ Check if triggers exist before creating them
- ✅ Use `CREATE OR REPLACE` for functions
- ✅ Use `DROP TRIGGER IF EXISTS` before creating triggers

## Common Database Setup Issues

### 1. **Table Already Exists**

**Error**: `relation "user_notifications" already exists`

**Solution**: The safe script uses `CREATE TABLE IF NOT EXISTS` to handle this.

### 2. **Column Already Exists**

**Error**: `column "shipping_address" of relation "users" already exists`

**Solution**: The safe script checks for existing columns before adding them.

### 3. **Index Already Exists**

**Error**: `relation "idx_user_notifications_user_id" already exists`

**Solution**: The safe script checks for existing indexes before creating them.

### 4. **Function Already Exists**

**Error**: `function "create_betting_notification" already exists`

**Solution**: The safe script uses `CREATE OR REPLACE FUNCTION` to update existing functions.

### 5. **Trigger Already Exists**

**Error**: `trigger "bet_notifications_trigger" for relation "user_bets" already exists`

**Solution**: The safe script drops existing triggers before creating new ones.

## Step-by-Step Recovery

### If You Already Ran the Original Scripts:

1. **Check What Exists**:

   ```sql
   -- Check if user_notifications table exists
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_name = 'user_notifications'
   );

   -- Check if shipping_address column exists
   SELECT EXISTS (
     SELECT FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'shipping_address'
   );
   ```

2. **Run the Safe Scripts**:

   - Copy `add_user_address_fields_safe.sql` to Supabase SQL Editor
   - Run it (it will skip existing objects)
   - Copy `create_enhanced_notifications_safe.sql` to Supabase SQL Editor
   - Run it (it will skip existing objects)

3. **Verify Setup**:
   ```sql
   -- Check if everything is set up correctly
   SELECT 'user_notifications' as table_name,
          EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_notifications') as exists
   UNION ALL
   SELECT 'shipping_address column' as table_name,
          EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'shipping_address') as exists;
   ```

## Verification Commands

### Check Tables and Columns

```sql
-- Check user address fields
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('shipping_address', 'phone_number', 'city', 'state_province', 'postal_code', 'country');

-- Check notifications table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_notifications';
```

### Check Policies

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_notifications', 'users');
```

### Check Functions

```sql
-- Check notification functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('create_betting_notification', 'create_prize_notification', 'mark_notification_read', 'mark_all_notifications_read');
```

### Check Triggers

```sql
-- Check notification triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('bet_notifications_trigger', 'prize_notifications_trigger');
```

## Success Indicators

After running the safe scripts, you should see:

✅ **Success Messages**:

- `User address fields setup completed successfully!`
- `Enhanced notification system setup completed successfully!`

✅ **No Errors**: The scripts should run without any "already exists" errors

✅ **All Objects Created**: All tables, columns, policies, functions, and triggers should be present

## Next Steps After Successful Setup

1. **Test the Frontend**: Go to your app and test the new features
2. **Add Test Data**: Create some test prizes and user accounts
3. **Test Notifications**: Place bets and redeem prizes to test notifications
4. **Monitor Logs**: Watch for any runtime errors in the browser console

## Still Having Issues?

If you're still encountering problems:

1. **Check Supabase Logs**: Look in the Supabase dashboard for detailed error messages
2. **Verify Permissions**: Make sure your database user has the necessary permissions
3. **Check RLS**: Ensure Row Level Security is properly configured
4. **Test Incrementally**: Try running smaller parts of the scripts to isolate issues

## Support

If you continue to have issues, please share:

- The exact error messages you're seeing
- The results of the verification commands above
- Any relevant Supabase logs
