# 🚀 New Supabase Project Setup Guide

## 📋 Step-by-Step Instructions

### **Step 1: Create New Supabase Project**

1. **Go to Supabase Dashboard**

   - Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Click **"New Project"**

2. **Project Configuration**

   - **Organization**: Select your organization
   - **Name**: `bolobey-new` (or any name you prefer)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with **Free** plan

3. **Wait for Setup**
   - Project creation takes 1-2 minutes
   - You'll see "Project is ready" when complete

### **Step 2: Get Project Credentials**

1. **Go to Project Settings**

   - Click on your new project
   - Go to **Settings** → **API**

2. **Copy Credentials**
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **Anon Key**: `eyJ...` (public key)
   - **Service Role Key**: `eyJ...` (private key - keep secret)

### **Step 3: Run Database Setup**

1. **Open SQL Editor**

   - Go to **SQL Editor** in your new project
   - Click **"New Query"**

2. **Run Setup Script**

   - Copy the contents of `new_project_setup.sql`
   - Paste into SQL Editor
   - Click **"Run"**

3. **Verify Setup**
   - You should see success messages for each section
   - Look for "🎉 New Supabase project setup completed!"

### **Step 4: Update Environment Variables**

1. **Update `.env.local`**

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://[your-new-project-id].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-new-anon-key]
   ```

2. **Restart Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### **Step 5: Test Signup**

1. **Try Signup**

   - Go to your app: `http://localhost:3000/auth/signup`
   - Try signing up with `streamerdude@gmail.com`
   - Use password: `Wasd1993`

2. **Check Results**
   - If signup works: ✅ **New project is working!**
   - If signup fails: ❌ **Issue is with your code, not Supabase**

## 🔍 What the Setup Script Does

### **✅ Complete Database Schema**

- **Users table** with all address fields
- **User points system** (betting + stream points)
- **Tournament system** (basic tables)
- **All necessary indexes** for performance

### **✅ Automatic User Creation**

- **Trigger function** creates user profiles automatically
- **Initial points** (50 stream points) awarded to new users
- **Address fields** supported from signup

### **✅ Security & Performance**

- **RLS policies** for data security
- **Performance indexes** for fast queries
- **Error handling** that won't break signup

## 🧪 Testing Checklist

### **✅ Database Setup**

- [ ] All tables created successfully
- [ ] Trigger function created
- [ ] RLS policies applied
- [ ] Indexes created

### **✅ Manual Test**

- [ ] Manual user creation works
- [ ] Profile creation by trigger works
- [ ] Initial points awarded

### **✅ App Integration**

- [ ] Environment variables updated
- [ ] App connects to new project
- [ ] Signup form works
- [ ] User profile created automatically

## 🎯 Expected Results

### **If Everything Works:**

- ✅ **Signup succeeds** without 500 errors
- ✅ **User profile created** automatically
- ✅ **50 stream points** awarded
- ✅ **Profile page** shows address fields

### **If Signup Still Fails:**

- ❌ **Issue is in your code**, not Supabase
- ❌ **Check your signup component**
- ❌ **Check your auth hook**
- ❌ **Check environment variables**

## 🔧 Troubleshooting

### **Common Issues:**

1. **"Project not found"**

   - Check your project URL in environment variables
   - Make sure you copied the correct URL

2. **"Invalid API key"**

   - Check your anon key in environment variables
   - Make sure you copied the full key

3. **"Table does not exist"**

   - Run the setup script again
   - Check for any error messages in SQL Editor

4. **"RLS policy violation"**
   - The setup script includes all necessary policies
   - Check if you're logged in when testing

## 📞 Next Steps

### **If New Project Works:**

1. **Migrate your data** from old project (if needed)
2. **Update production environment** variables
3. **Deploy with new project**
4. **Delete old project** to avoid confusion

### **If New Project Also Fails:**

1. **Check your signup code** for issues
2. **Review your auth hook** implementation
3. **Check browser console** for errors
4. **Contact me** with specific error messages

## 🎉 Success Indicators

You'll know it's working when:

- ✅ Signup completes without errors
- ✅ User profile appears in database
- ✅ 50 stream points are awarded
- ✅ User can log in and access profile page
- ✅ Address fields are available in profile form

---

**Ready to test?** Follow the steps above and let me know what happens! 🚀
