/**
 * Health Service
 * 
 * Provides comprehensive system health monitoring including:
 * - Service connectivity checks (Gemini API, Database)
 * - Performance metrics tracking
 * - Error rate monitoring
 * - System uptime tracking
 */

import { HealthResponse } from '../types';
import { getDatabase } from './databaseService';
import { createGeminiProvider } from './llm/geminiProvider';

interface ServiceStatus {
  name: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
  lastChecked: Date;
}

interface PerformanceMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  responseTime: number;
  errorRate: number;
}

interface HealthCheckCache {
  timestamp: Date;
  status: HealthResponse;
  ttl: number; // Time to live in milliseconds
}

export class HealthService {
  private cache: HealthCheckCache | null = null;
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly startTime = Date.now();
  private errorCount = 0;
  private requestCount = 0;

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthResponse> {
    // Check cache first
    if (this.cache && this.isCacheValid()) {
      return this.cache.status;
    }

    const startTime = Date.now();
    
    // Check all services in parallel
    const [geminiStatus, databaseStatus] = await Promise.allSettled([
      this.checkGeminiHealth(),
      this.checkDatabaseHealth(),
    ]);

    // Process results
    const geminiHealthy = geminiStatus.status === 'fulfilled' && geminiStatus.value.healthy;
    const databaseHealthy = databaseStatus.status === 'fulfilled' && databaseStatus.value.healthy;

    // Determine overall system status
    const overallStatus = this.determineOverallStatus(geminiHealthy, databaseHealthy);
    
    // Get performance metrics
    const metrics = this.getPerformanceMetrics();
    
    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date(),
      services: {
        gemini: geminiHealthy,
        database: databaseHealthy,
      },
      uptime: metrics.uptime,
      version: process.env.npm_package_version || '1.0.0',
      responseTime: Date.now() - startTime,
      metrics: {
        memoryUsage: metrics.memoryUsage,
        errorRate: metrics.errorRate,
        requestCount: this.requestCount,
      },
      serviceDetails: {
        gemini: geminiStatus.status === 'fulfilled' ? geminiStatus.value : {
          name: 'gemini',
          healthy: false,
          error: geminiStatus.status === 'rejected' ? geminiStatus.reason?.message : 'Unknown error',
          lastChecked: new Date(),
        },
        database: databaseStatus.status === 'fulfilled' ? databaseStatus.value : {
          name: 'database',
          healthy: false,
          error: databaseStatus.status === 'rejected' ? databaseStatus.reason?.message : 'Unknown error',
          lastChecked: new Date(),
        },
      },
    };

    // Cache the result
    this.cache = {
      timestamp: new Date(),
      status: healthResponse,
      ttl: this.CACHE_TTL,
    };

    return healthResponse;
  }

  /**
   * Get basic health status (lightweight check)
   */
  async getBasicHealthStatus(): Promise<Pick<HealthResponse, 'status' | 'uptime' | 'timestamp'>> {
    const metrics = this.getPerformanceMetrics();
    
    // Basic check - if error rate is too high, mark as degraded
    const status = metrics.errorRate > 0.1 ? 'degraded' : 'healthy';
    
    return {
      status,
      uptime: metrics.uptime,
      timestamp: new Date(),
    };
  }

  /**
   * Check Gemini API health
   */
  private async checkGeminiHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const geminiProvider = createGeminiProvider();
      const isHealthy = await geminiProvider.validateConnection();
      
      return {
        name: 'gemini',
        healthy: isHealthy,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
      
    } catch (error) {
      return {
        name: 'gemini',
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const database = await getDatabase();
      const isHealthy = await database.isHealthy();
      
      return {
        name: 'database',
        healthy: isHealthy,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
      
    } catch (error) {
      return {
        name: 'database',
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Determine overall system status based on service health
   */
  private determineOverallStatus(geminiHealthy: boolean, databaseHealthy: boolean): 'healthy' | 'degraded' | 'unhealthy' {
    if (geminiHealthy && databaseHealthy) {
      return 'healthy';
    } else if (geminiHealthy || databaseHealthy) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): PerformanceMetrics {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    
    return {
      uptime,
      memoryUsage,
      responseTime: 0, // Will be calculated by caller
      errorRate,
    };
  }

  /**
   * Check if cached health status is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    
    const now = Date.now();
    const cacheAge = now - this.cache.timestamp.getTime();
    
    return cacheAge < this.cache.ttl;
  }

  /**
   * Record a request (for metrics)
   */
  recordRequest(): void {
    this.requestCount++;
  }

  /**
   * Record an error (for metrics)
   */
  recordError(): void {
    this.errorCount++;
    this.requestCount++;
  }

  /**
   * Get error rate
   */
  getErrorRate(): number {
    return this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.errorCount = 0;
    this.requestCount = 0;
    this.cache = null;
  }

  /**
   * Get detailed service status for monitoring
   */
  async getDetailedStatus(): Promise<{
    services: ServiceStatus[];
    metrics: PerformanceMetrics;
    alerts: string[];
  }> {
    const [geminiStatus, databaseStatus] = await Promise.allSettled([
      this.checkGeminiHealth(),
      this.checkDatabaseHealth(),
    ]);

    const services: ServiceStatus[] = [
      geminiStatus.status === 'fulfilled' ? geminiStatus.value : {
        name: 'gemini',
        healthy: false,
        error: geminiStatus.reason?.message || 'Unknown error',
        lastChecked: new Date(),
      },
      databaseStatus.status === 'fulfilled' ? databaseStatus.value : {
        name: 'database',
        healthy: false,
        error: databaseStatus.reason?.message || 'Unknown error',
        lastChecked: new Date(),
      },
    ];

    const metrics = this.getPerformanceMetrics();
    
    // Generate alerts based on service status and metrics
    const alerts: string[] = [];
    
    if (!services.find(s => s.name === 'gemini')?.healthy) {
      alerts.push('Gemini API is unavailable');
    }
    
    if (!services.find(s => s.name === 'database')?.healthy) {
      alerts.push('Database connection is unhealthy');
    }
    
    if (metrics.errorRate > 0.05) {
      alerts.push(`High error rate detected: ${(metrics.errorRate * 100).toFixed(2)}%`);
    }
    
    if (metrics.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      alerts.push('High memory usage detected');
    }

    return {
      services,
      metrics,
      alerts,
    };
  }
}

// Singleton instance for request/error tracking
let healthServiceInstance: HealthService | null = null;

/**
 * Get health service singleton
 */
export function getHealthService(): HealthService {
  if (!healthServiceInstance) {
    healthServiceInstance = new HealthService();
  }
  return healthServiceInstance;
}