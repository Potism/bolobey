"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, X, Smartphone, Zap, Wifi, WifiOff } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Mobile-specific PWA detection
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    // Show install prompt for mobile devices even without beforeinstallprompt
    if (isMobile && !isInstalled) {
      // Delay showing the prompt to allow page to load
      const timer = setTimeout(() => {
        // For iOS, show custom instructions
        if (isIOS) {
          setShowInstallPrompt(true);
        }
        // For Android, wait for beforeinstallprompt or show after delay
        else if (isAndroid) {
          // If no beforeinstallprompt after 3 seconds, show custom prompt
          setTimeout(() => {
            if (!deferredPrompt) {
              setShowInstallPrompt(true);
            }
          }, 3000);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [isInstalled, deferredPrompt]);

  const handleInstallClick = async () => {
    // Try automatic installation first
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          console.log("User accepted the install prompt");
          setIsInstalled(true);
          setShowInstallPrompt(false);
        } else {
          console.log("User dismissed the install prompt");
          // If user dismisses, show manual instructions
          showManualInstallInstructions();
        }

        setDeferredPrompt(null);
      } catch (error) {
        console.error("Installation failed:", error);
        showManualInstallInstructions();
      }
    } else {
      // No automatic prompt available, show manual instructions
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      alert(
        "To install Bolobey:\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to install"
      );
    } else if (isAndroid) {
      alert(
        "To install Bolobey:\n1. Tap the menu (three dots)\n2. Tap 'Add to Home screen' or 'Install app'\n3. Tap 'Add' to install"
      );
    } else {
      alert(
        "To install Bolobey:\n1. Look for the install icon in your browser's address bar\n2. Click 'Install' or 'Add to Home Screen'"
      );
    }
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
      >
        <Card className="shadow-2xl border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Install Bolobey
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Install Bolobey as a mobile app for the best experience!
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>Faster loading</span>
                <span>•</span>
                <span>Offline support</span>
                <span>•</span>
                <span>Push notifications</span>
              </div>

              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <Wifi className="h-3 w-3" />
                    <span className="text-xs">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-orange-500">
                    <WifiOff className="h-3 w-3" />
                    <span className="text-xs">Offline</span>
                  </div>
                )}
                <Badge variant="secondary" className="text-xs">
                  PWA Ready
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                {/iPad|iPhone|iPod|Android/.test(navigator.userAgent)
                  ? "Install to Home Screen"
                  : "Install App"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                size="sm"
                className="border-border hover:bg-accent hover:text-accent-foreground"
              >
                Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for PWA functionality
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Check if app is installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    // Check for service worker updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setHasUpdate(true);
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const reloadForUpdate = () => {
    window.location.reload();
  };

  return {
    isInstalled,
    isOnline,
    hasUpdate,
    reloadForUpdate,
  };
}
