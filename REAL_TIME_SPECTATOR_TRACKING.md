# Real-Time Spectator Tracking System

## Overview

The tournament spectator count is now **REAL-TIME** and tracks actual users who are actively viewing the tournament page. This replaces the previous mock/random spectator count.

## Features

### ✅ Real-Time Tracking

- **Live Count**: Shows actual number of users currently viewing the tournament
- **Session-Based**: Tracks unique browser sessions (multiple tabs count as separate viewers)
- **Heartbeat System**: Updates every 2 minutes to keep track of active viewers
- **Auto-Cleanup**: Removes inactive spectators after 5 minutes of inactivity

### ✅ User Breakdown

- **Authenticated Users**: Count of signed-in users watching
- **Anonymous Users**: Count of guests/visitors watching
- **Total Active**: Combined count of all active spectators

### ✅ Smart Detection

- **Page Visibility**: Reduces heartbeat frequency when page is hidden
- **Browser Events**: Handles page unload and visibility changes
- **Session Management**: Unique session IDs prevent duplicate counting

## Database Setup

Run the SQL script to create the spectator tracking system:

```sql
-- Execute this in your Supabase SQL editor
\i create_tournament_spectators_table.sql
```

### Database Schema

```sql
-- Main table
tournament_spectators (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  user_id UUID REFERENCES auth.users(id), -- NULL for anonymous users
  session_id TEXT NOT NULL, -- Unique browser session
  user_agent TEXT,
  ip_address INET,
  joined_at TIMESTAMP,
  last_seen TIMESTAMP,
  is_active BOOLEAN DEFAULT true
)

-- View for easy queries
tournament_spectator_counts (
  tournament_id UUID,
  active_spectators INTEGER,
  authenticated_spectators INTEGER,
  anonymous_spectators INTEGER
)
```

## How It Works

### 1. User Visits Tournament Page

```typescript
// Automatically called when component mounts
const { spectatorCount } = useSpectatorTracking(tournamentId);
```

### 2. Spectator Added to Database

```sql
-- Called automatically
SELECT add_tournament_spectator(
  tournament_uuid := 'tournament-id',
  user_uuid := 'user-id-or-null',
  session_id_param := 'unique-session-id'
);
```

### 3. Real-Time Updates

```typescript
// Supabase subscription listens for changes
const channel = supabase.channel(`tournament_spectators_${tournamentId}`).on(
  "postgres_changes",
  {
    /* ... */
  },
  () => {
    fetchSpectatorCount(); // Updates UI
  }
);
```

### 4. Heartbeat System

```typescript
// Updates every 2 minutes to keep user "active"
setInterval(updateHeartbeat, 2 * 60 * 1000);
```

### 5. User Leaves Page

```typescript
// Called on component unmount or page unload
removeSpectator();
```

## UI Components

### SpectatorCounter Component

```typescript
<SpectatorCounter
  spectatorCount={spectatorCount}
  showDetails={true} // Shows authenticated vs anonymous breakdown
/>
```

### Live Dashboard Integration

```typescript
// In LiveTournamentDashboard
{
  spectatorCount ? (
    <SpectatorCounter spectatorCount={spectatorCount} showDetails={true} />
  ) : (
    // Fallback to simple count
    <div>Spectators: {stats.spectators}</div>
  );
}
```

## Real-Time Features

### ✅ Live Updates

- Count updates immediately when users join/leave
- Animated number changes with Framer Motion
- Live indicator with pulsing dot

### ✅ Session Management

- Each browser tab counts as a separate spectator
- Unique session IDs prevent duplicate counting
- Handles multiple users on same device

### ✅ Smart Inactivity Detection

- Users marked inactive after 5 minutes without heartbeat
- Automatic cleanup of old records
- Handles page visibility changes

## Performance Optimizations

### Database Indexes

```sql
-- Efficient queries
CREATE INDEX idx_tournament_spectators_tournament_id ON tournament_spectators(tournament_id);
CREATE INDEX idx_tournament_spectators_active ON tournament_spectators(is_active);
CREATE INDEX idx_tournament_spectators_last_seen ON tournament_spectators(last_seen);
```

### Heartbeat Optimization

- **Active Page**: Updates every 2 minutes
- **Hidden Page**: Updates every 5 minutes
- **Cleanup**: Runs every 10 minutes

### RLS Policies

```sql
-- Secure access control
CREATE POLICY "Allow public read access to spectator counts" ON tournament_spectators
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to add themselves as spectators" ON tournament_spectators
  FOR INSERT WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));
```

## Usage Examples

### Basic Implementation

```typescript
import { useSpectatorTracking } from "@/lib/hooks/useSpectatorTracking";

function TournamentPage({ tournamentId }) {
  const { spectatorCount } = useSpectatorTracking(tournamentId);

  return (
    <div>
      <h2>Live Spectators: {spectatorCount.active_spectators}</h2>
    </div>
  );
}
```

### Advanced Implementation

```typescript
function TournamentDashboard({ tournamentId }) {
  const { spectatorCount, isTracking } = useSpectatorTracking(tournamentId);

  return (
    <SpectatorCounter spectatorCount={spectatorCount} showDetails={true} />
  );
}
```

## Monitoring & Debugging

### Check Active Spectators

```sql
-- View current spectator counts
SELECT * FROM tournament_spectator_counts WHERE tournament_id = 'your-tournament-id';

-- View detailed spectator data
SELECT * FROM tournament_spectators
WHERE tournament_id = 'your-tournament-id'
  AND is_active = true
  AND last_seen > NOW() - INTERVAL '5 minutes';
```

### Cleanup Old Records

```sql
-- Manual cleanup
SELECT cleanup_old_spectators();
```

### Debug Spectator Tracking

```typescript
// In browser console
console.log("Spectator count:", spectatorCount);
console.log("Is tracking:", isTracking);
```

## Benefits

### ✅ Accurate Analytics

- Real viewer counts instead of fake numbers
- Track engagement over time
- Identify popular tournaments

### ✅ User Experience

- Live spectator count creates excitement
- Shows tournament popularity
- Encourages social engagement

### ✅ Technical Benefits

- Efficient database queries
- Real-time updates
- Scalable architecture

## Migration from Mock Data

The system automatically replaces the previous mock spectator count:

```typescript
// OLD (Mock)
spectators: Math.floor(Math.random() * 50) + 10;

// NEW (Real-time)
spectators: spectatorCount.active_spectators;
```

## Future Enhancements

### Potential Features

- **Geographic Tracking**: Show where spectators are from
- **Peak Times**: Track when tournaments are most popular
- **Engagement Metrics**: Track how long users stay
- **Social Features**: Show who's watching (with permission)

### Analytics Dashboard

- Real-time spectator graphs
- Tournament popularity trends
- User engagement metrics

---

**The spectator count is now REAL and updates in real-time! 🎉**
