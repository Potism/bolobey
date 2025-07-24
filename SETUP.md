# 🚀 Bolobey Setup Guide

## Quick Start (Demo Mode)

Your app is currently running in **demo mode** without a database. You can:

- Browse the beautiful UI
- See the design and layout
- Test navigation and forms (though they won't save data)

## 🗄️ Setting Up Supabase Database

To get full functionality with real data, you'll need to set up Supabase:

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose an organization and name your project "bolobey"
4. Set a secure database password
5. Choose a region close to you
6. Click "Create new project"

### Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings → API**
2. Copy the following values:
   - **Project URL** (looks like: `https://abc123.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### Step 3: Configure Environment Variables

Create a `.env.local` file in your project root with:

```bash
# Replace with your actual values from Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase_schema.sql` from your project
3. Paste it into the SQL editor
4. Click "Run" to create all tables and functions

### Step 5: Create Admin User

1. In Supabase dashboard, go to **Authentication → Users**
2. Click "Add user" and create your admin account
3. Go to **SQL Editor** and run:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Step 6: Restart Your App

```bash
# Stop the development server (Ctrl+C)
# Then restart it
npm run dev
```

## 🎉 You're Ready!

Your app should now:

- ✅ Load without the "Demo Mode" banner
- ✅ Allow user registration and login
- ✅ Let admins create tournaments
- ✅ Display real data from your database

## 🛠️ Troubleshooting

### App Still Shows "Demo Mode"

- Check that your `.env.local` file is in the project root
- Verify the environment variables are correct
- Restart the development server

### Database Errors

- Ensure you ran the complete `supabase_schema.sql` script
- Check the Supabase logs in your dashboard
- Verify Row Level Security policies are enabled

### Authentication Issues

- Make sure you created the user profile trigger in the schema
- Check that the `users` table exists
- Verify your admin user has `role = 'admin'`

## 📚 Next Steps

Once everything is working:

1. **Test user registration** - Create a player account
2. **Create your first tournament** - Use the admin account
3. **Customize the app** - Modify colors, add features
4. **Deploy to Vercel** - Share with your Beyblade community!

Need help? Check the main [README.md](./README.md) or the Supabase documentation.
