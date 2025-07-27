// Retry utilities for handling failed API requests

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export const retryRequest = async <T>(
  request: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (shouldNotRetry(error as Error)) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw new Error(`Request failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Calculate delay with exponential backoff
      const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      
      console.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying in ${currentDelay}ms...`, lastError);
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  throw lastError!;
};

// Determine if an error should not be retried
const shouldNotRetry = (error: Error): boolean => {
  // Don't retry authentication errors
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    return true;
  }

  // Don't retry permission errors
  if (error.message.includes('403') || error.message.includes('Forbidden')) {
    return true;
  }

  // Don't retry validation errors
  if (error.message.includes('400') || error.message.includes('Bad Request')) {
    return true;
  }

  // Don't retry if it's a network error that's not recoverable
  if (error.name === 'NetworkError' && !error.message.includes('timeout')) {
    return true;
  }

  return false;
};

// Retry with exponential backoff for specific Supabase operations
export const retrySupabaseOperation = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<T> => {
  return retryRequest(async () => {
    const result = await operation();
    if (result.error) {
      throw new Error(result.error.message || 'Supabase operation failed');
    }
    if (result.data === null) {
      throw new Error('No data returned from operation');
    }
    return result.data;
  }, options);
};

// Retry with timeout
export const retryWithTimeout = async <T>(
  request: () => Promise<T>,
  timeout: number = 10000,
  options: RetryOptions = {}
): Promise<T> => {
  return retryRequest(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const result = await Promise.race([
        request(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        })
      ]);
      
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }, options);
}; 