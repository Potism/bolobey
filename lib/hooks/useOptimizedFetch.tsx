"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { requestCache } from "@/lib/utils/request-cache";
import { retryRequest, RetryOptions } from "@/lib/utils/retry-utils";

interface UseOptimizedFetchOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
  retryOptions?: RetryOptions;
  cacheTime?: number;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

export function useOptimizedFetch<T>({
  key,
  fetcher,
  enabled = true,
  retryOptions = { maxRetries: 3, delay: 1000, backoff: true },
  cacheTime = 5 * 60 * 1000, // 5 minutes
  staleTime = 1 * 60 * 1000, // 1 minute
  onSuccess,
  onError,
}: UseOptimizedFetchOptions<T>): UseOptimizedFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchTime = useRef<number>(0);
  const abortController = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check if data is still fresh
    const now = Date.now();
    if (data && now - lastFetchTime.current < staleTime) {
      return;
    }

    setLoading(true);
    setError(null);

    // Cancel previous request if still pending
    if (abortController.current) {
      abortController.current.abort();
    }

    // Create new abort controller
    abortController.current = new AbortController();

    try {
      const result = await requestCache.get(key, async () => {
        return retryRequest(async () => {
          const response = await fetcher();

          // Check if request was aborted
          if (abortController.current?.signal.aborted) {
            throw new Error("Request aborted");
          }

          return response;
        }, retryOptions);
      });

      setData(result);
      lastFetchTime.current = now;
      onSuccess?.(result);
    } catch (err) {
      const error = err as Error;

      // Don't set error if request was aborted
      if (error.message !== "Request aborted") {
        setError(error);
        onError?.(error);
      }
    } finally {
      setLoading(false);
      abortController.current = null;
    }
  }, [
    key,
    fetcher,
    enabled,
    retryOptions,
    staleTime,
    data,
    onSuccess,
    onError,
  ]);

  const refetch = useCallback(async () => {
    // Clear cache to force fresh fetch
    requestCache.clear(key);
    await fetchData();
  }, [key, fetchData]);

  const clearCache = useCallback(() => {
    requestCache.clear(key);
    setData(null);
    lastFetchTime.current = 0;
  }, [key]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate<T, U>(
  key: string,
  fetcher: () => Promise<T>,
  updater: (data: T, update: U) => T
) {
  const { data, loading, error, refetch } = useOptimizedFetch({ key, fetcher });

  const optimisticUpdate = useCallback(
    async (update: U, mutation: () => Promise<void>) => {
      if (!data) return;

      // Optimistically update the cache
      const optimisticData = updater(data, update);
      requestCache.clear(key);

      // Temporarily set optimistic data
      const originalData = data;
      // Note: In a real implementation, you'd want to update the cache directly
      // For now, we'll just refetch after the mutation

      try {
        await mutation();
        // Refetch to get the actual updated data
        await refetch();
      } catch (error) {
        // Revert on error
        console.error("Optimistic update failed:", error);
        // In a real implementation, you'd revert the cache here
      }
    },
    [data, key, updater, refetch]
  );

  return {
    data,
    loading,
    error,
    optimisticUpdate,
  };
}
