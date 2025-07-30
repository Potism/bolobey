interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cacheTime?: number;
  priority?: 'high' | 'normal' | 'low';
}

interface RequestCache {
  [key: string]: {
    data: any;
    timestamp: number;
    expiresAt: number;
  };
}

class RequestOptimizer {
  private cache: RequestCache = {};
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private maxConcurrentRequests = 5;
  private activeRequests = 0;

  // Optimized request with timeout, retry, and caching
  async request<T>(
    key: string,
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      timeout = 10000,
      retries = 3,
      retryDelay = 1000,
      cacheTime = 5 * 60 * 1000, // 5 minutes
      priority = 'normal',
    } = config;

    // Check cache first
    const cached = this.getFromCache(key);
    if (cached) {
      return cached;
    }

    // Check if same request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create the request promise
    const requestPromise = this.executeRequest(requestFn, timeout, retries, retryDelay);

    // Store in pending requests
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful results
      this.setCache(key, result, cacheTime);
      
      return result;
    } finally {
      // Clean up pending requests
      this.pendingRequests.delete(key);
    }
  }

  // Execute request with timeout and retry logic
  private async executeRequest<T>(
    requestFn: () => Promise<T>,
    timeout: number,
    retries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const result = await requestFn();
        
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`Request timeout on attempt ${attempt + 1}`);
        } else {
          console.error(`Request failed on attempt ${attempt + 1}:`, error);
        }

        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Cache management
  private getFromCache(key: string): any | null {
    const cached = this.cache[key];
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      delete this.cache[key];
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, cacheTime: number): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheTime,
    };
  }

  // Batch requests for better performance
  async batchRequests<T>(
    requests: Array<{ key: string; requestFn: () => Promise<T>; config?: RequestConfig }>,
    maxConcurrent = 3
  ): Promise<Record<string, T>> {
    const results: Record<string, T> = {};
    const errors: Record<string, Error> = {};

    // Process requests in batches
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async ({ key, requestFn, config }) => {
        try {
          const result = await this.request(key, requestFn, config);
          return { key, result, error: null };
        } catch (error) {
          return { key, result: null, error: error as Error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ key, result, error }) => {
        if (error) {
          errors[key] = error;
        } else {
          results[key] = result!;
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      console.warn('Some batch requests failed:', errors);
    }

    return results;
  }

  // Clear cache
  clearCache(pattern?: string): void {
    if (pattern) {
      Object.keys(this.cache).forEach(key => {
        if (key.includes(pattern)) {
          delete this.cache[key];
        }
      });
    } else {
      this.cache = {};
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: Object.keys(this.cache).length,
      keys: Object.keys(this.cache),
    };
  }

  // Cancel pending requests
  cancelRequest(key: string): boolean {
    return this.pendingRequests.delete(key);
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    this.pendingRequests.clear();
  }
}

// Global instance
export const requestOptimizer = new RequestOptimizer();

// Hook for using the request optimizer
export function useRequestOptimizer() {
  return {
    request: requestOptimizer.request.bind(requestOptimizer),
    batchRequests: requestOptimizer.batchRequests.bind(requestOptimizer),
    clearCache: requestOptimizer.clearCache.bind(requestOptimizer),
    getCacheStats: requestOptimizer.getCacheStats.bind(requestOptimizer),
    cancelRequest: requestOptimizer.cancelRequest.bind(requestOptimizer),
    cancelAllRequests: requestOptimizer.cancelAllRequests.bind(requestOptimizer),
  };
} 