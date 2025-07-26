# 🚀 Quick Database Setup - Prizes System

## 📋 **Step-by-Step Database Setup**

### **1. Open Supabase Dashboard**

- Go to your Supabase project dashboard
- Click on **"SQL Editor"** in the left sidebar

### **2. Create New Query**

- Click **"New Query"** button
- Give it a name like "Setup Prizes System"

### **3. Copy & Paste the SQL**

Copy the **entire content** from `create_prizes_system.sql` and paste it into the SQL Editor.

### **4. Run the Script**

- Click the **"Run"** button (or press Ctrl+Enter)
- Wait for completion (should take 10-30 seconds)

### **5. Verify Success**

You should see:

```
NOTICE:  Prizes system setup complete!
NOTICE:  Sample prizes have been added to the catalog.
NOTICE:  Users can now redeem prizes with their stream points.
NOTICE:  Admins can manage prizes and redemption status.
```

## ✅ **What Gets Created:**

### **Tables:**

- `prizes` - Prize catalog
- `prize_redemptions` - User redemptions

### **Functions:**

- `redeem_prize()` - Process redemptions
- `add_prize()` - Admin add prizes
- `update_redemption_status()` - Admin manage redemptions
- `get_user_redemptions()` - User history
- `get_prize_popularity_stats()` - Analytics

### **Sample Prizes (10 items):**

- Beyblade Burst Pro Series (500 points)
- Gaming Headset (1000 points)
- Tournament T-Shirt (200 points)
- Beyblade Stadium (800 points)
- Gaming Mouse (750 points)
- Collector Pin Set (150 points)
- Gaming Keyboard (1200 points)
- Hoodie (400 points)
- Beyblade Parts Kit (300 points)
- Gaming Chair (2000 points)

## 🎯 **After Database Setup:**

1. **Test Frontend** - Visit `/prizes` in your app
2. **Browse Prizes** - See all 10 sample prizes
3. **Test Filtering** - Try category and search filters
4. **Admin Access** - Log in as admin to manage prizes

## 🚨 **If You Get Errors:**

### **Common Issues:**

- **"relation already exists"** - Tables already created, skip those lines
- **"function already exists"** - Functions already exist, skip those lines
- **Permission denied** - Make sure you're logged in as project owner

### **Solution:**

Run the script in sections:

1. Tables first
2. Functions second
3. Sample data last

---

**Ready to run! Copy the SQL and execute in Supabase! 🚀**
