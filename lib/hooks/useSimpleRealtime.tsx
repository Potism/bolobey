"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// Simple realtime subscription hook
export function useSimpleRealtime(
  table: string,
  filter: string,
  callback: (payload: any) => void,
  enabled = true
) {
  const channelRef = useRef(null);

  const subscribe = useCallback(() => {
    if (!enabled) return;

    try {
      const channelName = `${table}-${filter}-${Date.now()}`;

      // @ts-ignore - Supabase types are complex, but this works
      channelRef.current = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter,
          },
          callback
        )
        .subscribe();

      console.log(`Subscribed to ${table} changes`);
    } catch (error) {
      console.error("Error setting up realtime subscription:", error);
    }
  }, [table, filter, callback, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      // @ts-ignore
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      console.log(`Unsubscribed from ${table} changes`);
    }
  }, [table]);

  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [subscribe, unsubscribe]);

  return { subscribe, unsubscribe };
}

// Convenience hooks
export function useTournamentRealtime(
  tournamentId: string,
  callback: (payload: any) => void
) {
  return useSimpleRealtime("tournaments", `id=eq.${tournamentId}`, callback);
}

export function useMatchesRealtime(
  tournamentId: string,
  callback: (payload: any) => void
) {
  return useSimpleRealtime(
    "matches",
    `tournament_id=eq.${tournamentId}`,
    callback
  );
}

export function useBettingMatchesRealtime(
  tournamentId: string,
  callback: (payload: any) => void
) {
  return useSimpleRealtime(
    "betting_matches",
    `tournament_id=eq.${tournamentId}`,
    callback
  );
}

export function useUserPointsRealtime(
  userId: string,
  callback: (payload: any) => void
) {
  return useSimpleRealtime("user_points", `user_id=eq.${userId}`, callback);
}

export function usePointTransactionsRealtime(
  userId: string,
  callback: (payload: any) => void
) {
  return useSimpleRealtime(
    "point_transactions",
    `user_id=eq.${userId}`,
    callback
  );
}
