"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface RealTimeConfig {
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  throttleMs?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableCrossTabSync?: boolean;
}

interface RealTimeState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  retryCount: number;
}

export function useOptimizedRealTime<T>(
  config: RealTimeConfig,
  onUpdate?: (data: T, payload: any) => void
) {
  const {
    table,
    filter,
    event = "*",
    throttleMs = 100,
    maxRetries = 3,
    retryDelay = 1000,
    enableCrossTabSync = true,
  } = config;

  const [state, setState] = useState<RealTimeState<T>>({
    data: null,
    loading: true,
    error: null,
    isConnected: false,
    lastUpdate: null,
    retryCount: 0,
  });

  const channelRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef<number>(0);

  // Generate unique channel name to prevent conflicts
  const channelName = useMemo(() => {
    return `realtime-${table}-${filter || "all"}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }, [table, filter]);

  // Cross-tab synchronization using BroadcastChannel
  const broadcastChannel = useMemo(() => {
    if (!enableCrossTabSync || typeof window === "undefined") return null;
    try {
      return new BroadcastChannel(`bolobey-realtime-${table}`);
    } catch (error) {
      console.warn(
        "BroadcastChannel not supported, falling back to localStorage"
      );
      return null;
    }
  }, [table, enableCrossTabSync]);

  // Optimized data fetching with timeout and retry
  const fetchData = useCallback(
    async (signal?: AbortSignal): Promise<T | null> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const query = supabase.from(table).select("*");
        if (filter) {
          query.filter(filter);
        }

        const { data, error } = await query;

        clearTimeout(timeoutId);

        if (signal?.aborted) {
          throw new Error("Request aborted");
        }

        if (error) throw error;
        return data as T;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    },
    [table, filter]
  );

  // Throttled update handler
  const handleUpdate = useCallback(
    (payload: any) => {
      const now = Date.now();
      if (now - lastEventTimeRef.current < throttleMs) {
        // Throttle the update
        if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current);
        }
        throttleTimeoutRef.current = setTimeout(() => {
          handleUpdate(payload);
        }, throttleMs);
        return;
      }

      lastEventTimeRef.current = now;

      setState((prev) => ({
        ...prev,
        data: payload.new || payload.old,
        lastUpdate: new Date(),
        error: null,
      }));

      onUpdate?.(payload.new || payload.old, payload);
    },
    [throttleMs, onUpdate]
  );

  // Connection management with retry logic
  const connect = useCallback(async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Initial data fetch
      const initialData = await fetchData();
      setState((prev) => ({
        ...prev,
        data: initialData,
        loading: false,
        lastUpdate: new Date(),
      }));

      // Setup real-time subscription
      const channel = supabase
        .channel(channelName)
        .on("system", { event: "disconnect" }, () => {
          console.log(`[${channelName}] Connection lost`);
          setState((prev) => ({ ...prev, isConnected: false }));
        })
        .on("system", { event: "connect" }, () => {
          console.log(`[${channelName}] Connection established`);
          setState((prev) => ({ ...prev, isConnected: true, retryCount: 0 }));
        })
        .on(
          "postgres_changes",
          {
            event,
            schema: "public",
            table,
            filter,
          },
          handleUpdate
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setState((prev) => ({ ...prev, isConnected: true, retryCount: 0 }));
          } else if (status === "CHANNEL_ERROR") {
            handleConnectionError();
          }
        });

      channelRef.current = channel;
    } catch (error) {
      handleConnectionError(error as Error);
    }
  }, [channelName, table, filter, event, fetchData, handleUpdate]);

  // Error handling with exponential backoff
  const handleConnectionError = useCallback(
    (error?: Error) => {
      console.error(`[${channelName}] Connection error:`, error);

      setState((prev) => ({
        ...prev,
        error: error || new Error("Connection failed"),
        isConnected: false,
        retryCount: prev.retryCount + 1,
      }));

      if (state.retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(2, state.retryCount);
        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    },
    [channelName, state.retryCount, maxRetries, retryDelay, connect]
  );

  // Cross-tab synchronization
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "realtime-update" && event.data.table === table) {
        handleUpdate(event.data.payload);
      }
    };

    broadcastChannel.addEventListener("message", handleMessage);

    return () => {
      broadcastChannel.removeEventListener("message", handleMessage);
    };
  }, [broadcastChannel, table, handleUpdate]);

  // Broadcast updates to other tabs
  const broadcastUpdate = useCallback(
    (payload: any) => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: "realtime-update",
          table,
          payload,
          timestamp: Date.now(),
        });
      }
    },
    [broadcastChannel, table]
  );

  // Enhanced update handler with cross-tab sync
  const enhancedHandleUpdate = useCallback(
    (payload: any) => {
      handleUpdate(payload);
      broadcastUpdate(payload);
    },
    [handleUpdate, broadcastUpdate]
  );

  // Setup connection
  useEffect(() => {
    connect();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [connect]);

  // Tab visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause updates when tab is hidden
        if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current);
        }
      } else {
        // Resume updates when tab becomes visible
        if (channelRef.current && !state.isConnected) {
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connect, state.isConnected]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await fetchData();
      setState((prev) => ({
        ...prev,
        data,
        loading: false,
        lastUpdate: new Date(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        loading: false,
      }));
    }
  }, [fetchData]);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    setState((prev) => ({ ...prev, retryCount: 0 }));
    connect();
  }, [connect]);

  return {
    ...state,
    refresh,
    reconnect,
    channelName,
  };
}
