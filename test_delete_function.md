# 🔧 **Troubleshooting Delete Function**

## 🚨 **Delete Not Working - Quick Fix**

### **Step 1: Run the Database Fix**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste** the content from `fix_delete_function.sql`
4. **Run the script**

### **Step 2: Check Browser Console**

1. **Open browser developer tools** (F12)
2. **Go to Console tab**
3. **Try to delete a prize**
4. **Look for error messages**

### **Step 3: Common Issues & Solutions**

#### **❌ Issue: "Permission denied"**

**Solution:** Run the SQL fix script above

#### **❌ Issue: "Function not found"**

**Solution:** The fallback delete should work automatically

#### **❌ Issue: "RLS policy violation"**

**Solution:** The SQL script fixes RLS policies

#### **❌ Issue: "Prize has redemptions"**

**Solution:** Cannot delete prizes with existing redemptions

### **Step 4: Manual Test**

```sql
-- Test if you can delete a prize manually
DELETE FROM prizes WHERE id = 'your-prize-id-here';
```

### **Step 5: Check Admin Status**

```sql
-- Verify you're an admin
SELECT id, email, role FROM users WHERE id = auth.uid();
```

## 🎯 **Quick Debug Steps**

1. **Check if buttons appear** - Edit/Delete buttons should be visible
2. **Check if dialog opens** - Delete confirmation should appear
3. **Check console errors** - Look for JavaScript errors
4. **Check network tab** - Look for failed API calls
5. **Check database logs** - Look for SQL errors

## 🚀 **Alternative Delete Method**

If the UI delete doesn't work, you can delete directly in Supabase:

1. **Go to Supabase Dashboard**
2. **Click "Table Editor"**
3. **Select "prizes" table**
4. **Find the prize you want to delete**
5. **Click the delete button (trash icon)**

## 📞 **Still Not Working?**

If delete still doesn't work after running the fix:

1. **Check your admin role** - Make sure you're actually an admin
2. **Try a different browser** - Clear cache and cookies
3. **Check Supabase logs** - Look for any error messages
4. **Contact support** - Share the specific error message

**The fix script should resolve most delete issues! 🛠️**
