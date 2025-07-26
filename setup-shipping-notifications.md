# 🚀 Quick Setup Guide

## Step 1: Run Database Scripts

Go to your Supabase SQL Editor and run these scripts in order:

### 1. Add User Address Fields

Copy and paste the contents of `add_user_address_fields_safe.sql` into your Supabase SQL Editor and run it.

### 2. Create Enhanced Notifications

Copy and paste the contents of `create_enhanced_notifications_safe.sql` into your Supabase SQL Editor and run it.

### 3. Fix Betting System (Optional - if you see 406 errors)

If you see console errors about `current_betting_matches`, run this script:

Copy and paste the contents of `setup_betting_system_safe.sql` into your Supabase SQL Editor and run it.

## Step 2: Test the Features

### Test User Profile:

1. Go to `/profile` in your app
2. Add shipping address and phone number
3. Save changes
4. Verify the data is stored

### Test Notifications:

1. Place a bet in a tournament
2. Check the notification bell in the navigation
3. You should see notifications for bet placement

### Test Admin Shipping:

1. Login as admin
2. Go to `/admin/prizes`
3. Click on "Shipping Management" tab
4. View and manage prize redemptions

## Step 3: Verify Everything Works

✅ **Navigation**: Notification bell should appear for logged-in users  
✅ **Profile Page**: `/profile` should show the shipping form  
✅ **Admin Panel**: `/admin/prizes` should have shipping management tab  
✅ **Database**: Check that new tables and fields exist

## Troubleshooting

If you encounter issues:

1. **Check Supabase Logs**: Look for any SQL errors
2. **Verify RLS Policies**: Make sure policies are created correctly
3. **Check Triggers**: Ensure notification triggers are working
4. **Test with Admin User**: Use admin credentials to test all features

## Next Steps

After setup is complete:

- Add some test prizes
- Have users redeem prizes
- Test the complete shipping workflow
- Monitor notifications in real-time
