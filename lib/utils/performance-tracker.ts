// Performance tracking utility for monitoring API calls and performance

export class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private slowOperations: Array<{ operation: string; duration: number; timestamp: Date }> = [];

  startTimer(key: string) {
    this.metrics.set(key, [performance.now()]);
  }

  endTimer(key: string) {
    const startTime = this.metrics.get(key)?.[0];
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`${key} took ${duration.toFixed(2)}ms`);
      
      // Track slow operations
      if (duration > 1000) {
        this.slowOperations.push({
          operation: key,
          duration,
          timestamp: new Date()
        });
        console.warn(`Slow operation detected: ${key} (${duration.toFixed(2)}ms)`);
      }

      // Keep only last 100 slow operations
      if (this.slowOperations.length > 100) {
        this.slowOperations = this.slowOperations.slice(-100);
      }

      this.metrics.delete(key);
      return duration;
    }
    return 0;
  }

  trackRequest(url: string) {
    const key = this.getRequestKey(url);
    const existing = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, existing + 1);

    // Warn about multiple requests to same endpoint
    if (existing > 5) {
      console.warn(`Multiple requests detected to ${url} (${existing + 1} times)`);
    }
  }

  private getRequestKey(url: string) {
    return url.split('?')[0]; // Remove query parameters
  }

  getSlowOperations() {
    return this.slowOperations;
  }

  getRequestCounts() {
    return Object.fromEntries(this.requestCounts);
  }

  clearMetrics() {
    this.metrics.clear();
    this.requestCounts.clear();
    this.slowOperations = [];
  }

  getPerformanceReport() {
    const slowOps = this.slowOperations.slice(-10); // Last 10 slow operations
    const requestCounts = this.getRequestCounts();
    
    return {
      slowOperations: slowOps,
      requestCounts,
      totalSlowOperations: this.slowOperations.length,
      totalRequests: Object.values(requestCounts).reduce((sum, count) => sum + count, 0)
    };
  }
}

export const performanceTracker = new PerformanceTracker();

// React hook for performance tracking
export function usePerformanceTracking() {
  const trackOperation = (operationName: string, operation: () => Promise<any>) => {
    return async () => {
      performanceTracker.startTimer(operationName);
      try {
        const result = await operation();
        return result;
      } finally {
        performanceTracker.endTimer(operationName);
      }
    };
  };

  const trackRequest = (url: string) => {
    performanceTracker.trackRequest(url);
  };

  return {
    trackOperation,
    trackRequest,
    getReport: () => performanceTracker.getPerformanceReport(),
    clearMetrics: () => performanceTracker.clearMetrics()
  };
}

// Higher-order function to wrap API calls with performance tracking
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  operationName: string,
  operation: T
): T {
  return (async (...args: Parameters<T>) => {
    performanceTracker.startTimer(operationName);
    try {
      const result = await operation(...args);
      return result;
    } finally {
      performanceTracker.endTimer(operationName);
    }
  }) as T;
}

// Utility to measure component render time
export function measureRenderTime(componentName: string) {
  return {
    start: () => performanceTracker.startTimer(`${componentName}_render`),
    end: () => performanceTracker.endTimer(`${componentName}_render`)
  };
} 