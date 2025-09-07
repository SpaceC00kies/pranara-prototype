/**
 * Health API Endpoint Tests
 * 
 * Tests for the /api/health endpoint including:
 * - GET requests with various health statuses
 * - HEAD requests for load balancer checks
 * - Error handling and response formats
 * - Performance metrics inclusion
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, HEAD } from '../route';

// Mock the HealthService
vi.mock('../../../../services/healthService', () => ({
  HealthService: vi.fn().mockImplementation(() => ({
    performHealthCheck: vi.fn(),
    getBasicHealthStatus: vi.fn(),
  })),
}));

describe('/api/health', () => {
  let mockHealthService: {
    performHealthCheck: ReturnType<typeof vi.fn>;
    getBasicHealthStatus: ReturnType<typeof vi.fn>;
  };
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Create mock health service instance
    const { HealthService } = await import('../../../../services/healthService');
    mockHealthService = new HealthService();
    
    // Mock request
    mockRequest = new NextRequest('http://localhost:3000/api/health');
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status with 200 when all services are healthy', async () => {
      // Arrange
      const mockHealthResponse = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          gemini: true,
          database: true,
        },
        uptime: 123456,
        version: '1.0.0',
        responseTime: 150,
        metrics: {
          memoryUsage: {
            rss: 1000000,
            heapTotal: 800000,
            heapUsed: 600000,
            external: 100000,
            arrayBuffers: 50000,
          },
          errorRate: 0.01,
          requestCount: 100,
        },
      };

      mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('healthy');
      expect(data.data.services.gemini).toBe(true);
      expect(data.data.services.database).toBe(true);
      expect(data.data.responseTime).toBeGreaterThan(0);
      expect(data.timestamp).toBeDefined();
    });

    it('should return degraded status with 200 when some services are unhealthy', async () => {
      // Arrange
      const mockHealthResponse = {
        status: 'degraded' as const,
        timestamp: new Date(),
        services: {
          gemini: true,
          database: false,
        },
        uptime: 123456,
        version: '1.0.0',
        responseTime: 200,
      };

      mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('degraded');
      expect(data.data.services.gemini).toBe(true);
      expect(data.data.services.database).toBe(false);
    });

    it('should return unhealthy status with 503 when all services are unhealthy', async () => {
      // Arrange
      const mockHealthResponse = {
        status: 'unhealthy' as const,
        timestamp: new Date(),
        services: {
          gemini: false,
          database: false,
        },
        uptime: 123456,
        version: '1.0.0',
        responseTime: 300,
      };

      mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.data.status).toBe('unhealthy');
      expect(data.data.services.gemini).toBe(false);
      expect(data.data.services.database).toBe(false);
    });

    it('should handle health check errors and return 503', async () => {
      // Arrange
      mockHealthService.performHealthCheck.mockRejectedValue(new Error('Health check failed'));

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('HEALTH_CHECK_ERROR');
      expect(data.error.error).toBe('Health check failed');
    });

    it('should include performance metrics in response', async () => {
      // Arrange
      const mockHealthResponse = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          gemini: true,
          database: true,
        },
        uptime: 123456,
        version: '1.0.0',
        responseTime: 150,
        metrics: {
          memoryUsage: {
            rss: 1000000,
            heapTotal: 800000,
            heapUsed: 600000,
            external: 100000,
            arrayBuffers: 50000,
          },
          errorRate: 0.02,
          requestCount: 50,
        },
      };

      mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(data.data.metrics).toBeDefined();
      expect(data.data.metrics.memoryUsage).toBeDefined();
      expect(data.data.metrics.errorRate).toBe(0.02);
      expect(data.data.metrics.requestCount).toBe(50);
    });

    it('should measure and include response time', async () => {
      // Arrange
      const mockHealthResponse = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          gemini: true,
          database: true,
        },
        uptime: 123456,
        version: '1.0.0',
      };

      // Add delay to health check
      mockHealthService.performHealthCheck.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockHealthResponse), 100))
      );

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(data.data.responseTime).toBeGreaterThan(90);
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 with headers when system is healthy', async () => {
      // Arrange
      const mockBasicStatus = {
        status: 'healthy' as const,
        uptime: 123456,
        timestamp: new Date(),
      };

      mockHealthService.getBasicHealthStatus.mockResolvedValue(mockBasicStatus);

      // Act
      const response = await HEAD();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Health-Status')).toBe('healthy');
      expect(response.headers.get('X-Uptime')).toBe('123456');
    });

    it('should return 503 when system is unhealthy', async () => {
      // Arrange
      const mockBasicStatus = {
        status: 'unhealthy' as const,
        uptime: 123456,
        timestamp: new Date(),
      };

      mockHealthService.getBasicHealthStatus.mockResolvedValue(mockBasicStatus);

      // Act
      const response = await HEAD();

      // Assert
      expect(response.status).toBe(503);
      expect(response.headers.get('X-Health-Status')).toBe('unhealthy');
    });

    it('should return 503 when basic health check fails', async () => {
      // Arrange
      mockHealthService.getBasicHealthStatus.mockRejectedValue(new Error('Basic check failed'));

      // Act
      const response = await HEAD();

      // Assert
      expect(response.status).toBe(503);
    });

    it('should not return response body for HEAD request', async () => {
      // Arrange
      const mockBasicStatus = {
        status: 'healthy' as const,
        uptime: 123456,
        timestamp: new Date(),
      };

      mockHealthService.getBasicHealthStatus.mockResolvedValue(mockBasicStatus);

      // Act
      const response = await HEAD();
      const body = await response.text();

      // Assert
      expect(body).toBe('');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      mockHealthService.performHealthCheck.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('HEALTH_CHECK_ERROR');
    });

    it('should include timestamp in error responses', async () => {
      // Arrange
      mockHealthService.performHealthCheck.mockRejectedValue(new Error('Test error'));

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('response format validation', () => {
    it('should return properly formatted ApiResponse', async () => {
      // Arrange
      const mockHealthResponse = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          gemini: true,
          database: true,
        },
        uptime: 123456,
        version: '1.0.0',
      };

      mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.error).toBeUndefined();
    });

    it('should return properly formatted error response', async () => {
      // Arrange
      mockHealthService.performHealthCheck.mockRejectedValue(new Error('Test error'));

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('timestamp');
      expect(data.success).toBe(false);
      expect(data.data).toBeUndefined();
      expect(data.error).toBeDefined();
      expect(data.error).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('fallbackMessage');
      expect(data.error).toHaveProperty('showLineOption');
      expect(data.error).toHaveProperty('timestamp');
    });
  });
});