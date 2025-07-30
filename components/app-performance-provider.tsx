"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAppOptimization } from "@/lib/hooks/useAppOptimization";

interface PerformanceContextType {
  isTabActive: boolean;
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    networkRequests: number;
    activeConnections: number;
    cacheHitRate: number;
    errorRate: number;
  };
  optimizeMemory: () => void;
  optimizeNetwork: () => void;
  optimizedRequest: <T>(
    requestFn: () => Promise<T>,
    options?: {
      priority?: "high" | "normal" | "low";
      timeout?: number;
      retries?: number;
    }
  ) => Promise<T>;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error(
      "usePerformance must be used within AppPerformanceProvider"
    );
  }
  return context;
}

interface AppPerformanceProviderProps {
  children: React.ReactNode;
  config?: {
    enableResourceMonitoring?: boolean;
    enableBackgroundThrottling?: boolean;
    enableMemoryOptimization?: boolean;
    enableNetworkOptimization?: boolean;
    maxConcurrentRequests?: number;
    requestTimeout?: number;
  };
}

export function AppPerformanceProvider({
  children,
  config = {},
}: AppPerformanceProviderProps) {
  const {
    isTabActive,
    performanceMetrics,
    optimizedRequest,
    optimizeMemory,
    optimizeNetwork,
    activeConnectionsCount,
    queueLength,
  } = useAppOptimization(config);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const optimizationInterval = useRef<NodeJS.Timeout | null>(null);

  // Automatic performance optimization
  useEffect(() => {
    // Optimize every 30 seconds
    optimizationInterval.current = setInterval(() => {
      if (!isTabActive) return; // Don't optimize when tab is inactive

      setIsOptimizing(true);

      // Optimize memory
      optimizeMemory();

      // Optimize network
      optimizeNetwork();

      // Log performance metrics
      console.log("[AppPerformance] Performance metrics:", {
        memoryUsage: performanceMetrics.memoryUsage.toFixed(1) + "%",
        activeConnections: activeConnectionsCount,
        queueLength,
        cacheHitRate: performanceMetrics.cacheHitRate.toFixed(1) + "%",
        errorRate: performanceMetrics.errorRate.toFixed(1) + "%",
      });

      setIsOptimizing(false);
    }, 30000);

    return () => {
      if (optimizationInterval.current) {
        clearInterval(optimizationInterval.current);
      }
    };
  }, [
    isTabActive,
    optimizeMemory,
    optimizeNetwork,
    performanceMetrics,
    activeConnectionsCount,
    queueLength,
  ]);

  // Performance alerts
  useEffect(() => {
    // Alert for high memory usage
    if (performanceMetrics.memoryUsage > 80) {
      console.warn(
        "[AppPerformance] High memory usage detected:",
        performanceMetrics.memoryUsage.toFixed(1) + "%"
      );
    }

    // Alert for high error rate
    if (performanceMetrics.errorRate > 10) {
      console.warn(
        "[AppPerformance] High error rate detected:",
        performanceMetrics.errorRate.toFixed(1) + "%"
      );
    }

    // Alert for too many active connections
    if (activeConnectionsCount > 10) {
      console.warn(
        "[AppPerformance] Too many active connections:",
        activeConnectionsCount
      );
    }
  }, [performanceMetrics, activeConnectionsCount]);

  // Tab visibility optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("[AppPerformance] Tab hidden - pausing heavy operations");
        // Pause heavy operations when tab is hidden
      } else {
        console.log("[AppPerformance] Tab visible - resuming operations");
        // Resume operations when tab becomes visible
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Page unload cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log("[AppPerformance] Page unloading - cleaning up resources");
      optimizeMemory();
      optimizeNetwork();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [optimizeMemory, optimizeNetwork]);

  const contextValue: PerformanceContextType = {
    isTabActive,
    performanceMetrics,
    optimizeMemory,
    optimizeNetwork,
    optimizedRequest,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
      {/* Performance monitoring overlay (only in development) */}
      {process.env.NODE_ENV === "development" && <PerformanceMonitor />}
    </PerformanceContext.Provider>
  );
}

// Performance monitoring component (development only)
function PerformanceMonitor() {
  const { performanceMetrics, isTabActive, optimizeMemory } = usePerformance();
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        title="Show Performance Monitor"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg shadow-lg max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Memory:</span>
          <span
            className={
              performanceMetrics.memoryUsage > 80
                ? "text-red-400"
                : "text-green-400"
            }
          >
            {performanceMetrics.memoryUsage.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span>Connections:</span>
          <span
            className={
              performanceMetrics.activeConnections > 10
                ? "text-red-400"
                : "text-green-400"
            }
          >
            {performanceMetrics.activeConnections}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Cache Hit:</span>
          <span
            className={
              performanceMetrics.cacheHitRate > 70
                ? "text-green-400"
                : "text-yellow-400"
            }
          >
            {performanceMetrics.cacheHitRate.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span>Error Rate:</span>
          <span
            className={
              performanceMetrics.errorRate > 5
                ? "text-red-400"
                : "text-green-400"
            }
          >
            {performanceMetrics.errorRate.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span>Tab Active:</span>
          <span className={isTabActive ? "text-green-400" : "text-red-400"}>
            {isTabActive ? "Yes" : "No"}
          </span>
        </div>
      </div>

      <button
        onClick={optimizeMemory}
        className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded transition-colors"
      >
        Optimize Memory
      </button>
    </div>
  );
}
