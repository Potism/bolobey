// Request cache utility to prevent duplicate API calls
class RequestCache {
  private cache = new Map<string, Promise<any>>();
  private dataCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if we have cached data that's still valid
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Check if there's already a pending request
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Create new request
    const promise = fetcher();
    this.cache.set(key, promise);

    try {
      const result = await promise;
      // Cache the result
      this.dataCache.set(key, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      // Clean up pending request
      this.cache.delete(key);
    }
  }

  // Clear cache for specific key
  clear(key: string) {
    this.cache.delete(key);
    this.dataCache.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
    this.dataCache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      pendingRequests: this.cache.size,
      cachedData: this.dataCache.size,
    };
  }
}

export const requestCache = new RequestCache(); 