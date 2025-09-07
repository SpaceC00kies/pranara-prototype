/**
 * Retry Service with Exponential Backoff
 * Provides robust retry mechanisms for API calls and operations
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error: unknown) => {
    // Default: retry on network errors and 5xx status codes
    if (error && typeof error === 'object') {
      if ('code' in error) {
        const errorCode = (error as { code: string }).code;
        return ['NETWORK_ERROR', 'GEMINI_UNAVAILABLE', 'DATABASE_ERROR', 'RATE_LIMIT_EXCEEDED'].includes(errorCode);
      }
      if ('status' in error) {
        const status = (error as { status: number }).status;
        return status >= 500 || status === 429; // Server errors or rate limiting
      }
    }
    return true; // Retry by default for unknown errors
  }
};

/**
 * Retry service class
 */
export class RetryService {
  private static instance: RetryService;

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: unknown;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;

        // Check if we should retry this error
        if (!finalConfig.retryCondition!(error)) {
          return {
            success: false,
            error,
            attempts: attempt,
            totalTime: Date.now() - startTime
          };
        }

        // Don't wait after the last attempt
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // Call retry callback
        if (finalConfig.onRetry) {
          finalConfig.onRetry(attempt, error);
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, finalConfig);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Retry specifically for API calls
   */
  async retryApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const apiConfig: Partial<RetryConfig> = {
      ...config,
      onRetry: (attempt, error) => {
        console.warn(`API call to ${endpoint} failed (attempt ${attempt}):`, error);
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }
      }
    };

    return this.executeWithRetry(apiCall, apiConfig);
  }

  /**
   * Retry for database operations
   */
  async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const dbConfig: Partial<RetryConfig> = {
      maxAttempts: 2, // Fewer retries for DB operations
      baseDelay: 500,
      ...config,
      retryCondition: (error: unknown) => {
        // Retry on connection errors, timeouts, but not on constraint violations
        if (error && typeof error === 'object' && 'code' in error) {
          const errorCode = (error as { code: string }).code;
          const retryableCodes = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'DATABASE_ERROR'];
          return retryableCodes.includes(errorCode);
        }
        return false; // Don't retry unknown DB errors
      },
      onRetry: (attempt, error) => {
        console.warn(`Database operation ${operationName} failed (attempt ${attempt}):`, error);
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }
      }
    };

    return this.executeWithRetry(operation, dbConfig);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      // Add random jitter of ±25%
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Convenience functions for common retry patterns
 */

/**
 * Retry a function with default configuration
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryService = RetryService.getInstance();
  const result = await retryService.executeWithRetry(operation, config);
  
  if (result.success) {
    return result.data!;
  } else {
    throw result.error;
  }
}

/**
 * Retry an API call with logging
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  endpoint: string,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryService = RetryService.getInstance();
  const result = await retryService.retryApiCall(apiCall, endpoint, config);
  
  if (result.success) {
    return result.data!;
  } else {
    throw result.error;
  }
}

/**
 * Retry database operation with appropriate configuration
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryService = RetryService.getInstance();
  const result = await retryService.retryDatabaseOperation(operation, operationName, config);
  
  if (result.success) {
    return result.data!;
  } else {
    throw result.error;
  }
}

/**
 * Circuit breaker pattern for preventing cascade failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private successThreshold: number = 2
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Global circuit breaker instances for different services
 */
export const geminiCircuitBreaker = new CircuitBreaker(3, 30000, 1); // More sensitive for AI service
export const databaseCircuitBreaker = new CircuitBreaker(5, 60000, 2); // Standard for database

export default RetryService;