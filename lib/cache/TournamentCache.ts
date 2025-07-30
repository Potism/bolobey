// Tournament Cache Implementation
// Uses browser's localStorage and memory cache for optimal performance

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number; // Default time to live in milliseconds
  maxSize: number; // Maximum number of items in cache
  cleanupInterval: number; // How often to clean up expired items
}

class TournamentCache {
  private memoryCache: Map<string, CacheItem<unknown>> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startCleanupTimer();
  }

  // Set item in cache
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    // Remove oldest items if cache is full
    if (this.memoryCache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.memoryCache.set(key, item);

    // Also store in localStorage for persistence
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  // Get item from cache
  get<T>(key: string): T | null {
    // Try memory cache first
    const memoryItem = this.memoryCache.get(key) as CacheItem<T> | undefined;
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.data;
    }

    // Try localStorage if not in memory
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        if (!this.isExpired(item)) {
          // Restore to memory cache
          this.memoryCache.set(key, item);
          return item.data;
        } else {
          // Remove expired item
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve from localStorage:', error);
    }

    return null;
  }

  // Check if item exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Remove item from cache
  delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  // Clear all cache
  clear(): void {
    this.memoryCache.clear();
    try {
      // Clear only tournament-related items from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('tournament:') || key.startsWith('match:') || key.startsWith('participant:')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  // Get cache statistics
  getStats(): { size: number; memorySize: number; localStorageSize: number } {
    let localStorageSize = 0;
    try {
      const keys = Object.keys(localStorage);
      localStorageSize = keys.filter(key => 
        key.startsWith('tournament:') || key.startsWith('match:') || key.startsWith('participant:')
      ).length;
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error);
    }

    return {
      size: this.memoryCache.size,
      memorySize: this.memoryCache.size,
      localStorageSize,
    };
  }

  // Check if item is expired
  private isExpired(item: CacheItem<unknown>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  // Remove oldest items from cache
  private evictOldest(): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove 10% of oldest items
    const toRemove = Math.ceil(this.config.maxSize * 0.1);
    entries.slice(0, toRemove).forEach(([key]) => {
      this.delete(key);
    });
  }

  // Clean up expired items
  private cleanup(): void {
    const expiredKeys: string[] = [];

    this.memoryCache.forEach((item, key) => {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache items`);
    }
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Stop cleanup timer
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Cache key generators
export const cacheKeys = {
  tournament: (id: string) => `tournament:${id}`,
  matches: (tournamentId: string) => `matches:${tournamentId}`,
  participants: (tournamentId: string) => `participants:${tournamentId}`,
  spectatorCount: (tournamentId: string) => `spectators:${tournamentId}`,
  match: (id: string) => `match:${id}`,
  user: (id: string) => `user:${id}`,
};

// Cache TTL configurations
export const cacheTTL = {
  tournament: 10 * 60 * 1000, // 10 minutes
  matches: 2 * 60 * 1000, // 2 minutes
  participants: 5 * 60 * 1000, // 5 minutes
  spectatorCount: 30 * 1000, // 30 seconds
  match: 1 * 60 * 1000, // 1 minute
  user: 30 * 60 * 1000, // 30 minutes
};

// Create singleton instance
export const tournamentCache = new TournamentCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
  cleanupInterval: 2 * 60 * 1000, // 2 minutes
});

// Cache utilities
export const cacheUtils = {
  // Invalidate all cache for a tournament
  invalidateTournament: (tournamentId: string) => {
    const keys = [
      cacheKeys.tournament(tournamentId),
      cacheKeys.matches(tournamentId),
      cacheKeys.participants(tournamentId),
      cacheKeys.spectatorCount(tournamentId),
    ];
    keys.forEach(key => tournamentCache.delete(key));
  },

  // Invalidate specific match
  invalidateMatch: (matchId: string) => {
    tournamentCache.delete(cacheKeys.match(matchId));
  },

  // Invalidate user data
  invalidateUser: (userId: string) => {
    tournamentCache.delete(cacheKeys.user(userId));
  },

  // Get cache hit rate (for monitoring)
  getHitRate: () => {
    const stats = tournamentCache.getStats();
    return {
      memorySize: stats.memorySize,
      localStorageSize: stats.localStorageSize,
      totalSize: stats.size,
    };
  },
};

export default TournamentCache; 