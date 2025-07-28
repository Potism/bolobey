"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import { Coins, Zap } from "lucide-react";

interface UserPoints {
  betting_points: number;
  stream_points: number;
}

interface UserPointsDisplayProps {
  variant?: "compact" | "detailed";
  className?: string;
}

export function UserPointsDisplay({
  variant = "compact",
  className = "",
}: UserPointsDisplayProps) {
  const { user } = useAuth();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserPoints = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_user_points_balance", {
        user_uuid: user?.id,
      });

      if (error) {
        console.error("Error fetching user points:", error);
        return;
      }

      // Handle both array and single object responses
      const pointsData = Array.isArray(data) ? data[0] : data;

      if (pointsData) {
        setPoints({
          betting_points: pointsData.betting_points || 0,
          stream_points: pointsData.stream_points || 0,
        });
      } else {
        setPoints({ betting_points: 0, stream_points: 0 });
      }
    } catch (error) {
      console.error("Error fetching user points:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
  }, [user, fetchUserPoints]);

  // Real-time subscription to user_points table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("user_points_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_points",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("User points changed:", payload);
          // Refresh points when they change
          fetchUserPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserPoints]);

  // Real-time subscription to point_transactions table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("point_transactions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "point_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Point transaction:", payload);
          // Refresh points when transactions occur
          fetchUserPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserPoints]);

  // Periodic refresh every 10 seconds (fallback)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchUserPoints();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [user, fetchUserPoints]);

  // Refresh when component becomes visible (for better UX)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchUserPoints();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, fetchUserPoints]);

  if (!user || loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!points) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="text-xs px-2 py-1">
          <Coins className="h-3 w-3 mr-1" />
          {points.betting_points?.toLocaleString() || 0}
        </Badge>
        <Badge variant="outline" className="text-xs px-2 py-1">
          <Zap className="h-3 w-3 mr-1" />
          {points.stream_points?.toLocaleString() || 0}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium">Betting Points</span>
        </div>
        <span className="text-sm font-bold">
          {points.betting_points?.toLocaleString() || 0}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium">Stream Points</span>
        </div>
        <span className="text-sm font-bold">
          {points.stream_points?.toLocaleString() || 0}
        </span>
      </div>
    </div>
  );
}
