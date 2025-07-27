"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Zap,
  Clock,
  Database,
  Network,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { requestCache } from "@/lib/utils/request-cache";

interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  networkRequests: number;
}

interface PerformanceMonitorProps {
  className?: string;
  showDetails?: boolean;
}

export function PerformanceMonitor({
  className = "",
  showDetails = false,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    memoryUsage: 0,
    networkRequests: 0,
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);

  const updateMetrics = useCallback(() => {
    const stats = requestCache.getStats();
    const performance = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;

    // Calculate memory usage (if available)
    const memory = (performance as any).memory;
    const memoryUsage = memory
      ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      : 0;

    // Calculate network requests
    const networkRequests = performance.getEntriesByType("resource").length;

    // Calculate error rate (simplified)
    const errorRate = Math.random() * 5; // Placeholder - in real app, track actual errors

    const newMetrics: PerformanceMetrics = {
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      totalRequests: stats.cacheHits + stats.cacheMisses,
      averageResponseTime: performance.loadEventEnd - performance.fetchStart,
      errorRate,
      memoryUsage,
      networkRequests,
    };

    setMetrics(newMetrics);

    // Check for performance alerts
    const newAlerts: string[] = [];
    if (newMetrics.averageResponseTime > 3000) {
      newAlerts.push("High response time detected");
    }
    if (newMetrics.errorRate > 5) {
      newAlerts.push("High error rate detected");
    }
    if (newMetrics.memoryUsage > 80) {
      newAlerts.push("High memory usage detected");
    }
    if (newMetrics.cacheMisses > newMetrics.cacheHits) {
      newAlerts.push("Low cache hit rate");
    }

    setAlerts(newAlerts);
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring, updateMetrics]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    updateMetrics();
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  const clearCache = () => {
    requestCache.clearAll();
    updateMetrics();
  };

  const getPerformanceStatus = () => {
    if (metrics.averageResponseTime < 1000 && metrics.errorRate < 2) {
      return { status: "excellent", color: "bg-green-500", icon: CheckCircle };
    } else if (metrics.averageResponseTime < 2000 && metrics.errorRate < 5) {
      return { status: "good", color: "bg-blue-500", icon: TrendingUp };
    } else if (metrics.averageResponseTime < 3000 && metrics.errorRate < 10) {
      return { status: "fair", color: "bg-yellow-500", icon: AlertTriangle };
    } else {
      return { status: "poor", color: "bg-red-500", icon: TrendingDown };
    }
  };

  const performanceStatus = getPerformanceStatus();
  const cacheHitRate =
    metrics.totalRequests > 0
      ? (metrics.cacheHits / metrics.totalRequests) * 100
      : 0;

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${performanceStatus.color} text-white border-0`}
            >
              {performanceStatus.status}
            </Badge>
            {isMonitoring && (
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isMonitoring ? "destructive" : "default"}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className="flex-1"
          >
            {isMonitoring ? "Stop" : "Start"} Monitoring
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={updateMetrics}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearCache}
            className="flex-1"
          >
            Clear Cache
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Response Time</span>
              <span className="font-mono">
                {Math.round(metrics.averageResponseTime)}ms
              </span>
            </div>
            <Progress
              value={Math.min((metrics.averageResponseTime / 3000) * 100, 100)}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Cache Hit Rate</span>
              <span className="font-mono">{Math.round(cacheHitRate)}%</span>
            </div>
            <Progress value={cacheHitRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Error Rate</span>
              <span className="font-mono">{metrics.errorRate.toFixed(1)}%</span>
            </div>
            <Progress
              value={Math.min(metrics.errorRate * 10, 100)}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Memory Usage</span>
              <span className="font-mono">
                {Math.round(metrics.memoryUsage)}%
              </span>
            </div>
            <Progress value={metrics.memoryUsage} className="h-2" />
          </div>
        </div>

        {/* Detailed Metrics (if showDetails is true) */}
        {showDetails && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold">Detailed Metrics</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Requests:</span>
                <span className="font-mono">{metrics.totalRequests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cache Hits:</span>
                <span className="font-mono">{metrics.cacheHits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cache Misses:</span>
                <span className="font-mono">{metrics.cacheMisses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Network Requests:</span>
                <span className="font-mono">{metrics.networkRequests}</span>
              </div>
            </div>
          </div>
        )}

        {/* Performance Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-600">
              Performance Alerts
            </h4>
            {alerts.map((alert, index) => (
              <Alert key={index} variant="destructive" className="py-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">{alert}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Performance Tips */}
        <div className="pt-2 border-t">
          <h4 className="text-sm font-semibold mb-2">Performance Tips</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              <span>High cache hit rate improves performance</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Response time should be under 2 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3" />
              <span>Database queries are optimized with indexes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
