/**
 * Tests for Retry Service
 */

import { 
  RetryService, 
  withRetry, 
  retryApiCall, 
  retryDatabaseOperation,
  CircuitBreaker 
} from '../retryService';
import { vi } from 'vitest';

describe('RetryService', () => {
  let retryService: RetryService;

  beforeEach(() => {
    retryService = RetryService.getInstance();
    vi.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await retryService.executeWithRetry(mockOperation);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('success');
      
      const result = await retryService.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 10 // Fast for testing
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue({ code: 'AUTHENTICATION_ERROR' });
      
      const result = await retryService.executeWithRetry(mockOperation, {
        retryCondition: (error: any) => error.code !== 'AUTHENTICATION_ERROR'
      });
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect maxAttempts', async () => {
      const mockOperation = vi.fn().mockRejectedValue({ code: 'NETWORK_ERROR' });
      
      const result = await retryService.executeWithRetry(mockOperation, {
        maxAttempts: 2,
        baseDelay: 10
      });
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('success');
      
      const onRetry = vi.fn();
      
      await retryService.executeWithRetry(mockOperation, {
        maxAttempts: 2,
        baseDelay: 10,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, { code: 'NETWORK_ERROR' });
    });

    it('should calculate exponential backoff delay', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      
      await retryService.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitter: false
      });
      
      const totalTime = Date.now() - startTime;
      // Should have delays of ~100ms and ~200ms
      expect(totalTime).toBeGreaterThan(250);
    });
  });

  describe('retryApiCall', () => {
    it('should retry API calls with logging', async () => {
      const mockApiCall = vi.fn()
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue({ data: 'success' });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await retryService.retryApiCall(mockApiCall, '/api/test');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'success' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        { status: 500 }
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('retryDatabaseOperation', () => {
    it('should use appropriate config for database operations', async () => {
      const mockDbOperation = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('db_success');
      
      const result = await retryService.retryDatabaseOperation(
        mockDbOperation, 
        'test_operation'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('db_success');
    });

    it('should not retry on constraint violations', async () => {
      const mockDbOperation = vi.fn().mockRejectedValue({ code: 'UNIQUE_VIOLATION' });
      
      const result = await retryService.retryDatabaseOperation(
        mockDbOperation, 
        'test_operation'
      );
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('convenience functions', () => {
    it('withRetry should work correctly', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('success');
      
      const result = await withRetry(mockOperation, { baseDelay: 10 });
      
      expect(result).toBe('success');
    });

    it('withRetry should throw on failure', async () => {
      const mockOperation = vi.fn().mockRejectedValue({ code: 'NETWORK_ERROR' });
      
      await expect(withRetry(mockOperation, { maxAttempts: 1 }))
        .rejects.toEqual({ code: 'NETWORK_ERROR' });
    });

    it('retryApiCall convenience function should work', async () => {
      const mockApiCall = vi.fn().mockResolvedValue('api_success');
      
      const result = await retryApiCall(mockApiCall, '/api/test');
      
      expect(result).toBe('api_success');
    });

    it('retryDatabaseOperation convenience function should work', async () => {
      const mockDbOperation = vi.fn().mockResolvedValue('db_success');
      
      const result = await retryDatabaseOperation(mockDbOperation, 'test_op');
      
      expect(result).toBe('db_success');
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(2, 1000, 1); // 2 failures, 1s recovery
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe('CLOSED');
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });

  it('should execute operations when CLOSED', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(mockOperation);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('failure'));
    
    // First failure
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    expect(circuitBreaker.getState()).toBe('CLOSED');
    
    // Second failure - should open circuit
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    expect(circuitBreaker.getState()).toBe('OPEN');
  });

  it('should reject immediately when OPEN', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('failure'));
    
    // Trigger failures to open circuit
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Should reject immediately without calling operation
    const newMockOperation = vi.fn().mockResolvedValue('success');
    await expect(circuitBreaker.execute(newMockOperation)).rejects.toThrow('Circuit breaker is OPEN');
    expect(newMockOperation).not.toHaveBeenCalled();
  });

  it('should transition to HALF_OPEN after recovery timeout', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('failure'));
    
    // Open the circuit
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Wait for recovery timeout
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Next operation should transition to HALF_OPEN
    const successOperation = vi.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(successOperation);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should reset failure count on success', async () => {
    const mockFailure = vi.fn().mockRejectedValue(new Error('failure'));
    const mockSuccess = vi.fn().mockResolvedValue('success');
    
    // One failure
    await expect(circuitBreaker.execute(mockFailure)).rejects.toThrow();
    expect(circuitBreaker.getFailureCount()).toBe(1);
    
    // Success should reset count
    await circuitBreaker.execute(mockSuccess);
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });

  it('should reset manually', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('failure'));
    
    // Open the circuit
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    
    expect(circuitBreaker.getState()).toBe('OPEN');
    expect(circuitBreaker.getFailureCount()).toBe(2);
    
    // Manual reset
    circuitBreaker.reset();
    
    expect(circuitBreaker.getState()).toBe('CLOSED');
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
});