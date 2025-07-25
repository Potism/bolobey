"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle, XCircle } from "lucide-react";

export function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    // Check if notifications are supported
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(subscription !== null);
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser");
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        await subscribeToPush();
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not supported");
      }

      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      });

      console.log("Push subscription created:", subscription);
      setIsSubscribed(true);

      // Send subscription to server (you'll need to implement this)
      await sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      alert("Failed to enable push notifications");
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not supported");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        console.log("Push subscription removed");

        // Remove subscription from server (you'll need to implement this)
        await removeSubscriptionFromServer();
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: "current-user-id", // Replace with actual user ID
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      console.log("Subscription saved to server");
    } catch (error) {
      console.error("Error sending subscription to server:", error);
    }
  };

  const removeSubscriptionFromServer = async () => {
    try {
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "current-user-id", // Replace with actual user ID
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove subscription");
      }

      console.log("Subscription removed from server");
    } catch (error) {
      console.error("Error removing subscription from server:", error);
    }
  };

  const sendTestNotification = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not supported");
      }

      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification("Bolobey Tournament", {
        body: "This is a test notification from Bolobey!",
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: {
          url: "/tournaments",
        },
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      alert("Failed to send test notification");
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="text-xs text-muted-foreground">
              {permission === "granted"
                ? "Notifications enabled"
                : permission === "denied"
                ? "Notifications blocked"
                : "Permission not requested"}
            </p>
          </div>
          <Badge variant={permission === "granted" ? "default" : "secondary"}>
            {permission === "granted" ? (
              <CheckCircle className="mr-1 h-3 w-3" />
            ) : (
              <XCircle className="mr-1 h-3 w-3" />
            )}
            {permission}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Subscription</p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? "Subscribed to push notifications"
                : "Not subscribed"}
            </p>
          </div>
          <Badge variant={isSubscribed ? "default" : "secondary"}>
            {isSubscribed ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="flex gap-2">
          {permission !== "granted" ? (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </Button>
          ) : isSubscribed ? (
            <>
              <Button
                onClick={unsubscribeFromPush}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <BellOff className="mr-2 h-4 w-4" />
                Disable
              </Button>
              <Button onClick={sendTestNotification} size="sm">
                Test
              </Button>
            </>
          ) : (
            <Button
              onClick={subscribeToPush}
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              <Bell className="mr-2 h-4 w-4" />
              Subscribe
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Get notified about:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Tournament updates and results</li>
            <li>Match start times and reminders</li>
            <li>New tournament announcements</li>
            <li>Important tournament changes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
