interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000
  }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxAttempts) break;
      
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt - 1),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
