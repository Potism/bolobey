# 🚚 Shipping Address & Enhanced Notifications Setup Guide

## 📋 Overview

This guide will help you set up the new shipping address fields and enhanced notification system for your Bolobey tournament platform. These features enable:

- **Shipping Address Management**: Players can add their shipping information for prize delivery
- **Enhanced Notifications**: Comprehensive notification system for betting wins and prize status updates
- **Admin Shipping Management**: Admin interface to manage prize shipments and tracking

---

## 🗄️ Database Setup

### Step 1: Add User Address Fields

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add address and phone number fields to users table for shipping prizes
-- Run this in Supabase SQL Editor

-- Add shipping address fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state_province TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Philippines';

-- Create index for better performance on address searches
CREATE INDEX IF NOT EXISTS idx_users_shipping_address ON users(shipping_address) WHERE shipping_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;

-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    display_name,
    shipping_address,
    phone_number,
    city,
    state_province,
    postal_code,
    country
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'shipping_address',
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'state_province',
    NEW.raw_user_meta_data ->> 'postal_code',
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'Philippines')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Create Enhanced Notification System

Run the following SQL to set up the comprehensive notification system:

```sql
-- Enhanced Notification System for Betting Wins and Prize Approvals
-- Run this in Supabase SQL Editor

-- 1. Create comprehensive notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'bet_won',
    'bet_lost',
    'bet_placed',
    'prize_redemption',
    'prize_approved',
    'prize_shipped',
    'prize_delivered',
    'tournament_start',
    'tournament_end',
    'match_start',
    'match_result',
    'points_awarded',
    'achievement_unlocked',
    'system_announcement'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB, -- Store additional data like bet amounts, prize details, etc.
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON user_notifications(priority);

-- 3. Enable Row Level Security
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "Users can read their own notifications" ON user_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON user_notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for users" ON user_notifications
  FOR INSERT WITH CHECK (true);

-- 5. Create notification functions

-- Function to create betting notifications
CREATE OR REPLACE FUNCTION create_betting_notification(
  user_uuid UUID,
  notification_type TEXT,
  bet_amount INTEGER,
  match_details JSONB
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  title_text TEXT;
  message_text TEXT;
BEGIN
  -- Set title and message based on notification type
  CASE notification_type
    WHEN 'bet_won' THEN
      title_text := '🎉 Bet Won!';
      message_text := format('Congratulations! You won %s points on your bet!', bet_amount);
    WHEN 'bet_lost' THEN
      title_text := '😔 Bet Lost';
      message_text := format('Your bet of %s points was not successful this time.', bet_amount);
    WHEN 'bet_placed' THEN
      title_text := '✅ Bet Placed';
      message_text := format('Your bet of %s points has been placed successfully.', bet_amount);
    ELSE
      title_text := 'Betting Update';
      message_text := 'Your betting status has been updated.';
  END CASE;

  -- Insert notification
  INSERT INTO user_notifications (user_id, type, title, message, data, priority)
  VALUES (
    user_uuid,
    notification_type,
    title_text,
    message_text,
    jsonb_build_object(
      'bet_amount', bet_amount,
      'match_details', match_details,
      'timestamp', NOW()
    ),
    CASE WHEN notification_type = 'bet_won' THEN 'high' ELSE 'normal' END
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create prize notifications
CREATE OR REPLACE FUNCTION create_prize_notification(
  user_uuid UUID,
  notification_type TEXT,
  prize_name TEXT,
  redemption_id UUID,
  additional_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  title_text TEXT;
  message_text TEXT;
BEGIN
  -- Set title and message based on notification type
  CASE notification_type
    WHEN 'prize_redemption' THEN
      title_text := '🎁 Prize Redemption';
      message_text := format('Your redemption for "%s" has been submitted and is under review.', prize_name);
    WHEN 'prize_approved' THEN
      title_text := '✅ Prize Approved!';
      message_text := format('Your redemption for "%s" has been approved and will be shipped soon!', prize_name);
    WHEN 'prize_shipped' THEN
      title_text := '📦 Prize Shipped!';
      message_text := format('Your "%s" has been shipped! Check your email for tracking details.', prize_name);
    WHEN 'prize_delivered' THEN
      title_text := '🎉 Prize Delivered!';
      message_text := format('Your "%s" has been delivered! Enjoy your prize!', prize_name);
    ELSE
      title_text := 'Prize Update';
      message_text := format('Update regarding your "%s" redemption.', prize_name);
  END CASE;

  -- Insert notification
  INSERT INTO user_notifications (user_id, type, title, message, data, priority)
  VALUES (
    user_uuid,
    notification_type,
    title_text,
    message_text,
    jsonb_build_object(
      'prize_name', prize_name,
      'redemption_id', redemption_id,
      'timestamp', NOW()
    ) || additional_data,
    CASE
      WHEN notification_type IN ('prize_approved', 'prize_shipped', 'prize_delivered') THEN 'high'
      ELSE 'normal'
    END
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_notifications
  SET read = TRUE
  WHERE id = notification_uuid AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET read = TRUE
  WHERE user_id = auth.uid() AND read = FALSE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for automatic notifications

-- Trigger for bet results
CREATE OR REPLACE FUNCTION trigger_bet_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification when bet status changes
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'won' THEN
        PERFORM create_betting_notification(
          NEW.user_id,
          'bet_won',
          NEW.points_wagered,
          jsonb_build_object(
            'match_id', NEW.match_id,
            'potential_winnings', NEW.potential_winnings,
            'bet_on_player_id', NEW.bet_on_player_id
          )
        );
      WHEN 'lost' THEN
        PERFORM create_betting_notification(
          NEW.user_id,
          'bet_lost',
          NEW.points_wagered,
          jsonb_build_object(
            'match_id', NEW.match_id,
            'bet_on_player_id', NEW.bet_on_player_id
          )
        );
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bet notifications
CREATE TRIGGER bet_notifications_trigger
  AFTER UPDATE ON user_bets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bet_notifications();

-- Trigger for prize redemption status changes
CREATE OR REPLACE FUNCTION trigger_prize_notifications()
RETURNS TRIGGER AS $$
DECLARE
  prize_name TEXT;
BEGIN
  -- Get prize name
  SELECT name INTO prize_name FROM prizes WHERE id = NEW.prize_id;

  -- Create notification when redemption status changes
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'approved' THEN
        PERFORM create_prize_notification(
          NEW.user_id,
          'prize_approved',
          prize_name,
          NEW.id,
          jsonb_build_object('admin_notes', NEW.admin_notes)
        );
      WHEN 'shipped' THEN
        PERFORM create_prize_notification(
          NEW.user_id,
          'prize_shipped',
          prize_name,
          NEW.id,
          jsonb_build_object('tracking_number', NEW.tracking_number)
        );
      WHEN 'delivered' THEN
        PERFORM create_prize_notification(
          NEW.user_id,
          'prize_delivered',
          prize_name,
          NEW.id
        );
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for prize notifications
CREATE TRIGGER prize_notifications_trigger
  AFTER UPDATE ON prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_prize_notifications();

-- 7. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- 8. Create view for unread notification count
CREATE VIEW user_unread_notifications_count AS
SELECT
  user_id,
  COUNT(*) as unread_count,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count
FROM user_notifications
WHERE read = FALSE
GROUP BY user_id;
```

---

## 🎨 Frontend Components

### Step 3: Update TypeScript Types

The types have been updated in `lib/types.ts` to include the new fields:

```typescript
export interface User {
  id: string;
  email: string;
  display_name: string;
  role: "player" | "admin";
  avatar_url: string | null;
  shipping_address?: string;
  phone_number?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type:
    | "bet_won"
    | "bet_lost"
    | "bet_placed"
    | "prize_redemption"
    | "prize_approved"
    | "prize_shipped"
    | "prize_delivered"
    | "tournament_start"
    | "tournament_end"
    | "match_start"
    | "match_result"
    | "points_awarded"
    | "achievement_unlocked"
    | "system_announcement";
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
}

export interface UnreadNotificationCount {
  user_id: string;
  unread_count: number;
  urgent_count: number;
  high_priority_count: number;
}
```

### Step 4: Add Components to Your App

#### A. User Profile Form

Add the `UserProfileForm` component to allow users to update their shipping information:

```tsx
// In your profile page or settings
import { UserProfileForm } from "@/components/user-profile-form";

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8">
      <UserProfileForm />
    </div>
  );
}
```

#### B. Enhanced Notifications

Replace the existing notification component with the enhanced version:

```tsx
// In your navigation or layout
import { EnhancedNotifications } from "@/components/enhanced-notifications";

export default function Navigation() {
  return (
    <nav>
      {/* Other navigation items */}
      <EnhancedNotifications />
    </nav>
  );
}
```

#### C. Admin Shipping Management

Add the admin shipping management component to your admin panel:

```tsx
// In your admin prizes page
import { AdminPrizesShipping } from "@/components/admin-prizes-shipping";

export default function AdminPrizesPage() {
  return (
    <div className="container mx-auto py-8">
      <AdminPrizesShipping />
    </div>
  );
}
```

---

## 🔧 Integration Steps

### Step 5: Update Prize Redemption Flow

When users redeem prizes, ensure the shipping address is collected:

```tsx
// In your prize redemption component
const handlePrizeRedemption = async (prizeId: string) => {
  // Check if user has shipping information
  if (!user.shipping_address) {
    // Redirect to profile page to add shipping info
    router.push("/profile");
    return;
  }

  // Proceed with redemption
  // ... existing redemption logic
};
```

### Step 6: Add Notification Bell to Navigation

Update your navigation component to include the notification bell:

```tsx
// In your navigation component
import { EnhancedNotifications } from "@/components/enhanced-notifications";

export default function Navigation() {
  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        {/* Logo and other nav items */}
      </div>

      <div className="flex items-center gap-4">
        <EnhancedNotifications />
        {/* Other nav items */}
      </div>
    </nav>
  );
}
```

---

## 🎯 Features Overview

### For Players:

1. **Profile Management**: Add/update shipping address and phone number
2. **Real-time Notifications**: Get notified about:
   - Bet wins and losses
   - Prize redemption status updates
   - Tournament announcements
   - Points awarded
3. **Shipping Information**: Complete address form for prize delivery

### For Admins:

1. **Shipping Management**: View all prize redemptions with shipping details
2. **Status Updates**: Update redemption status (pending → approved → shipped → delivered)
3. **Tracking Information**: Add tracking numbers and admin notes
4. **Customer Details**: View complete customer information for shipping

### Notification Types:

- **Betting**: `bet_won`, `bet_lost`, `bet_placed`
- **Prizes**: `prize_redemption`, `prize_approved`, `prize_shipped`, `prize_delivered`
- **Tournaments**: `tournament_start`, `tournament_end`, `match_start`, `match_result`
- **System**: `points_awarded`, `achievement_unlocked`, `system_announcement`

---

## 🚀 Testing

### Test User Profile Updates:

1. Go to profile page
2. Add shipping address and phone number
3. Save changes
4. Verify data is stored in database

### Test Notifications:

1. Place a bet and win/lose
2. Check for betting notifications
3. Redeem a prize
4. Update prize status as admin
5. Check for prize notifications

### Test Admin Shipping:

1. Login as admin
2. Go to prizes management
3. View redemption details
4. Update status and add tracking
5. Verify notifications are sent

---

## 🔍 Troubleshooting

### Common Issues:

1. **Notifications not appearing**: Check if triggers are created properly
2. **Address fields not saving**: Verify RLS policies allow user updates
3. **Admin access denied**: Ensure user has admin role in database

### Database Checks:

```sql
-- Check if address fields exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('shipping_address', 'phone_number', 'city');

-- Check if notifications table exists
SELECT * FROM user_notifications LIMIT 1;

-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('bet_notifications_trigger', 'prize_notifications_trigger');
```

---

## 📈 Next Steps

After implementing these features, consider:

1. **Email Notifications**: Send email notifications for important updates
2. **SMS Notifications**: Send SMS for urgent notifications
3. **Push Notifications**: Implement browser push notifications
4. **Shipping Integration**: Integrate with shipping providers for automatic tracking
5. **Analytics**: Track notification engagement and shipping metrics

---

## 🎉 Success!

Your Bolobey platform now has:

✅ **Complete shipping address management**  
✅ **Real-time notification system**  
✅ **Admin shipping management interface**  
✅ **Automatic notifications for betting and prizes**  
✅ **Enhanced user experience**

Players can now receive prizes at their doorstep, and admins can efficiently manage the entire shipping process!
