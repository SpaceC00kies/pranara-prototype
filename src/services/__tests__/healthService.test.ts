/**
 * Health Service Tests
 * 
 * Tests for system health monitoring functionality including:
 * - Service connectivity checks
 * - Performance metrics tracking
 * - Error rate monitoring
 * - Caching behavior
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HealthService, getHealthService } from '../healthService';

// Mock dependencies
vi.mock('../databaseService');
vi.mock('../llm/geminiProvider');

describe('HealthService', () => {
  let healthService: HealthService;
  let mockDatabase: {
    isHealthy: ReturnType<typeof vi.fn>;
  };
  let mockGeminiProvider: {
    validateConnection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    healthService = new HealthService();
    
    // Mock database
    mockDatabase = {
      isHealthy: vi.fn(),
    };
    
    // Mock Gemini provider
    mockGeminiProvider = {
      validateConnection: vi.fn(),
    };
    
    // Setup mocks
    const databaseService = await import('../databaseService');
    const geminiProvider = await import('../llm/geminiProvider');
    
    vi.mocked(databaseService.getDatabase).mockResolvedValue(mockDatabase);
    vi.mocked(geminiProvider.createGeminiProvider).mockReturnValue(mockGeminiProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
    healthService.resetMetrics();
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all services are healthy', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.services.gemini).toBe(true);
      expect(result.services.database).toBe(true);
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return degraded status when one service is unhealthy', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(false);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.status).toBe('degraded');
      expect(result.services.gemini).toBe(true);
      expect(result.services.database).toBe(false);
    });

    it('should return unhealthy status when all services are unhealthy', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(false);
      mockGeminiProvider.validateConnection.mockResolvedValue(false);

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.gemini).toBe(false);
      expect(result.services.database).toBe(false);
    });

    it('should handle service check errors gracefully', async () => {
      // Arrange
      mockDatabase.isHealthy.mockRejectedValue(new Error('Database connection failed'));
      mockGeminiProvider.validateConnection.mockRejectedValue(new Error('API key invalid'));

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.gemini).toBe(false);
      expect(result.services.database).toBe(false);
      expect(result.serviceDetails?.database.error).toContain('Database connection failed');
      expect(result.serviceDetails?.gemini.error).toContain('API key invalid');
    });

    it('should include performance metrics', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.memoryUsage).toBeDefined();
      expect(result.metrics?.errorRate).toBeDefined();
      expect(result.metrics?.requestCount).toBeDefined();
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should include service response times', async () => {
      // Arrange
      mockDatabase.isHealthy.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      mockGeminiProvider.validateConnection.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(true), 50))
      );

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.serviceDetails?.database.responseTime).toBeGreaterThan(90);
      expect(result.serviceDetails?.gemini.responseTime).toBeGreaterThan(40);
    });
  });

  describe('caching behavior', () => {
    it('should cache health check results', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);

      // Act
      const result1 = await healthService.performHealthCheck();
      const result2 = await healthService.performHealthCheck();

      // Assert
      expect(mockDatabase.isHealthy).toHaveBeenCalledTimes(1);
      expect(mockGeminiProvider.validateConnection).toHaveBeenCalledTimes(1);
      expect(result1.timestamp).toEqual(result2.timestamp);
    });

    it('should refresh cache after TTL expires', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      let currentTime = originalNow();
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Act
      await healthService.performHealthCheck();
      
      // Simulate 31 seconds passing (cache TTL is 30 seconds)
      currentTime += 31000;
      await healthService.performHealthCheck();

      // Assert
      expect(mockDatabase.isHealthy).toHaveBeenCalledTimes(2);
      expect(mockGeminiProvider.validateConnection).toHaveBeenCalledTimes(2);

      // Cleanup
      vi.mocked(Date.now).mockRestore();
    });
  });

  describe('getBasicHealthStatus', () => {
    it('should return healthy status with low error rate', async () => {
      // Act
      const result = await healthService.getBasicHealthStatus();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return degraded status with high error rate', async () => {
      // Arrange - simulate high error rate
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }

      // Act
      const result = await healthService.getBasicHealthStatus();

      // Assert
      expect(result.status).toBe('degraded');
    });
  });

  describe('metrics tracking', () => {
    it('should track request count', () => {
      // Act
      healthService.recordRequest();
      healthService.recordRequest();
      healthService.recordRequest();

      // Assert
      expect(healthService.getErrorRate()).toBe(0);
    });

    it('should track error rate', () => {
      // Act
      healthService.recordRequest();
      healthService.recordError();
      healthService.recordRequest();

      // Assert
      expect(healthService.getErrorRate()).toBe(0.5); // 1 error out of 2 total requests
    });

    it('should reset metrics', () => {
      // Arrange
      healthService.recordError();
      healthService.recordRequest();

      // Act
      healthService.resetMetrics();

      // Assert
      expect(healthService.getErrorRate()).toBe(0);
    });
  });

  describe('getDetailedStatus', () => {
    it('should return detailed service status and metrics', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(false);

      // Act
      const result = await healthService.getDetailedStatus();

      // Assert
      expect(result.services).toHaveLength(2);
      expect(result.services[0].name).toBe('gemini');
      expect(result.services[1].name).toBe('database');
      expect(result.metrics).toBeDefined();
      expect(result.alerts).toBeDefined();
    });

    it('should generate alerts for unhealthy services', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(false);
      mockGeminiProvider.validateConnection.mockResolvedValue(false);

      // Act
      const result = await healthService.getDetailedStatus();

      // Assert
      expect(result.alerts).toContain('Gemini API is unavailable');
      expect(result.alerts).toContain('Database connection is unhealthy');
    });

    it('should generate alert for high error rate', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      // Simulate high error rate (>5%)
      for (let i = 0; i < 10; i++) {
        healthService.recordRequest();
      }
      healthService.recordError();

      // Act
      const result = await healthService.getDetailedStatus();

      // Assert
      expect(result.alerts.some(alert => alert.includes('High error rate'))).toBe(true);
    });
  });

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      // Act
      const instance1 = getHealthService();
      const instance2 = getHealthService();

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across calls', () => {
      // Arrange
      const instance1 = getHealthService();
      instance1.recordRequest();

      // Act
      const instance2 = getHealthService();

      // Assert
      expect(instance2.getErrorRate()).toBe(0); // 0 errors, 1 request
    });
  });
});