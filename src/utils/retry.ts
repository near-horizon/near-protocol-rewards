/**
 * Retry utility with exponential backoff
 * Handles transient failures in API calls
 */

interface RetryOptions {
  maxRetries: number;
  retryDelay: (attempt: number) => number;
  shouldRetry?: (error: any) => boolean;
}

const defaultShouldRetry = (error: any): boolean => {
  // Retry on network errors and rate limits
  if (!error.response) return true;
  const status = error.response.status;
  return status === 429 || (status >= 500 && status < 600);
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, retryDelay, shouldRetry = defaultShouldRetry } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = retryDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
