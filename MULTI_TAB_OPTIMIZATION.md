# 🔄 Multi-Tab Optimization Guide

## **Why Multiple Tabs Cause Lag**

### **🔍 Root Causes:**

#### **1. Real-time Subscription Conflicts:**

- **Problem**: Multiple tabs create identical channel names
- **Result**: Supabase sends duplicate events to all tabs
- **Impact**: Performance degradation and unnecessary processing

#### **2. Webcam Resource Conflicts:**

- **Problem**: Multiple tabs try to access the same camera
- **Result**: Permission conflicts and stream sharing issues
- **Impact**: Webcam failures and browser crashes

#### **3. Database Connection Overload:**

- **Problem**: Each tab creates its own database connections
- **Result**: Connection pool exhaustion
- **Impact**: Slow queries and timeouts

---

## **✅ Optimizations Implemented**

### **1. Unique Channel Names:**

```javascript
// Before: All tabs used the same channel name
.channel(`streaming-control-${tournamentId}`)

// After: Each tab has a unique channel name
.channel(`streaming-control-${tournamentId}-${tabId}`)
```

### **2. Tab-Specific Identifiers:**

```javascript
// Generate unique tab ID
const tabId = useMemo(() => {
  return `tab_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}, []);
```

### **3. Proper Resource Cleanup:**

```javascript
// Cleanup on tab close
window.addEventListener("beforeunload", handleBeforeUnload);

// Cleanup on component unmount
return () => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  stopWebcam();
};
```

### **4. Enhanced Logging:**

```javascript
// Tab-specific logging for debugging
console.log(`[${tabId}] Match change detected:`, payload);
```

---

## **🎯 Best Practices for Multiple Tabs**

### **✅ Recommended Setup:**

#### **1. Control + Overlay Pattern:**

```
Tab 1: Streaming Control (http://localhost:3000/streaming-control/...)
Tab 2: Streaming Overlay (http://localhost:3000/streaming-overlay/...)
```

- **Control tab**: Manage settings, scores, webcam
- **Overlay tab**: Display for OBS/streaming

#### **2. Single Control Tab:**

```
Tab 1: Streaming Control (primary)
Tab 2: Streaming Control (read-only for monitoring)
```

- **Primary tab**: Make changes
- **Secondary tab**: Monitor only

#### **3. Multiple Overlay Tabs:**

```
Tab 1: Control
Tab 2: Overlay (main)
Tab 3: Overlay (backup)
Tab 4: Overlay (mobile view)
```

---

## **🚨 What to Avoid**

### **❌ Don't Do This:**

#### **1. Multiple Control Tabs:**

- **Problem**: Conflicting webcam access
- **Problem**: Duplicate score updates
- **Problem**: Settings conflicts

#### **2. Same Tab Multiple Times:**

- **Problem**: Resource sharing issues
- **Problem**: State synchronization problems
- **Problem**: Performance degradation

#### **3. Mixed Control/Overlay:**

- **Problem**: Confusing user experience
- **Problem**: Unclear which tab is active
- **Problem**: Settings conflicts

---

## **🔧 Performance Monitoring**

### **Check Console Logs:**

```javascript
// Look for tab-specific logs
[tab_abc123_1234567890] Match change detected
[overlay_def456_1234567891] Tournament change detected
```

### **Monitor Webcam Status:**

```javascript
// Check webcam cleanup logs
[tab_abc123_1234567890] Stopping webcam stream
[tab_abc123_1234567890] Stopped track: video
```

### **Watch for Conflicts:**

```javascript
// Look for permission errors
NotAllowedError: Camera permission was denied
NotReadableError: Camera is already in use
```

---

## **⚡ Performance Tips**

### **1. Limit Active Tabs:**

- **Maximum**: 2-3 tabs per tournament
- **Recommended**: 1 control + 1 overlay
- **Avoid**: More than 5 tabs total

### **2. Close Unused Tabs:**

- **Close**: Inactive control tabs
- **Keep**: Active overlay tabs
- **Monitor**: Browser memory usage

### **3. Use Different Browsers:**

- **Control**: Chrome/Firefox
- **Overlay**: Edge/Safari
- **Mobile**: Mobile browser

### **4. Monitor System Resources:**

- **CPU**: Keep below 80%
- **Memory**: Monitor browser usage
- **Network**: Check connection stability

---

## **🛠️ Troubleshooting**

### **If Tabs Are Still Laggy:**

#### **1. Check Console:**

```bash
# Look for duplicate events
[tab_abc123] Match change detected
[tab_abc123] Match change detected  # Duplicate!
```

#### **2. Monitor Network:**

```bash
# Check WebSocket connections
# Should see unique channel names
streaming-control-tournamentId-tabId
streaming-overlay-tournamentId-tabId
```

#### **3. Restart Browser:**

```bash
# Clear all tabs and restart
# Start with single control tab
# Add overlay tab gradually
```

#### **4. Check Permissions:**

```bash
# Ensure camera permissions are granted
# Close other camera-using apps
# Restart browser if needed
```

---

## **📊 Expected Performance**

### **✅ With Optimizations:**

- **2-3 tabs**: Smooth performance
- **Real-time updates**: < 100ms delay
- **Webcam**: No conflicts
- **Memory usage**: Stable

### **❌ Without Optimizations:**

- **2+ tabs**: Significant lag
- **Real-time updates**: 1-5 second delays
- **Webcam**: Permission conflicts
- **Memory usage**: Increasing over time

---

## **🎯 Summary**

### **Key Improvements:**

1. **Unique channel names** prevent subscription conflicts
2. **Tab-specific IDs** enable proper resource management
3. **Enhanced cleanup** prevents memory leaks
4. **Better logging** helps with debugging

### **Best Practice:**

- **Use 1 control tab + 1 overlay tab**
- **Close unused tabs**
- **Monitor console for conflicts**
- **Restart browser if issues persist**

**The multi-tab optimization should eliminate lag and enable smooth operation with multiple tabs!** 🚀
