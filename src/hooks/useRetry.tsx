import { useState, useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

export const useRetry = (options: RetryOptions = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = initialDelay * Math.pow(backoffFactor, attempt);
    return Math.min(delay, maxDelay);
  }, [initialDelay, backoffFactor, maxDelay]);

  const executeWithRetry = useCallback(async <T,>(
    fn: (signal?: AbortSignal) => Promise<T>,
    shouldRetry?: (error: Error) => boolean
  ): Promise<T> => {
    let lastError: Error | null = null;
    
    // Cancel any existing retry operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (signal.aborted) {
          throw new Error('Operation cancelled');
        }

        if (attempt > 0) {
          setState(prev => ({ ...prev, isRetrying: true, retryCount: attempt }));
          const delay = calculateDelay(attempt - 1);
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await fn(signal);
        setState({ isRetrying: false, retryCount: 0, lastError: null });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);

        // Check if we should retry this error
        const retriableError = !shouldRetry || shouldRetry(lastError);
        const isRetriableStatus = !lastError.message.includes('Payment required') && 
                                   !lastError.message.includes('Authentication required');

        if (attempt === maxRetries || !retriableError || !isRetriableStatus) {
          setState({ isRetrying: false, retryCount: 0, lastError });
          throw lastError;
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Unknown error');
  }, [maxRetries, calculateDelay]);

  const cancelRetry = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({ isRetrying: false, retryCount: 0, lastError: null });
  }, []);

  return {
    ...state,
    executeWithRetry,
    cancelRetry,
  };
};
