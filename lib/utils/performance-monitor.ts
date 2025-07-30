interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  activeConnections: number;
  cacheHitRate: number;
  errorRate: number;
  responseTime: number;
  bundleSize: number;
  tabCount: number;
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  severity: number; // 1-10
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    memoryUsage: 0,
    cpuUsage: 0,
    networkRequests: 0,
    activeConnections: 0,
    cacheHitRate: 0,
    errorRate: 0,
    responseTime: 0,
    bundleSize: 0,
    tabCount: 0,
  };

  private alerts: PerformanceAlert[] = [];
  private observers: Array<(metrics: PerformanceMetrics) => void> = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Start monitoring
  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.checkAlerts();
      this.notifyObservers();
    }, intervalMs);

    console.log('Performance monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  // Update performance metrics
  private updateMetrics(): void {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    }

    // Network requests
    const resources = performance.getEntriesByType('resource');
    this.metrics.networkRequests = resources.length;

    // Response time (average)
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.responseTime = navigation.loadEventEnd - navigation.fetchStart;
    }

    // Bundle size estimation
    this.metrics.bundleSize = this.estimateBundleSize();

    // Tab count
    this.metrics.tabCount = this.getTabCount();

    // CPU usage estimation (simplified)
    this.metrics.cpuUsage = this.estimateCpuUsage();
  }

  // Check for performance alerts
  private checkAlerts(): void {
    const alerts: PerformanceAlert[] = [];

    // Memory usage alerts
    if (this.metrics.memoryUsage > 80) {
      alerts.push({
        type: 'warning',
        message: `High memory usage: ${this.metrics.memoryUsage.toFixed(1)}%`,
        timestamp: new Date(),
        severity: 8,
      });
    }

    if (this.metrics.memoryUsage > 90) {
      alerts.push({
        type: 'error',
        message: `Critical memory usage: ${this.metrics.memoryUsage.toFixed(1)}%`,
        timestamp: new Date(),
        severity: 10,
      });
    }

    // Response time alerts
    if (this.metrics.responseTime > 3000) {
      alerts.push({
        type: 'warning',
        message: `Slow response time: ${this.metrics.responseTime.toFixed(0)}ms`,
        timestamp: new Date(),
        severity: 7,
      });
    }

    // Network request alerts
    if (this.metrics.networkRequests > 50) {
      alerts.push({
        type: 'warning',
        message: `High number of network requests: ${this.metrics.networkRequests}`,
        timestamp: new Date(),
        severity: 6,
      });
    }

    // Tab count alerts
    if (this.metrics.tabCount > 5) {
      alerts.push({
        type: 'info',
        message: `Multiple tabs detected: ${this.metrics.tabCount}. Consider closing unused tabs.`,
        timestamp: new Date(),
        severity: 4,
      });
    }

    // Add new alerts
    this.alerts.push(...alerts);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  // Estimate bundle size
  private estimateBundleSize(): number {
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;

    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('_next')) {
        // Estimate size based on script type
        if (src.includes('chunks')) {
          totalSize += 100; // KB
        } else if (src.includes('static')) {
          totalSize += 50; // KB
        }
      }
    });

    return totalSize;
  }

  // Get tab count (simplified estimation)
  private getTabCount(): number {
    // This is a simplified estimation
    // In a real implementation, you'd use a more sophisticated method
    return Math.max(1, Math.floor(this.metrics.memoryUsage / 20));
  }

  // Estimate CPU usage (simplified)
  private estimateCpuUsage(): number {
    // This is a simplified estimation based on memory and network activity
    const baseUsage = this.metrics.memoryUsage * 0.3;
    const networkFactor = Math.min(this.metrics.networkRequests / 10, 1) * 20;
    return Math.min(baseUsage + networkFactor, 100);
  }

  // Add observer
  addObserver(callback: (metrics: PerformanceMetrics) => void): void {
    this.observers.push(callback);
  }

  // Remove observer
  removeObserver(callback: (metrics: PerformanceMetrics) => void): void {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  // Notify observers
  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error in performance observer:', error);
      }
    });
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get recent alerts
  getAlerts(limit = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  // Get optimization recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.memoryUsage > 80) {
      recommendations.push('Consider closing unused tabs to reduce memory usage');
      recommendations.push('Implement lazy loading for heavy components');
    }

    if (this.metrics.responseTime > 2000) {
      recommendations.push('Optimize API requests with caching and batching');
      recommendations.push('Consider using CDN for static assets');
    }

    if (this.metrics.networkRequests > 30) {
      recommendations.push('Batch multiple API requests into single calls');
      recommendations.push('Implement request deduplication');
    }

    if (this.metrics.tabCount > 3) {
      recommendations.push('Close unused browser tabs to improve performance');
    }

    if (this.metrics.cacheHitRate < 50) {
      recommendations.push('Improve caching strategy for better performance');
    }

    return recommendations;
  }

  // Force garbage collection (if available)
  forceGarbageCollection(): void {
    if ('gc' in window) {
      (window as any).gc();
      console.log('Garbage collection triggered');
    } else {
      console.log('Garbage collection not available');
    }
  }

  // Get performance report
  getReport(): {
    metrics: PerformanceMetrics;
    alerts: PerformanceAlert[];
    recommendations: string[];
    isMonitoring: boolean;
  } {
    return {
      metrics: this.getMetrics(),
      alerts: this.getAlerts(),
      recommendations: this.getRecommendations(),
      isMonitoring: this.isMonitoring,
    };
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.startMonitoring();
} 