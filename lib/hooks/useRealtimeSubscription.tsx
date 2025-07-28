"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface RealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  onData?: (payload: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  table,
  filter,
  event = "*",
  schema = "public",
  onData,
  onError,
  enabled = true,
}: RealtimeSubscriptionOptions) {
  const channelRef = useRef(null);
  const isSubscribedRef = useRef(false);

  const subscribe = useCallback(() => {
    if (!enabled || isSubscribedRef.current) return;

    try {
      const channelName = `${table}-${filter || "all"}-${Date.now()}`;

      // Use the same pattern as existing code in the codebase
      channelRef.current = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event,
            schema,
            table,
            filter,
          },
          (payload) => {
            if (onData) {
              onData(payload);
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            isSubscribedRef.current = true;
            console.log(`Subscribed to ${table} changes`);
          } else if (status === "CHANNEL_ERROR") {
            console.error(`Failed to subscribe to ${table} changes`);
            isSubscribedRef.current = false;
            if (onError) {
              onError(new Error(`Failed to subscribe to ${table} changes`));
            }
          }
        });
    } catch (error) {
      console.error("Error setting up realtime subscription:", error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [table, filter, event, schema, onData, onError, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current && isSubscribedRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
      console.log(`Unsubscribed from ${table} changes`);
    }
  }, [table]);

  useEffect(() => {
    subscribe();

    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  // Resubscribe when options change
  useEffect(() => {
    if (enabled) {
      unsubscribe();
      subscribe();
    }
  }, [table, filter, event, schema, enabled]);

  return {
    isSubscribed: isSubscribedRef.current,
    subscribe,
    unsubscribe,
  };
}

// Convenience hooks for common use cases
export function useTournamentSubscription(
  tournamentId: string,
  onData?: (payload: any) => void
) {
  return useRealtimeSubscription({
    table: "tournaments",
    filter: `id=eq.${tournamentId}`,
    onData,
  });
}

export function useMatchesSubscription(
  tournamentId: string,
  onData?: (payload: any) => void
) {
  return useRealtimeSubscription({
    table: "matches",
    filter: `tournament_id=eq.${tournamentId}`,
    onData,
  });
}

export function useBettingMatchesSubscription(
  tournamentId: string,
  onData?: (payload: any) => void
) {
  return useRealtimeSubscription({
    table: "betting_matches",
    filter: `tournament_id=eq.${tournamentId}`,
    onData,
  });
}

export function useUserPointsSubscription(
  userId: string,
  onData?: (payload: any) => void
) {
  return useRealtimeSubscription({
    table: "user_points",
    filter: `user_id=eq.${userId}`,
    onData,
  });
}

export function usePointTransactionsSubscription(
  userId: string,
  onData?: (payload: any) => void
) {
  return useRealtimeSubscription({
    table: "point_transactions",
    filter: `user_id=eq.${userId}`,
    onData,
  });
}
