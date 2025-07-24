# Troubleshooting Guide

## Common Issues and Solutions

### 1. "User profile not found" Error

**Problem**: After signing up, you get an error that the user profile doesn't exist.

**Solution**:

1. The database trigger should automatically create user profiles, but if it fails:

   - Run the SQL script in `scripts/create-admin.sql` to create an admin user
   - Or manually create a user profile in the Supabase dashboard

2. **Manual Fix**: Go to your Supabase SQL Editor and run:
   ```sql
   -- Replace with your actual user ID and email
   INSERT INTO public.users (id, email, display_name, role)
   VALUES ('your-user-id', 'your-email@example.com', 'Your Name', 'player');
   ```

### 2. Authentication Issues

**Problem**: Users can't sign in or sign up.

**Solutions**:

1. **Check environment variables**: Ensure `.env.local` has correct Supabase credentials
2. **Verify Supabase setup**: Make sure you've run the complete `supabase_schema.sql`
3. **Check RLS policies**: Ensure Row Level Security policies are properly configured

### 3. Tournament Creation Fails

**Problem**: Admins can't create tournaments.

**Solutions**:

1. **Check user role**: Ensure the user has `admin` role in the database
2. **Verify permissions**: Check that RLS policies allow admin operations
3. **Database constraints**: Ensure all required fields are provided

### 4. Bracket Generation Issues

**Problem**: Can't generate tournament brackets.

**Solutions**:

1. **Minimum participants**: Need at least 2 participants to generate bracket
2. **Tournament status**: Tournament must be in 'open' status
3. **Admin permissions**: Only tournament creators or admins can generate brackets

### 5. Match Updates Not Working

**Problem**: Can't update match results.

**Solutions**:

1. **Admin permissions**: Only tournament creators or admins can update matches
2. **Match status**: Match must be in 'pending' or 'in_progress' status
3. **Valid scores**: Ensure scores are valid numbers

## Database Schema Issues

### Missing Tables or Functions

If you encounter errors about missing tables or functions:

1. **Run complete schema**: Execute the entire `supabase_schema.sql` file
2. **Check for errors**: Look for any SQL execution errors in Supabase logs
3. **Verify triggers**: Ensure the `handle_new_user` trigger is created

### RLS Policy Issues

If you get permission errors:

1. **Check policies**: Verify all RLS policies are created correctly
2. **User authentication**: Ensure users are properly authenticated
3. **Role assignments**: Verify user roles are set correctly

## Development Issues

### Build Errors

1. **TypeScript errors**: Run `npm run build` to see detailed error messages
2. **Missing dependencies**: Run `npm install` to install missing packages
3. **Environment variables**: Ensure all required env vars are set

### Runtime Errors

1. **Console logs**: Check browser console for JavaScript errors
2. **Network requests**: Check Network tab for failed API calls
3. **Supabase logs**: Check Supabase dashboard for database errors

## Getting Help

1. **Check logs**: Look at browser console and Supabase logs
2. **Verify setup**: Ensure you've followed the complete setup guide
3. **Test with admin user**: Use the default admin credentials to test functionality
4. **Database inspection**: Use Supabase dashboard to inspect data and policies

## Quick Fixes

### Create Admin User Manually

```sql
-- Run this in Supabase SQL Editor
INSERT INTO public.users (id, email, display_name, role)
VALUES (
  'your-auth-user-id',
  'your-email@example.com',
  'Admin User',
  'admin'
);
```

### Reset User Role

```sql
-- Make a user admin
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Check User Profile

```sql
-- Check if user profile exists
SELECT * FROM public.users WHERE email = 'your-email@example.com';
```
