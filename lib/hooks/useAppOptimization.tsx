"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AppOptimizationConfig {
  enableResourceMonitoring?: boolean;
  enableBackgroundThrottling?: boolean;
  enableMemoryOptimization?: boolean;
  enableNetworkOptimization?: boolean;
  maxConcurrentRequests?: number;
  requestTimeout?: number;
  cacheTimeout?: number;
}

interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  activeConnections: number;
  cacheHitRate: number;
  errorRate: number;
}

export function useAppOptimization(config: AppOptimizationConfig = {}) {
  const {
    enableResourceMonitoring = true,
    enableBackgroundThrottling = true,
    enableMemoryOptimization = true,
    enableNetworkOptimization = true,
    maxConcurrentRequests = 5,
    requestTimeout = 10000,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
  } = config;

  const [isTabActive, setIsTabActive] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      memoryUsage: 0,
      cpuUsage: 0,
      networkRequests: 0,
      activeConnections: 0,
      cacheHitRate: 0,
      errorRate: 0,
    });

  const activeConnections = useRef<Set<string>>(new Set());
  const requestQueue = useRef<Array<() => Promise<any>>>([]);
  const isProcessingQueue = useRef(false);
  const performanceObserver = useRef<PerformanceObserver | null>(null);
  const memoryInterval = useRef<NodeJS.Timeout | null>(null);

  // Resource monitoring
  const monitorResources = useCallback(() => {
    if (!enableResourceMonitoring) return;

    // Monitor memory usage
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      const memoryUsage =
        (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

      setPerformanceMetrics((prev) => ({
        ...prev,
        memoryUsage,
      }));

      // Alert if memory usage is high
      if (memoryUsage > 80) {
        console.warn(
          `[AppOptimization] High memory usage detected: ${memoryUsage.toFixed(
            1
          )}%`
        );
        // Trigger garbage collection if possible
        if ("gc" in window) {
          (window as any).gc();
        }
      }
    }

    // Monitor network requests
    const networkRequests = performance.getEntriesByType("resource").length;
    setPerformanceMetrics((prev) => ({
      ...prev,
      networkRequests,
    }));

    // Monitor active connections
    setPerformanceMetrics((prev) => ({
      ...prev,
      activeConnections: activeConnections.current.size,
    }));
  }, [enableResourceMonitoring]);

  // Background tab throttling
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    console.log(
      `[AppOptimization] Tab visibility changed: ${
        isVisible ? "visible" : "hidden"
      }`
    );
    setIsTabActive(isVisible);

    if (enableBackgroundThrottling) {
      if (isVisible) {
        // Resume normal operation
        console.log(`[AppOptimization] Resuming normal operation`);
      } else {
        // Pause heavy operations
        console.log(`[AppOptimization] Pausing heavy operations`);
      }
    }
  }, [enableBackgroundThrottling]);

  // Request queue management
  const processRequestQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) return;

    isProcessingQueue.current = true;
    const activeRequests = new Set<string>();

    while (
      requestQueue.current.length > 0 &&
      activeRequests.size < maxConcurrentRequests
    ) {
      const request = requestQueue.current.shift();
      if (request) {
        const requestId = Math.random().toString(36).substr(2, 9);
        activeRequests.add(requestId);
        activeConnections.current.add(requestId);

        request().finally(() => {
          activeRequests.delete(requestId);
          activeConnections.current.delete(requestId);
        });
      }
    }

    isProcessingQueue.current = false;

    // Process remaining requests if any
    if (requestQueue.current.length > 0) {
      setTimeout(processRequestQueue, 100);
    }
  }, [maxConcurrentRequests]);

  // Optimized request function
  const optimizedRequest = useCallback(
    async <T,>(
      requestFn: () => Promise<T>,
      options: {
        priority?: "high" | "normal" | "low";
        timeout?: number;
        retries?: number;
      } = {}
    ): Promise<T> => {
      const {
        priority = "normal",
        timeout = requestTimeout,
        retries = 3,
      } = options;

      const executeRequest = async (): Promise<T> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const result = await requestFn();
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      // High priority requests execute immediately
      if (
        priority === "high" ||
        activeConnections.current.size < maxConcurrentRequests
      ) {
        const requestId = Math.random().toString(36).substr(2, 9);
        activeConnections.current.add(requestId);

        try {
          const result = await executeRequest();
          return result;
        } finally {
          activeConnections.current.delete(requestId);
        }
      }

      // Queue other requests
      return new Promise((resolve, reject) => {
        requestQueue.current.push(async () => {
          try {
            const result = await executeRequest();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        processRequestQueue();
      });
    },
    [requestTimeout, maxConcurrentRequests, processRequestQueue]
  );

  // Memory optimization
  const optimizeMemory = useCallback(() => {
    if (!enableMemoryOptimization) return;

    // Clear unused event listeners
    const cleanupEventListeners = () => {
      // This is a simplified version - in a real app, you'd track all listeners
      console.log(`[AppOptimization] Memory optimization triggered`);
    };

    // Clear unused timeouts and intervals
    const cleanupTimers = () => {
      // This would clear any unused timers
      console.log(`[AppOptimization] Timer cleanup triggered`);
    };

    cleanupEventListeners();
    cleanupTimers();

    // Force garbage collection if available
    if ("gc" in window) {
      (window as any).gc();
    }
  }, [enableMemoryOptimization]);

  // Network optimization
  const optimizeNetwork = useCallback(() => {
    if (!enableNetworkOptimization) return;

    // Implement request deduplication
    const requestCache = new Map<string, Promise<any>>();

    const deduplicatedRequest = async <T,>(
      key: string,
      requestFn: () => Promise<T>
    ): Promise<T> => {
      if (requestCache.has(key)) {
        return requestCache.get(key)!;
      }

      const promise = requestFn();
      requestCache.set(key, promise);

      try {
        const result = await promise;
        return result;
      } finally {
        requestCache.delete(key);
      }
    };

    return { deduplicatedRequest };
  }, [enableNetworkOptimization]);

  // Setup performance monitoring
  useEffect(() => {
    if (enableResourceMonitoring) {
      // Monitor memory usage
      memoryInterval.current = setInterval(monitorResources, 5000);

      // Monitor performance metrics
      if ("PerformanceObserver" in window) {
        performanceObserver.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let totalLoadTime = 0;
          let errorCount = 0;

          entries.forEach((entry) => {
            if (entry.entryType === "navigation") {
              totalLoadTime += entry.loadEventEnd - entry.fetchStart;
            }
            if (
              entry.entryType === "resource" &&
              entry.name.includes("error")
            ) {
              errorCount++;
            }
          });

          setPerformanceMetrics((prev) => ({
            ...prev,
            errorRate: (errorCount / entries.length) * 100,
          }));
        });

        performanceObserver.current.observe({
          entryTypes: ["navigation", "resource"],
        });
      }
    }

    return () => {
      if (memoryInterval.current) {
        clearInterval(memoryInterval.current);
      }
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, [enableResourceMonitoring, monitorResources]);

  // Setup visibility change listener
  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("blur", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Periodic memory optimization
  useEffect(() => {
    if (enableMemoryOptimization) {
      const memoryOptimizationInterval = setInterval(optimizeMemory, 30000); // Every 30 seconds

      return () => {
        clearInterval(memoryOptimizationInterval);
      };
    }
  }, [enableMemoryOptimization, optimizeMemory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all active connections
      activeConnections.current.clear();

      // Clear request queue
      requestQueue.current = [];

      // Optimize memory
      optimizeMemory();
    };
  }, [optimizeMemory]);

  return {
    isTabActive,
    performanceMetrics,
    optimizedRequest,
    optimizeMemory,
    optimizeNetwork: optimizeNetwork(),
    activeConnectionsCount: activeConnections.current.size,
    queueLength: requestQueue.current.length,
  };
}
