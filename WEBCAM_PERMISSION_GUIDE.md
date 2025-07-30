# 🎥 Webcam Permission Guide

## **Common Webcam Permission Issues & Solutions**

### **🔍 Quick Diagnosis**

When you see "Failed to start webcam. Please check permissions", here's how to fix it:

---

## **🌐 Browser-Specific Solutions**

### **Chrome/Edge:**

1. **Look for camera icon** in the address bar (🔒 or 📷)
2. **Click the icon** → Select "Allow" for camera
3. **Refresh the page** and try again

### **Firefox:**

1. **Look for camera icon** in the address bar (🔒)
2. **Click the icon** → Select "Allow" for camera
3. **Refresh the page** and try again

### **Safari:**

1. **Go to Safari Preferences** → Websites → Camera
2. **Find your site** and set to "Allow"
3. **Refresh the page** and try again

---

## **🔧 Step-by-Step Fix**

### **Step 1: Check Browser Address Bar**

```
https://localhost:3000/streaming-control/...  🔒
```

- Look for **🔒** (lock icon) or **📷** (camera icon)
- Click it to see permission settings

### **Step 2: Grant Camera Permission**

- Select **"Allow"** for camera access
- **Don't select** "Block" or "Ask"

### **Step 3: Refresh and Retry**

- **Refresh the page** (F5 or Ctrl+R)
- Try **"Start Webcam"** again

---

## **🚨 Common Error Messages**

### **"NotAllowedError"**

- **Cause**: Permission denied
- **Fix**: Allow camera in browser settings

### **"NotFoundError"**

- **Cause**: No camera detected
- **Fix**: Connect a camera or check if it's working

### **"NotReadableError"**

- **Cause**: Camera in use by another app
- **Fix**: Close other apps using camera (Zoom, Teams, etc.)

### **"NotSupportedError"**

- **Cause**: Browser doesn't support getUserMedia
- **Fix**: Use Chrome, Firefox, or Edge

---

## **💻 System-Level Checks**

### **Windows:**

1. **Settings** → Privacy & Security → Camera
2. **Ensure "Camera access" is ON**
3. **Check if your app has permission**

### **macOS:**

1. **System Preferences** → Security & Privacy → Camera
2. **Add your browser** to the allowed list
3. **Restart browser** after changes

### **Linux:**

1. **Check if camera is detected**: `ls /dev/video*`
2. **Install v4l2**: `sudo apt install v4l-utils`
3. **Test camera**: `v4l2-ctl --list-devices`

---

## **🔍 Advanced Troubleshooting**

### **1. Check Camera Hardware:**

```bash
# Windows
wmic path win32_pnpentity where "name like '%camera%'" get name

# macOS
system_profiler SPCameraDataType

# Linux
ls /dev/video*
```

### **2. Test Camera in Browser:**

Visit: `https://webcamtests.com/`

- Tests camera permissions
- Shows camera feed
- Identifies issues

### **3. Browser Console Debug:**

Press `F12` → Console tab, then run:

```javascript
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => console.log("Camera works!"))
  .catch((error) => console.error("Camera error:", error));
```

---

## **🎯 Quick Fix Checklist**

- [ ] **Allow camera in browser** (click 🔒 icon)
- [ ] **Refresh the page** after allowing
- [ ] **Close other camera apps** (Zoom, Teams, etc.)
- [ ] **Check system camera settings**
- [ ] **Try different browser** (Chrome/Firefox)
- [ ] **Restart browser** completely
- [ ] **Check camera hardware** is working

---

## **📱 Mobile Devices**

### **iOS Safari:**

- Camera permissions are **automatic**
- No manual settings needed
- Works with HTTPS only

### **Android Chrome:**

- **Settings** → Site Settings → Camera
- **Allow** for your domain
- **Refresh page** after changes

---

## **🆘 Still Not Working?**

### **Contact Support:**

1. **Screenshot** the error message
2. **Note your browser** and version
3. **Check console** for error codes
4. **Try incognito/private mode**

### **Alternative Solutions:**

- **Use YouTube videos** instead of webcam
- **Try different camera** (external webcam)
- **Use different device** (phone/tablet)

---

## **✅ Success Indicators**

When webcam is working correctly:

- ✅ **"Webcam Active"** status shows
- ✅ **Green success message** appears
- ✅ **Camera feed** appears in overlay
- ✅ **No error messages** in console

---

**Need more help? Check the browser console (F12) for specific error messages!** 🚀
