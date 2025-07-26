"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  X,
  CheckCircle,
  Package,
  Truck,
  Trophy,
  Coins,
  Target,
  Star,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import { UserNotification, UnreadNotificationCount } from "@/lib/types";

interface EnhancedNotificationsProps {
  className?: string;
}

export function EnhancedNotifications({
  className,
}: EnhancedNotificationsProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] =
    useState<UnreadNotificationCount | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from("user_unread_notifications_count")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setUnreadCount(data);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const subscribeToNotifications = () => {
    const subscription = supabase
      .channel("user_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          setNotifications((prev) => [
            payload.new as UserNotification,
            ...prev,
          ]);
          fetchUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchNotifications();
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc("mark_notification_read", {
        notification_uuid: notificationId,
      });

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "bet_won":
        return <Trophy className="h-4 w-4 text-green-600" />;
      case "bet_lost":
        return <Target className="h-4 w-4 text-red-600" />;
      case "bet_placed":
        return <Target className="h-4 w-4 text-blue-600" />;
      case "prize_redemption":
        return <Package className="h-4 w-4 text-purple-600" />;
      case "prize_approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "prize_shipped":
        return <Truck className="h-4 w-4 text-blue-600" />;
      case "prize_delivered":
        return <Package className="h-4 w-4 text-green-600" />;
      case "points_awarded":
        return <Coins className="h-4 w-4 text-yellow-600" />;
      case "tournament_start":
      case "tournament_end":
        return <Trophy className="h-4 w-4 text-orange-600" />;
      case "match_start":
      case "match_result":
        return <Target className="h-4 w-4 text-blue-600" />;
      case "achievement_unlocked":
        return <Star className="h-4 w-4 text-yellow-600" />;
      case "system_announcement":
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "bet_won":
      case "prize_approved":
      case "prize_delivered":
        return "border-l-green-500 bg-green-50";
      case "bet_lost":
        return "border-l-red-500 bg-red-50";
      case "prize_shipped":
        return "border-l-blue-500 bg-blue-50";
      case "prize_redemption":
        return "border-l-purple-500 bg-purple-50";
      case "points_awarded":
      case "achievement_unlocked":
        return "border-l-yellow-500 bg-yellow-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const totalUnread = unreadCount?.unread_count || 0;
  const hasUrgent = (unreadCount?.urgent_count || 0) > 0;
  const hasHighPriority = (unreadCount?.high_priority_count || 0) > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <Badge
            variant={
              hasUrgent
                ? "destructive"
                : hasHighPriority
                ? "default"
                : "secondary"
            }
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {totalUnread > 99 ? "99+" : totalUnread}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {totalUnread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`p-4 border-l-4 transition-colors hover:bg-muted/50 ${
                          notification.read ? "opacity-75" : ""
                        } ${getNotificationColor(notification.type)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(notification.created_at)}
                                  </span>
                                  {notification.priority === "urgent" && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      Urgent
                                    </Badge>
                                  )}
                                  {notification.priority === "high" && (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      High
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
