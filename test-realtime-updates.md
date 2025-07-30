# Real-Time Updates Test Guide

## Testing Real-Time Score Updates

### Setup

1. Open two browser tabs/windows
2. In Tab 1: Go to `/streaming-control/[tournamentId]` (replace with actual tournament ID)
3. In Tab 2: Go to `/streaming-overlay/[tournamentId]` (same tournament ID)

### Test Steps

#### Test 1: Basic Score Updates

1. In the streaming-control tab, create a match or use an existing one
2. Click the "+1" button for Player 1
3. **Expected Result**: The score should update instantly in both tabs
4. Click the "+1" button for Player 2
5. **Expected Result**: The score should update instantly in both tabs

#### Test 2: Visual Indicators

1. In the streaming-overlay tab, look for the green pulsing dot (●) next to "Updated: [time]"
2. **Expected Result**: The dot should pulse when scores are updated
3. In the streaming-control tab, click score buttons
4. **Expected Result**: Buttons should briefly show "Updating..." text

#### Test 3: Multiple Rapid Updates

1. Quickly click multiple "+1" buttons in succession
2. **Expected Result**: All updates should appear in real-time without delays
3. Check both tabs to ensure synchronization

#### Test 4: Network Disconnection Test

1. Temporarily disconnect your internet
2. Try to update scores
3. **Expected Result**: Should show error message
4. Reconnect internet
5. **Expected Result**: Should resume normal operation

### Troubleshooting

#### If updates are not real-time:

1. Check browser console for errors
2. Verify Supabase connection is active
3. Check if RLS policies are blocking updates
4. Ensure both tabs are using the same tournament ID

#### If updates are delayed:

1. Check network connection
2. Verify Supabase real-time is enabled
3. Check for any rate limiting
4. Ensure no duplicate prevention logic is blocking updates

### Performance Notes

- Updates should appear within 100-500ms
- No duplicate updates should occur
- Connection should remain stable during updates
- Memory usage should remain consistent

### Expected Console Logs

Look for these logs in the browser console:

- `[tabId] Setting up real-time connection for tournament: [tournamentId]`
- `[tabId] Real-time connection established`
- `[tabId] Match change detected in control: [payload]`
- `[tabId] Match update received: [payload]`
- `Score updated successfully: [player1Score] - [player2Score]`
