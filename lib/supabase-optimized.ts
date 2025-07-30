import { createClient } from '@supabase/supabase-js';
import { requestCache } from './utils/request-cache';

// Performance-optimized Supabase client
class OptimizedSupabaseClient {
  private client: any;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private activeConnections: Set<string> = new Set();
  private maxConcurrentRequests = 5;
  private requestTimeout = 10000;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10, // Limit real-time events
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'bolobey-optimized',
        },
      },
    });
  }

  // Optimized query with caching and deduplication
  async optimizedQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: {
      cacheKey?: string;
      cacheTime?: number;
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
    } = {}
  ): Promise<{ data: T | null; error: any }> {
    const {
      cacheKey,
      cacheTime = 5 * 60 * 1000, // 5 minutes
      priority = 'normal',
      timeout = this.requestTimeout,
    } = options;

    // Use cache if available
    if (cacheKey) {
      const cached = requestCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check if same request is already in progress
    if (cacheKey && this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!;
    }

    // Create the request
    const requestPromise = this.executeQuery(queryFn, timeout);

    // Store in queue if caching is enabled
    if (cacheKey) {
      this.requestQueue.set(cacheKey, requestPromise);
    }

    try {
      const result = await requestPromise;

      // Cache successful results
      if (cacheKey && !result.error) {
        requestCache.set(cacheKey, result, cacheTime);
      }

      return result;
    } finally {
      // Clean up queue
      if (cacheKey) {
        this.requestQueue.delete(cacheKey);
      }
    }
  }

  // Execute query with timeout and connection management
  private async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    timeout: number
  ): Promise<{ data: T | null; error: any }> {
    const connectionId = Math.random().toString(36).substr(2, 9);
    
    // Check connection limit
    if (this.activeConnections.size >= this.maxConcurrentRequests) {
      // Wait for a connection to become available
      await this.waitForConnection();
    }

    this.activeConnections.add(connectionId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await queryFn();
      
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      console.error('[OptimizedSupabase] Query failed:', error);
      return { data: null, error };
    } finally {
      this.activeConnections.delete(connectionId);
    }
  }

  // Wait for a connection to become available
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.activeConnections.size < this.maxConcurrentRequests) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  // Optimized real-time subscription
  optimizedSubscription(
    channelName: string,
    table: string,
    filter: string,
    callback: (payload: any) => void,
    options: {
      throttleMs?: number;
      maxEventsPerSecond?: number;
    } = {}
  ) {
    const { throttleMs = 100, maxEventsPerSecond = 10 } = options;
    
    let lastEventTime = 0;
    let eventCount = 0;
    let throttleTimeout: NodeJS.Timeout | null = null;

    const throttledCallback = (payload: any) => {
      const now = Date.now();
      
      // Rate limiting
      if (now - lastEventTime < 1000 / maxEventsPerSecond) {
        return;
      }

      // Throttling
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }

      throttleTimeout = setTimeout(() => {
        callback(payload);
        lastEventTime = now;
        eventCount++;
      }, throttleMs);
    };

    const channel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        throttledCallback
      )
      .subscribe();

    return {
      channel,
      unsubscribe: () => {
        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
        }
        this.client.removeChannel(channel);
      },
    };
  }

  // Batch multiple queries
  async batchQueries<T>(
    queries: Array<{
      key: string;
      queryFn: () => Promise<{ data: any; error: any }>;
      cacheTime?: number;
    }>,
    options: {
      maxConcurrent?: number;
      timeout?: number;
    } = {}
  ): Promise<Record<string, { data: T | null; error: any }>> {
    const { maxConcurrent = 3, timeout = this.requestTimeout } = options;
    const results: Record<string, { data: T | null; error: any }> = {};

    // Process queries in batches
    for (let i = 0; i < queries.length; i += maxConcurrent) {
      const batch = queries.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async ({ key, queryFn, cacheTime }) => {
        const result = await this.optimizedQuery(queryFn, {
          cacheKey: key,
          cacheTime,
          timeout,
        });
        return { key, result };
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ key, result }) => {
        results[key] = result;
      });
    }

    return results;
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      activeConnections: this.activeConnections.size,
      queuedRequests: this.requestQueue.size,
      cacheStats: requestCache.getStats(),
    };
  }

  // Clear cache and reset
  reset() {
    this.requestQueue.clear();
    this.activeConnections.clear();
    requestCache.clear();
  }

  // Get the underlying client
  getClient() {
    return this.client;
  }
}

// Create optimized client instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const optimizedSupabase = new OptimizedSupabaseClient(supabaseUrl, supabaseKey);

// Export the original client for backward compatibility
export const supabase = optimizedSupabase.getClient(); 