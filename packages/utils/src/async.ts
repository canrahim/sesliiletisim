/**
 * Async utilities for timing and promise handling
 */

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function - delays execution until after wait time
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 * @param func - Function to throttle
 * @param wait - Wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

/**
 * Retry async function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Promise with function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        const waitTime = delay * Math.pow(backoff, attempt);
        onRetry?.(lastError, attempt + 1);
        await sleep(waitTime);
      }
    }
  }
  
  throw lastError!;
}

/**
 * Timeout wrapper for promises
 * @param promise - Promise to wrap
 * @param ms - Timeout in milliseconds
 * @param errorMessage - Error message on timeout
 * @returns Promise that rejects on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

/**
 * Execute promises in parallel with concurrency limit
 * @param items - Array of items to process
 * @param fn - Function to execute for each item
 * @param concurrency - Max parallel executions
 * @returns Promise with all results
 */
export async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const promise = fn(items[i], i).then(result => {
      results[i] = result;
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }
  
  await Promise.all(executing);
  return results;
}

/**
 * Create a cancellable promise
 * @param promise - Promise to make cancellable
 * @returns Object with promise and cancel function
 */
export function makeCancellable<T>(promise: Promise<T>): {
  promise: Promise<T>;
  cancel: () => void;
} {
  let isCancelled = false;
  
  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then(value => {
        if (!isCancelled) resolve(value);
      })
      .catch(error => {
        if (!isCancelled) reject(error);
      });
  });
  
  return {
    promise: wrappedPromise,
    cancel: () => {
      isCancelled = true;
    }
  };
}

/**
 * Batch async operations
 * @param items - Array of items to process
 * @param batchSize - Number of items per batch
 * @param fn - Function to execute for each batch
 * @returns Promise with all results
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  fn: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await fn(batch);
    results.push(...batchResults);
  }
  
  return results;
}
