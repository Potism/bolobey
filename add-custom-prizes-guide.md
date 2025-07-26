# 🎁 **Add Custom Prizes Guide**

## 🚀 **Quick Start: Adding Your Own Prizes**

### **Method 1: Admin Dashboard (Recommended)**

1. **Access Admin Dashboard:**

   - Visit `http://localhost:3000/admin/prizes`
   - Log in with admin account
   - Navigate to "Add New Prize" section

2. **Fill Prize Details:**

   ```
   Name: [Your Prize Name]
   Description: [Detailed description]
   Points Cost: [Number of points]
   Category: [gaming/electronics/clothing/accessories/collectibles/other]
   Stock Quantity: [Available quantity]
   Featured: [Yes/No]
   Image URL: [Optional - image link]
   ```

3. **Save Prize:**
   - Click "Add Prize"
   - Prize appears in catalog immediately
   - Users can start redeeming

### **Method 2: Direct Database (Advanced)**

1. **Open Supabase Dashboard:**

   - Go to your Supabase project
   - Click "Table Editor"
   - Select "prizes" table

2. **Add New Row:**
   ```sql
   INSERT INTO prizes (
     name,
     description,
     points_cost,
     category,
     stock_quantity,
     is_featured,
     image_url
   ) VALUES (
     'Your Custom Prize',
     'Description here',
     500,
     'gaming',
     10,
     true,
     'https://example.com/image.jpg'
   );
   ```

---

## 🎯 **Prize Ideas for Your Beyblade Community**

### **🏆 Tournament Prizes:**

- **Custom Beyblade Parts** (300-800 points)
- **Tournament Trophies** (1000-2000 points)
- **Champion Belts** (1500 points)
- **Medals & Pins** (100-300 points)

### **🎮 Gaming Accessories:**

- **Beyblade Launchers** (200-500 points)
- **Stadium Sets** (400-1000 points)
- **Parts Kits** (150-400 points)
- **Storage Cases** (100-300 points)

### **👕 Community Merchandise:**

- **Tournament Hoodies** (400-600 points)
- **Team Jerseys** (300-500 points)
- **Custom Caps** (200-300 points)
- **Stickers & Patches** (50-150 points)

### **📱 Digital Rewards:**

- **Custom Avatars** (100-200 points)
- **Profile Badges** (50-100 points)
- **Exclusive Emotes** (75-150 points)
- **Special Titles** (200-400 points)

---

## 💡 **Prize Pricing Strategy**

### **🎯 Point Cost Guidelines:**

- **Small Items** (stickers, pins): 50-150 points
- **Medium Items** (t-shirts, parts): 200-500 points
- **Large Items** (stadiums, electronics): 500-1000 points
- **Premium Items** (trophies, high-end gear): 1000+ points

### **📊 Stock Management:**

- **Limited Edition**: 1-5 items
- **Regular Stock**: 10-50 items
- **High Demand**: 50-100 items
- **Digital Items**: Unlimited

---

## 🎨 **Prize Presentation Tips**

### **📝 Description Best Practices:**

- **Be specific** about what users get
- **Include dimensions** for physical items
- **Mention quality** and materials
- **Add excitement** with exclamation marks
- **Include usage** instructions if needed

### **🏷️ Category Selection:**

- **gaming**: Beyblade items, gaming accessories
- **electronics**: Headsets, controllers, devices
- **clothing**: T-shirts, hoodies, caps
- **accessories**: Cases, bags, small items
- **collectibles**: Pins, figures, rare items
- **other**: Miscellaneous items

### **⭐ Featured Prize Tips:**

- **Highlight new** or popular items
- **Showcase limited** edition prizes
- **Promote seasonal** or event prizes
- **Feature high-value** items occasionally

---

## 🔧 **Admin Management Features**

### **📊 What You Can Do:**

- **Add/Edit/Delete** prizes
- **Update stock** quantities
- **Change prices** (points costs)
- **Feature/Unfeature** prizes
- **View redemption** history
- **Monitor analytics**

### **📈 Analytics Available:**

- **Most popular** prizes
- **Category performance**
- **User spending** patterns
- **Redemption rates**
- **Stock alerts**

---

## 🚀 **Quick Prize Addition Examples**

### **Example 1: Tournament Trophy**

```
Name: "Champion Trophy - Spring 2024"
Description: "Exclusive tournament trophy for the ultimate Beyblade champion!
Features custom engraving and premium materials."
Points Cost: 1500
Category: collectibles
Stock Quantity: 1
Featured: true
```

### **Example 2: Custom Beyblade Parts**

```
Name: "Pro Series Attack Ring"
Description: "High-performance attack ring for competitive play.
Made from premium materials for maximum durability."
Points Cost: 300
Category: gaming
Stock Quantity: 25
Featured: false
```

### **Example 3: Community Hoodie**

```
Name: "Bolobey Tournament Hoodie"
Description: "Comfortable hoodie featuring the Bolobey tournament logo.
Perfect for showing your community pride!"
Points Cost: 500
Category: clothing
Stock Quantity: 50
Featured: true
```

---

## 🎊 **Launch Your Custom Prizes!**

### **✅ Ready to Add Prizes:**

1. **Plan your prize** strategy
2. **Set appropriate** point costs
3. **Create compelling** descriptions
4. **Add to admin** dashboard
5. **Monitor user** response

### **📈 Success Metrics:**

- **Redemption rates** for each prize
- **User engagement** with catalog
- **Points spending** patterns
- **Community feedback** and excitement

**Your custom prizes will make your Beyblade community even more exciting! 🚀🏆**
