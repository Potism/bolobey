# Push Notification Testing Guide

## Current Status

✅ Service Worker: Working
✅ PWA Manifest: Working  
✅ Push Component: Working
❌ VAPID Keys: Missing (needs to be generated)

## How to Test Push Notifications

### 1. Access the Demo

- Go to: http://localhost:3002/demo-tournament
- Scroll down to "Push Notification Settings" section

### 2. Test Steps

1. **Check Browser Support**

   - Component will show if notifications are supported
   - Should work in Chrome, Firefox, Edge

2. **Enable Notifications**

   - Click "Enable Notifications" button
   - Browser will ask for permission
   - Click "Allow"

3. **Subscribe to Push**

   - Click "Subscribe" button
   - Should show "Active" status
   - Check browser console for subscription details

4. **Test Notification**
   - Click "Test" button
   - Should show a test notification
   - Click notification to open app

### 3. What Works Now

- ✅ Permission requests
- ✅ Service Worker registration
- ✅ Local test notifications
- ✅ Notification display

### 4. What Needs VAPID Keys

- ❌ Real push notifications from server
- ❌ Background notifications
- ❌ Tournament event notifications

## To Enable Full Push Notifications

### Generate VAPID Keys:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Add to .env file:
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

### Update Server:

- Add VAPID private key to server
- Implement notification sending logic
- Connect to tournament events

## Current Implementation Details

### Service Worker (`public/sw.js`)

- Handles push events
- Shows notifications
- Manages notification clicks

### Push Component (`components/push-notification-toggle.tsx`)

- Manages subscription state
- Handles permission requests
- Provides test functionality

### API Routes

- `/api/push/subscribe` - Saves subscription (currently just logs)
- `/api/push/unsubscribe` - Removes subscription (currently just logs)

## Next Steps for Production

1. Generate VAPID keys
2. Store subscriptions in database
3. Implement notification triggers
4. Add tournament event notifications
