// Performance Monitoring System
// Tracks various performance metrics and provides insights

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'api' | 'render' | 'memory' | 'cache' | 'realtime';
  metadata?: Record<string, unknown>;
}

interface PerformanceStats {
  average: number;
  min: number;
  max: number;
  count: number;
  lastValue: number;
}

interface PerformanceReport {
  api: Record<string, PerformanceStats>;
  render: Record<string, PerformanceStats>;
  memory: Record<string, PerformanceStats>;
  cache: Record<string, PerformanceStats>;
  realtime: Record<string, PerformanceStats>;
  summary: {
    totalMetrics: number;
    averageResponseTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    realtimeConnections: number;
  };
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private observers: Set<(report: PerformanceReport) => void> = new Set();
  private reportInterval: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.startPeriodicReporting();
    this.setupGlobalMonitoring();
  }

  // Track a performance metric
  trackMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'] = 'api',
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata,
    };

    const key = `${category}:${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricList = this.metrics.get(key)!;
    metricList.push(metric);

    // Keep only last 100 metrics per key to prevent memory bloat
    if (metricList.length > 100) {
      metricList.splice(0, metricList.length - 100);
    }

    // Log significant performance issues
    this.checkPerformanceThresholds(metric);
  }

  // Track API response time
  trackApiCall(endpoint: string, duration: number, success: boolean = true): void {
    this.trackMetric(
      `${endpoint}_${success ? 'success' : 'error'}`,
      duration,
      'api',
      { endpoint, success }
    );
  }

  // Track render performance
  trackRender(componentName: string, duration: number): void {
    this.trackMetric(
      `${componentName}_render`,
      duration,
      'render',
      { component: componentName }
    );
  }

  // Track memory usage
  trackMemoryUsage(usage: number): void {
    this.trackMetric('memory_usage', usage, 'memory');
  }

  // Track cache performance
  trackCacheHit(key: string, hit: boolean): void {
    this.trackMetric(
      `${key}_${hit ? 'hit' : 'miss'}`,
      1,
      'cache',
      { key, hit }
    );
  }

  // Track realtime connection status
  trackRealtimeConnection(status: 'connected' | 'disconnected' | 'reconnecting', duration?: number): void {
    this.trackMetric(
      `connection_${status}`,
      duration || 0,
      'realtime',
      { status }
    );
  }

  // Get performance statistics for a metric
  getStats(category: string, name: string): PerformanceStats | null {
    const key = `${category}:${name}`;
    const metricList = this.metrics.get(key);

    if (!metricList || metricList.length === 0) {
      return null;
    }

    const values = metricList.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      average,
      min,
      max,
      count: values.length,
      lastValue: values[values.length - 1],
    };
  }

  // Generate comprehensive performance report
  generateReport(): PerformanceReport {
    const categories: PerformanceMetric['category'][] = ['api', 'render', 'memory', 'cache', 'realtime'];
    const report: PerformanceReport = {
      api: {},
      render: {},
      memory: {},
      cache: {},
      realtime: {},
      summary: {
        totalMetrics: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        realtimeConnections: 0,
      },
    };

    let totalMetrics = 0;
    let totalApiTime = 0;
    let apiCount = 0;
    let cacheHits = 0;
    let cacheTotal = 0;
    let currentMemory = 0;

    // Process each category
    categories.forEach(category => {
      this.metrics.forEach((metricList, key) => {
        if (key.startsWith(`${category}:`)) {
          const name = key.replace(`${category}:`, '');
          const stats = this.getStats(category, name);
          
          if (stats) {
            report[category][name] = stats;
            totalMetrics += stats.count;

            // Calculate summary metrics
            if (category === 'api' && name.includes('success')) {
              totalApiTime += stats.average * stats.count;
              apiCount += stats.count;
            } else if (category === 'cache') {
              if (name.includes('hit')) {
                cacheHits += stats.count;
              }
              cacheTotal += stats.count;
            } else if (category === 'memory' && name === 'memory_usage') {
              currentMemory = stats.lastValue;
            }
          }
        }
      });
    });

    // Calculate summary
    report.summary = {
      totalMetrics,
      averageResponseTime: apiCount > 0 ? totalApiTime / apiCount : 0,
      cacheHitRate: cacheTotal > 0 ? (cacheHits / cacheTotal) * 100 : 0,
      memoryUsage: currentMemory,
      realtimeConnections: this.getRealtimeConnectionCount(),
    };

    return report;
  }

  // Subscribe to performance reports
  subscribe(callback: (report: PerformanceReport) => void): () => void {
    this.observers.add(callback);
    
    return () => {
      this.observers.delete(callback);
    };
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear();
  }

  // Get current memory usage
  getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as unknown as Record<string, unknown>).memory) {
      const memory = (performance as unknown as Record<string, unknown>).memory as { usedJSHeapSize: number };
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Check for performance thresholds and log warnings
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = {
      api: 1000, // 1 second
      render: 100, // 100ms
      memory: 50, // 50MB
    };

    const threshold = thresholds[metric.category as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`Performance warning: ${metric.name} took ${metric.value}ms (threshold: ${threshold}ms)`, metric);
    }
  }

  // Get realtime connection count
  private getRealtimeConnectionCount(): number {
    let count = 0;
    this.metrics.forEach((metricList, key) => {
      if (key.startsWith('realtime:connection_') && metricList.length > 0) {
        const lastMetric = metricList[metricList.length - 1];
        if (lastMetric.metadata?.status === 'connected') {
          count++;
        }
      }
    });
    return count;
  }

  // Start periodic reporting
  private startPeriodicReporting(): void {
    this.reportInterval = setInterval(() => {
      if (this.observers.size > 0) {
        const report = this.generateReport();
        this.observers.forEach(callback => {
          try {
            callback(report);
          } catch (error) {
            console.error('Error in performance report callback:', error);
          }
        });
      }
    }, 30000); // Report every 30 seconds
  }

  // Setup global monitoring
  private setupGlobalMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      const memoryUsage = this.getCurrentMemoryUsage();
      this.trackMemoryUsage(memoryUsage);
    }, 10000); // Every 10 seconds

    // Monitor page load performance
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        if (performance.timing) {
          const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
          this.trackMetric('page_load_time', loadTime, 'render');
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    this.observers.clear();
    this.metrics.clear();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance monitoring utilities
export const performanceUtils = {
  // Measure function execution time
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      performanceMonitor.trackMetric(name, duration, 'api');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      performanceMonitor.trackMetric(name, duration, 'api', { error: true });
      throw error;
    }
  },

  // Measure async function execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      performanceMonitor.trackMetric(name, duration, 'api');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      performanceMonitor.trackMetric(name, duration, 'api', { error: true });
      throw error;
    }
  },

  // Measure render performance
  measureRender(componentName: string, renderFn: () => void): void {
    const start = performance.now();
    renderFn();
    const duration = performance.now() - start;
    performanceMonitor.trackRender(componentName, duration);
  },

  // Get performance summary
  getSummary(): PerformanceReport['summary'] {
    return performanceMonitor.generateReport().summary;
  },

  // Log performance report to console
  logReport(): void {
    const report = performanceMonitor.generateReport();
    console.group('Performance Report');
    console.log('Summary:', report.summary);
    console.log('API Stats:', report.api);
    console.log('Render Stats:', report.render);
    console.log('Memory Stats:', report.memory);
    console.log('Cache Stats:', report.cache);
    console.log('Realtime Stats:', report.realtime);
    console.groupEnd();
  },
};

export default PerformanceMonitor; 