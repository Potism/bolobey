# 🎥 YouTube Live Streaming Setup Guide

## 🚀 **Complete YouTube Integration for Beyblade Tournaments**

This guide will help you set up YouTube live streaming for your Beyblade tournaments with easy configuration and management.

---

## 📋 **Quick Setup Steps:**

### **1. Database Setup**

Run this SQL script in your **Supabase SQL Editor**:

```sql
-- Copy and paste the entire content from: youtube_stream_setup.sql
```

### **2. Test the Integration**

1. Go to `/tournaments/[id]/manage` (admin only)
2. Click on **"Live Streaming"** tab
3. You'll see the new YouTube stream player
4. Configure your stream settings

---

## 🎯 **How It Works:**

### **For Tournament Admins:**

1. **Access Stream Settings** → Go to tournament manage page
2. **Configure YouTube** → Set up stream key and video ID
3. **Start Streaming** → Use OBS Studio with provided settings
4. **Embed Stream** → Live stream appears directly in the web app

### **For Viewers:**

1. **Join Tournament** → Access tournament page
2. **Watch Live** → View embedded YouTube stream
3. **Interact** → Use built-in chat and betting features
4. **Multi-platform** → Stream also available on YouTube directly

---

## 🔧 **YouTube Live Setup:**

### **Step 1: Get YouTube Stream Key**

1. **Go to YouTube Studio**

   - Visit [studio.youtube.com](https://studio.youtube.com)
   - Sign in with your Google account

2. **Create Live Stream**

   - Click **"Create"** → **"Go live"**
   - Choose **"Stream"** (not "Quick" or "Mobile")
   - Fill in stream details:
     - **Title**: "Beyblade Tournament - [Tournament Name]"
     - **Description**: Add tournament details
     - **Privacy**: Choose your preference
     - **Category**: Gaming

3. **Get Stream Key**
   - In the stream setup, find **"Stream key"**
   - Click **"Reveal"** to see your key
   - Copy the key (it looks like: `abcd-efgh-ijkl-mnop-qrst-uvwx-yz12`)

### **Step 2: Configure in Web App**

1. **Open Tournament Management**

   - Go to your tournament manage page
   - Click **"Live Streaming"** tab

2. **Set Stream Key**

   - The app will generate a YouTube stream key automatically
   - Or you can use your own YouTube stream key
   - Click **"Copy"** to copy the key

3. **Optional: Add Video ID**
   - Once your stream is live, get the video ID from the URL
   - Example: `youtube.com/watch?v=dQw4w9WgXcQ` → ID is `dQw4w9WgXcQ`
   - This embeds the live stream directly in the web app

### **Step 3: OBS Studio Setup**

1. **Open OBS Studio**

   - Download from [obsproject.com](https://obsproject.com)

2. **Configure Stream Settings**

   - Go to **Settings** → **Stream**
   - Set **Service** to **"YouTube / YouTube Gaming"**
   - **Server**: `rtmp://a.rtmp.youtube.com/live2`
   - **Stream Key**: Paste your YouTube stream key

3. **Recommended OBS Settings**

   ```
   Output Mode: Advanced
   Encoder: x264
   Rate Control: CBR
   Bitrate: 2500-4000 Kbps
   Keyframe Interval: 2 seconds
   Preset: Very Fast
   Profile: Main
   Tune: (none)
   ```

4. **Add Sources**

   - **Display Capture**: Capture your screen
   - **Webcam**: Add your face cam
   - **Audio**: Add microphone and system audio

5. **Start Streaming**
   - Click **"Start Streaming"** in OBS
   - Your stream will go live on YouTube

---

## 🎮 **Tournament Integration Features:**

### **Automatic Stream Management**

- ✅ **Auto-generated stream keys** for each tournament
- ✅ **Stream key regeneration** for security
- ✅ **YouTube video embedding** when live
- ✅ **Multi-platform support** (YouTube + other platforms)

### **User Experience**

- ✅ **Embedded live stream** directly in tournament page
- ✅ **Real-time chat** alongside the stream
- ✅ **Live betting** during matches
- ✅ **Mobile-friendly** viewing experience

### **Admin Controls**

- ✅ **Easy stream configuration** in tournament management
- ✅ **Stream key management** with copy/regenerate
- ✅ **YouTube dashboard integration** links
- ✅ **Stream status monitoring**

---

## 🔒 **Security & Best Practices:**

### **Stream Key Security**

- 🔐 **Auto-generated keys** for each tournament
- 🔐 **One-click regeneration** if compromised
- 🔐 **Secure storage** in database
- 🔐 **Admin-only access** to stream settings

### **YouTube Best Practices**

- 📺 **Use descriptive titles** for better discoverability
- 📺 **Add relevant tags** (Beyblade, Gaming, Tournament)
- 📺 **Set appropriate privacy** (Public/Unlisted/Private)
- 📺 **Enable chat moderation** for large audiences

### **Streaming Tips**

- 🎥 **Test your setup** before going live
- 🎥 **Check audio levels** and video quality
- 🎥 **Have a backup plan** (mobile streaming)
- 🎥 **Monitor chat** for engagement

---

## 🛠️ **Troubleshooting:**

### **Common Issues:**

**Stream not showing in web app:**

- Check if YouTube video ID is correct
- Ensure stream is actually live on YouTube
- Refresh the tournament page

**OBS connection issues:**

- Verify stream key is correct
- Check internet connection
- Try regenerating the stream key

**Poor stream quality:**

- Lower bitrate in OBS settings
- Check internet upload speed
- Use "Very Fast" preset in OBS

**Chat not working:**

- Ensure you're logged into the web app
- Check if tournament chat is enabled
- Refresh the page

### **Getting Help:**

- Check YouTube Live Help Center
- Review OBS Studio documentation
- Contact support if issues persist

---

## 🎉 **Benefits of YouTube Live:**

### **For Tournament Organizers:**

- 🌟 **Professional streaming** with high quality
- 🌟 **Built-in chat system** for audience interaction
- 🌟 **Automatic recording** and VOD creation
- 🌟 **Analytics and insights** about viewers
- 🌟 **Monetization options** (Super Chat, Memberships)

### **For Viewers:**

- 🌟 **High-quality video** with automatic quality adjustment
- 🌟 **Mobile app support** for watching anywhere
- 🌟 **Chat interaction** with other viewers
- 🌟 **VOD access** to watch later
- 🌟 **Multi-language support** and accessibility features

---

## 🚀 **Ready to Go Live!**

Your YouTube live streaming integration is now complete!

**Next Steps:**

1. ✅ Run the database setup script
2. ✅ Test the stream player in tournament management
3. ✅ Set up OBS Studio with YouTube settings
4. ✅ Go live with your first Beyblade tournament!

**Happy Streaming! 🎮📺✨**
