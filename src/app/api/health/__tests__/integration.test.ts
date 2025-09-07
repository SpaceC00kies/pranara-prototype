/**
 * Health Monitoring Integration Tests
 * 
 * End-to-end tests for the health monitoring system including:
 * - Real service connectivity checks
 * - Performance monitoring under load
 * - Error rate tracking
 * - Alerting logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, HEAD } from '../route';
import { HealthService } from '../../../../services/healthService';

// Mock external dependencies but allow real HealthService logic
vi.mock('../../../../services/databaseService', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../../../services/llm/geminiProvider', () => ({
  createGeminiProvider: vi.fn(),
}));

describe('Health Monitoring Integration', () => {
  let mockDatabase: {
    isHealthy: ReturnType<typeof vi.fn>;
  };
  let mockGeminiProvider: {
    validateConnection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Setup mocks
    mockDatabase = {
      isHealthy: vi.fn(),
    };
    
    mockGeminiProvider = {
      validateConnection: vi.fn(),
    };
    
    const databaseService = await import('../../../../services/databaseService');
    const geminiProvider = await import('../../../../services/llm/geminiProvider');
    
    vi.mocked(databaseService.getDatabase).mockResolvedValue(mockDatabase);
    vi.mocked(geminiProvider.createGeminiProvider).mockReturnValue(mockGeminiProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('end-to-end health check flow', () => {
    it('should perform complete health check with all services healthy', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('healthy');
      expect(data.data.services.gemini).toBe(true);
      expect(data.data.services.database).toBe(true);
      expect(data.data.uptime).toBeGreaterThan(0);
      expect(data.data.version).toBeDefined();
      expect(data.data.responseTime).toBeGreaterThan(0);
    });

    it('should handle mixed service health states', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(false);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('degraded');
      expect(data.data.services.gemini).toBe(false);
      expect(data.data.services.database).toBe(true);
    });

    it('should handle complete service failure', async () => {
      // Arrange
      mockDatabase.isHealthy.mockRejectedValue(new Error('Database connection timeout'));
      mockGeminiProvider.validateConnection.mockRejectedValue(new Error('API key expired'));
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.data.status).toBe('unhealthy');
      expect(data.data.services.gemini).toBe(false);
      expect(data.data.services.database).toBe(false);
      expect(data.data.serviceDetails?.database.error).toContain('Database connection timeout');
      expect(data.data.serviceDetails?.gemini.error).toContain('API key expired');
    });
  });

  describe('performance monitoring', () => {
    it('should measure service response times accurately', async () => {
      // Arrange
      const databaseDelay = 150;
      const geminiDelay = 200;
      
      mockDatabase.isHealthy.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(true), databaseDelay))
      );
      mockGeminiProvider.validateConnection.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(true), geminiDelay))
      );
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.data.serviceDetails?.database.responseTime).toBeGreaterThan(databaseDelay - 10);
      expect(data.data.serviceDetails?.gemini.responseTime).toBeGreaterThan(geminiDelay - 10);
      expect(data.data.responseTime).toBeGreaterThan(Math.max(databaseDelay, geminiDelay) - 10);
    });

    it('should include memory usage metrics', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.data.metrics).toBeDefined();
      expect(data.data.metrics.memoryUsage).toBeDefined();
      expect(data.data.metrics.memoryUsage.rss).toBeGreaterThan(0);
      expect(data.data.metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(data.data.metrics.memoryUsage.heapTotal).toBeGreaterThan(0);
    });
  });

  describe('caching behavior', () => {
    it('should cache results and avoid redundant service calls', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      const request1 = new NextRequest('http://localhost:3000/api/health');
      const request2 = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response1 = await GET(request1);
      const response2 = await GET(request2);
      
      const data1 = await response1.json();
      const data2 = await response2.json();

      // Assert
      expect(mockDatabase.isHealthy).toHaveBeenCalledTimes(1);
      expect(mockGeminiProvider.validateConnection).toHaveBeenCalledTimes(1);
      expect(data1.data.timestamp).toEqual(data2.data.timestamp);
    });

    it('should refresh cache after TTL expires', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = originalNow();
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const request1 = new NextRequest('http://localhost:3000/api/health');
      const request2 = new NextRequest('http://localhost:3000/api/health');

      // Act
      await GET(request1);
      
      // Simulate 31 seconds passing (cache TTL is 30 seconds)
      currentTime += 31000;
      await GET(request2);

      // Assert
      expect(mockDatabase.isHealthy).toHaveBeenCalledTimes(2);
      expect(mockGeminiProvider.validateConnection).toHaveBeenCalledTimes(2);

      // Cleanup
      Date.now = originalNow;
    });
  });

  describe('HEAD request optimization', () => {
    it('should provide lightweight health check for load balancers', async () => {
      // Act
      const response = await HEAD();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Health-Status')).toBe('healthy');
      expect(response.headers.get('X-Uptime')).toBeDefined();
      
      // Should not have response body
      const body = await response.text();
      expect(body).toBe('');
    });

    it('should not perform expensive service checks for HEAD requests', async () => {
      // Act
      await HEAD();

      // Assert - HEAD should use basic health check, not full service validation
      expect(mockDatabase.isHealthy).not.toHaveBeenCalled();
      expect(mockGeminiProvider.validateConnection).not.toHaveBeenCalled();
    });
  });

  describe('error rate tracking', () => {
    it('should track and report error rates', async () => {
      // Arrange
      const healthService = new HealthService();
      
      // Simulate some requests with errors
      healthService.recordRequest();
      healthService.recordError();
      healthService.recordRequest();
      healthService.recordError();
      healthService.recordRequest();

      // Act
      const errorRate = healthService.getErrorRate();

      // Assert
      expect(errorRate).toBe(0.4); // 2 errors out of 5 total requests
    });

    it('should include error rate in detailed status', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      const healthService = new HealthService();
      
      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        healthService.recordRequest();
      }
      healthService.recordError();

      // Act
      const detailedStatus = await healthService.getDetailedStatus();

      // Assert
      expect(detailedStatus.metrics.errorRate).toBeGreaterThan(0.05);
      expect(detailedStatus.alerts.some(alert => alert.includes('High error rate'))).toBe(true);
    });
  });

  describe('alerting logic', () => {
    it('should generate alerts for service failures', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(false);
      mockGeminiProvider.validateConnection.mockResolvedValue(false);
      
      const healthService = new HealthService();

      // Act
      const detailedStatus = await healthService.getDetailedStatus();

      // Assert
      expect(detailedStatus.alerts).toContain('Gemini API is unavailable');
      expect(detailedStatus.alerts).toContain('Database connection is unhealthy');
    });

    it('should generate alert for high memory usage', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 600 * 1024 * 1024, // 600MB
        heapTotal: 500 * 1024 * 1024,
        heapUsed: 550 * 1024 * 1024, // High heap usage
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });
      
      const healthService = new HealthService();

      // Act
      const detailedStatus = await healthService.getDetailedStatus();

      // Assert
      expect(detailedStatus.alerts.some(alert => alert.includes('High memory usage'))).toBe(true);

      // Cleanup
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('concurrent request handling', () => {
    it('should handle multiple concurrent health checks efficiently', async () => {
      // Arrange
      mockDatabase.isHealthy.mockResolvedValue(true);
      mockGeminiProvider.validateConnection.mockResolvedValue(true);
      
      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/health')
      );

      // Act
      const responses = await Promise.all(requests.map(req => GET(req)));
      const dataPromises = responses.map(res => res.json());
      const allData = await Promise.all(dataPromises);

      // Assert
      expect(responses).toHaveLength(5);
      expect(allData.every(data => data.success)).toBe(true);
      expect(allData.every(data => data.data.status === 'healthy')).toBe(true);
      
      // Should use cache for subsequent requests
      expect(mockDatabase.isHealthy).toHaveBeenCalledTimes(1);
      expect(mockGeminiProvider.validateConnection).toHaveBeenCalledTimes(1);
    });
  });
});