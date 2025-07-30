"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface StateConfig<T> {
  key: string;
  defaultValue: T;
  enableCrossTabSync?: boolean;
  enablePersistence?: boolean;
  debounceMs?: number;
  maxMemoryUsage?: number; // MB
}

interface StateInfo {
  lastUpdate: Date;
  updateCount: number;
  memoryUsage: number;
  isCrossTabSynced: boolean;
}

export function useOptimizedState<T>(config: StateConfig<T>) {
  const {
    key,
    defaultValue,
    enableCrossTabSync = true,
    enablePersistence = false,
    debounceMs = 100,
    maxMemoryUsage = 50, // 50MB
  } = config;

  const [state, setState] = useState<T>(defaultValue);
  const [info, setInfo] = useState<StateInfo>({
    lastUpdate: new Date(),
    updateCount: 0,
    memoryUsage: 0,
    isCrossTabSynced: false,
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique state key
  const stateKey = useMemo(() => {
    return `bolobey-state-${key}-${Math.random().toString(36).substr(2, 9)}`;
  }, [key]);

  // Initialize cross-tab synchronization
  useEffect(() => {
    if (!enableCrossTabSync || typeof window === "undefined") return;

    try {
      const channel = new BroadcastChannel(`bolobey-state-${key}`);
      broadcastChannelRef.current = channel;

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === "state-update" && event.data.key === key) {
          setState(event.data.value);
          setInfo((prev) => ({
            ...prev,
            lastUpdate: new Date(),
            updateCount: prev.updateCount + 1,
            isCrossTabSynced: true,
          }));
        }
      };

      channel.addEventListener("message", handleMessage);

      return () => {
        channel.removeEventListener("message", handleMessage);
        channel.close();
      };
    } catch (error) {
      console.warn(
        "BroadcastChannel not supported, falling back to localStorage"
      );
    }
  }, [key, enableCrossTabSync]);

  // Initialize persistence
  useEffect(() => {
    if (!enablePersistence || typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(stateKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(parsed);
        setInfo((prev) => ({
          ...prev,
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
        }));
      }
    } catch (error) {
      console.warn("Failed to load persisted state:", error);
    }
  }, [stateKey, enablePersistence]);

  // Memory monitoring
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMemory = () => {
      if ("memory" in performance) {
        const memory = (performance as any).memory;
        const usageMB = memory.usedJSHeapSize / (1024 * 1024);

        setInfo((prev) => ({
          ...prev,
          memoryUsage: usageMB,
        }));

        if (usageMB > maxMemoryUsage) {
          console.warn(`High memory usage detected: ${usageMB.toFixed(2)}MB`);
          // Trigger garbage collection if available
          if ("gc" in window) {
            (window as any).gc();
          }
        }
      }
    };

    memoryCheckIntervalRef.current = setInterval(checkMemory, 5000);
    checkMemory(); // Initial check

    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
    };
  }, [maxMemoryUsage]);

  // Debounced state setter
  const setOptimizedState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const finalState =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(state)
            : newState;

        setState(finalState);
        setInfo((prev) => ({
          ...prev,
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
        }));

        // Persist to localStorage
        if (enablePersistence) {
          try {
            localStorage.setItem(stateKey, JSON.stringify(finalState));
          } catch (error) {
            console.warn("Failed to persist state:", error);
          }
        }

        // Broadcast to other tabs
        if (broadcastChannelRef.current) {
          try {
            broadcastChannelRef.current.postMessage({
              type: "state-update",
              key,
              value: finalState,
              timestamp: Date.now(),
            });
          } catch (error) {
            console.warn("Failed to broadcast state update:", error);
          }
        }
      }, debounceMs);
    },
    [state, debounceMs, enablePersistence, stateKey, key]
  );

  // Reset state
  const resetState = useCallback(() => {
    setOptimizedState(defaultValue);

    if (enablePersistence) {
      localStorage.removeItem(stateKey);
    }
  }, [defaultValue, enablePersistence, stateKey, setOptimizedState]);

  // Clear all related data
  const clearAll = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (enablePersistence) {
      localStorage.removeItem(stateKey);
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
    }
  }, [enablePersistence, stateKey]);

  // Get state statistics
  const getStats = useCallback(() => {
    return {
      ...info,
      stateKey,
      isPersisted: enablePersistence,
      isCrossTabEnabled: enableCrossTabSync,
    };
  }, [info, stateKey, enablePersistence, enableCrossTabSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  return {
    state,
    setState: setOptimizedState,
    resetState,
    clearAll,
    getStats,
    info,
  };
}
