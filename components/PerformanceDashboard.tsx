"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  performanceMonitor,
  performanceUtils,
} from "@/lib/monitoring/PerformanceMonitor";
import { cacheUtils } from "@/lib/cache/TournamentCache";
import {
  Activity,
  Zap,
  Database,
  HardDrive,
  Wifi,
  RefreshCw,
} from "lucide-react";

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((report) => {
      setPerformanceData(report);
    });

    // Update cache stats every 5 seconds
    const cacheInterval = setInterval(() => {
      setCacheStats(cacheUtils.getHitRate());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(cacheInterval);
    };
  }, []);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const logReport = () => {
    performanceUtils.logReport();
  };

  if (!isVisible) {
    return (
      <Button
        onClick={toggleVisibility}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="w-4 h-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80 max-h-96 overflow-y-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Performance Monitor
            </CardTitle>
            <div className="flex gap-1">
              <Button
                onClick={logReport}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                onClick={toggleVisibility}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {performanceData && (
            <>
              {/* API Performance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="text-xs">API Response</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {performanceData.summary.averageResponseTime.toFixed(0)}ms
                </Badge>
              </div>

              {/* Cache Performance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                  <span className="text-xs">Cache Hit Rate</span>
                </div>
                <Badge
                  variant={
                    performanceData.summary.cacheHitRate > 80
                      ? "default"
                      : "destructive"
                  }
                  className="text-xs"
                >
                  {performanceData.summary.cacheHitRate.toFixed(1)}%
                </Badge>
              </div>

              {/* Memory Usage */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <HardDrive className="w-4 h-4 mr-2 text-green-500" />
                  <span className="text-xs">Memory Usage</span>
                </div>
                <Badge
                  variant={
                    performanceData.summary.memoryUsage > 50
                      ? "destructive"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {performanceData.summary.memoryUsage.toFixed(1)}MB
                </Badge>
              </div>

              {/* Realtime Connections */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wifi className="w-4 h-4 mr-2 text-purple-500" />
                  <span className="text-xs">Realtime Connections</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {performanceData.summary.realtimeConnections}
                </Badge>
              </div>

              {/* Cache Stats */}
              {cacheStats && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">
                    Cache Stats
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Memory: {cacheStats.memorySize}</div>
                    <div>Storage: {cacheStats.localStorageSize}</div>
                  </div>
                </div>
              )}

              {/* Performance Warnings */}
              {performanceData.summary.averageResponseTime > 1000 && (
                <div className="pt-2 border-t">
                  <Badge
                    variant="destructive"
                    className="text-xs w-full justify-center"
                  >
                    ⚠️ Slow API Response
                  </Badge>
                </div>
              )}

              {performanceData.summary.memoryUsage > 50 && (
                <div className="pt-2 border-t">
                  <Badge
                    variant="destructive"
                    className="text-xs w-full justify-center"
                  >
                    ⚠️ High Memory Usage
                  </Badge>
                </div>
              )}
            </>
          )}

          {!performanceData && (
            <div className="text-center text-xs text-muted-foreground py-4">
              Loading performance data...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
