"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  AlertCircle,
  Package,
  Settings,
  Filter,
  Search,
  Trash2,
  Gift,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

interface PrizeNotification {
  id: string;
  type: "redemption" | "status_update" | "low_stock" | "new_prize";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  data?: Record<string, unknown>;
}

export default function PrizeNotifications() {
  const [notifications, setNotifications] = useState<PrizeNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prize_notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const subscription = supabase
      .channel("prize_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "prize_notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          setNotifications((prev) => [
            payload.new as PrizeNotification,
            ...prev,
          ]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("prize_notifications")
        .update({ read: true })
        .eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await supabase
        .from("prize_notifications")
        .update({ read: true })
        .eq("user_id", user?.id)
        .eq("read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from("prize_notifications")
        .delete()
        .eq("id", notificationId);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case "redemption":
        return <Gift className={iconClass} />;
      case "status_update":
        return <Package className={iconClass} />;
      case "low_stock":
        return <AlertCircle className={iconClass} />;
      case "new_prize":
        return <Award className={iconClass} />;
      default:
        return <Package className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "redemption":
        return "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20";
      case "status_update":
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
      case "low_stock":
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "new_prize":
        return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
      default:
        return "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20";
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

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all" || notification.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="relative" ref={panelRef}>
      {/* Notification Bell */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 md:p-3"
        >
          <Package className="h-5 w-5 md:h-6 md:w-6" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1"
            >
              <Badge
                variant="destructive"
                className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center font-bold"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            </motion.div>
          )}
        </Button>
      </motion.div>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${
              isMobile
                ? "fixed inset-0 top-0 left-0 right-0 bottom-0 bg-background/80 backdrop-blur-sm"
                : "right-0 top-12 w-96"
            }`}
          >
            <Card
              className={`h-full shadow-2xl border-0 ${
                isMobile
                  ? "rounded-none m-4 max-h-[calc(100vh-2rem)]"
                  : "rounded-lg"
              }`}
            >
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">
                      Prize Notifications
                    </CardTitle>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={loading}
                        className="text-xs h-8 px-2"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {isMobile ? "" : "Mark all read"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search prize notifications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3">
                        <Filter className="h-4 w-4" />
                        {!isMobile && <span className="ml-1">Filter</span>}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFilterType("all")}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setFilterType("redemption")}
                      >
                        Redemptions
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilterType("status_update")}
                      >
                        Status Updates
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilterType("low_stock")}
                      >
                        Low Stock
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilterType("new_prize")}
                      >
                        New Prizes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-hidden">
                <div
                  className={`overflow-y-auto ${
                    isMobile ? "h-[calc(100vh-200px)]" : "h-96"
                  }`}
                >
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Loading...
                      </p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground font-medium">
                        No prize notifications
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchTerm || filterType !== "all"
                          ? "Try adjusting your search or filters"
                          : "You're all caught up with prizes!"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredNotifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div
                            className={`p-4 border-l-4 transition-all duration-200 hover:bg-muted/50 cursor-pointer ${
                              notification.read ? "opacity-75" : ""
                            } ${getNotificationColor(notification.type)}`}
                            onClick={() =>
                              !notification.read && markAsRead(notification.id)
                            }
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-medium text-foreground line-clamp-1">
                                        {notification.title}
                                      </p>
                                      {!notification.read && (
                                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs text-muted-foreground">
                                        {formatTimeAgo(notification.created_at)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs capitalize"
                                      >
                                        {notification.type.replace("_", " ")}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {!notification.read && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification.id);
                                        }}
                                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                                        >
                                          <Settings className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            markAsRead(notification.id)
                                          }
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Mark as read
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            deleteNotification(notification.id)
                                          }
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < filteredNotifications.length - 1 && (
                            <Separator />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
