# 🧪 YouTube Streaming Integration Test Checklist

## ✅ **Pre-Setup Tests**

### **Database Setup**

- [ ] Run `youtube_stream_setup.sql` in Supabase SQL Editor
- [ ] Verify new columns added to tournaments table:
  - [ ] `youtube_video_id`
  - [ ] `youtube_channel_id`
  - [ ] `youtube_stream_key`
  - [ ] `stream_platform`
- [ ] Check functions are created:
  - [ ] `generate_youtube_stream_key()`
  - [ ] `get_or_generate_youtube_stream_key(UUID)`
  - [ ] `regenerate_youtube_stream_key(UUID)`
  - [ ] `update_youtube_stream_settings(UUID, TEXT, TEXT, TEXT)`
  - [ ] `get_youtube_stream_info(UUID)`

### **Component Tests**

- [ ] Verify `YouTubeStreamPlayer` component loads without errors
- [ ] Check all imports are working correctly
- [ ] Test component renders in tournament management page

---

## 🎯 **Functionality Tests**

### **Stream Key Generation**

- [ ] Navigate to tournament manage page
- [ ] Click "Live Streaming" tab
- [ ] Verify YouTube stream player appears
- [ ] Check if stream key is auto-generated
- [ ] Test "Copy" button functionality
- [ ] Test "Show/Hide" stream key toggle
- [ ] Test "Regenerate" stream key button

### **YouTube Video ID Input**

- [ ] Enter a test YouTube video ID
- [ ] Verify input field accepts the ID
- [ ] Test with valid YouTube video ID format
- [ ] Check placeholder text is helpful

### **OBS Integration**

- [ ] Copy generated stream key
- [ ] Open OBS Studio
- [ ] Go to Settings → Stream
- [ ] Set Service to "YouTube / YouTube Gaming"
- [ ] Enter server: `rtmp://a.rtmp.youtube.com/live2`
- [ ] Paste stream key
- [ ] Verify OBS accepts the settings

---

## 🎮 **Tournament Integration Tests**

### **Admin Interface**

- [ ] Verify YouTube player appears in streaming tab
- [ ] Check both YouTube and legacy OBS players are shown
- [ ] Test stream key management features
- [ ] Verify YouTube dashboard link works
- [ ] Check setup instructions are clear

### **User Experience**

- [ ] Navigate to tournament page as regular user
- [ ] Check if stream player is visible (if configured)
- [ ] Test embedded YouTube player functionality
- [ ] Verify "Watch on YouTube Live" button works
- [ ] Test mobile responsiveness

### **Real-time Features**

- [ ] Test live stream embedding when YouTube video ID is set
- [ ] Verify stream appears when tournament is "in_progress"
- [ ] Check live badge animation works
- [ ] Test stream player fallback when no video ID

---

## 🔧 **Technical Tests**

### **Database Functions**

```sql
-- Test stream key generation
SELECT generate_youtube_stream_key();

-- Test getting stream key for tournament
SELECT get_or_generate_youtube_stream_key('your-tournament-id');

-- Test regenerating stream key
SELECT regenerate_youtube_stream_key('your-tournament-id');

-- Test updating stream settings
SELECT update_youtube_stream_settings(
  'your-tournament-id',
  'test-video-id',
  'test-channel-id',
  'test-stream-key'
);

-- Test getting stream info
SELECT get_youtube_stream_info('your-tournament-id');
```

### **Error Handling**

- [ ] Test with invalid tournament ID
- [ ] Test with missing permissions
- [ ] Test network connectivity issues
- [ ] Verify error messages are user-friendly

---

## 📱 **Cross-Platform Tests**

### **Desktop Browser**

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### **Mobile Browser**

- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Mobile responsiveness
- [ ] Touch interactions

### **OBS Studio**

- [ ] Windows OBS
- [ ] macOS OBS
- [ ] Linux OBS
- [ ] Stream key compatibility

---

## 🎥 **YouTube Live Tests**

### **Stream Setup**

- [ ] Create YouTube Live stream
- [ ] Get YouTube stream key
- [ ] Configure OBS with YouTube settings
- [ ] Start test stream
- [ ] Verify stream appears on YouTube

### **Embedding**

- [ ] Get YouTube video ID from live stream
- [ ] Enter video ID in web app
- [ ] Verify embedded player shows live stream
- [ ] Test fullscreen functionality
- [ ] Check autoplay settings

### **Chat Integration**

- [ ] Test YouTube chat alongside web app chat
- [ ] Verify both chat systems work independently
- [ ] Check chat moderation features

---

## 🚀 **Production Readiness**

### **Performance**

- [ ] Page load time with YouTube player
- [ ] Memory usage with embedded stream
- [ ] Network bandwidth usage
- [ ] Mobile data consumption

### **Security**

- [ ] Stream key encryption
- [ ] Admin-only access to stream settings
- [ ] Secure key regeneration
- [ ] No sensitive data in client-side code

### **Scalability**

- [ ] Multiple concurrent streams
- [ ] Large tournament participation
- [ ] High viewer count handling
- [ ] Database performance under load

---

## 📋 **Test Results Summary**

### **Passed Tests:**

- [ ] List all passed tests here

### **Failed Tests:**

- [ ] List any failed tests with details

### **Issues Found:**

- [ ] Document any issues discovered

### **Recommendations:**

- [ ] List any improvements needed

---

## ✅ **Final Checklist**

- [ ] All database functions working
- [ ] YouTube player component functional
- [ ] OBS integration tested
- [ ] Admin interface complete
- [ ] User experience smooth
- [ ] Mobile compatibility verified
- [ ] Security measures in place
- [ ] Documentation complete
- [ ] Ready for production use

**Status: 🟢 Ready / 🟡 Needs Work / 🔴 Not Ready**

---

## 🎉 **Success Criteria**

The YouTube streaming integration is considered successful when:

1. ✅ Admins can easily configure YouTube streams
2. ✅ Stream keys are generated and managed securely
3. ✅ Live streams embed properly in the web app
4. ✅ OBS Studio integration works seamlessly
5. ✅ Users can watch streams on both web app and YouTube
6. ✅ Mobile experience is smooth and responsive
7. ✅ All security measures are properly implemented

**🎮 Ready to go live with your Beyblade tournaments! 📺✨**
