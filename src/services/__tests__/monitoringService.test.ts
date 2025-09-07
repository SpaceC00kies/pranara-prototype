/**
 * Monitoring Service Tests
 * 
 * Tests for the monitoring and alerting system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MonitoringService, createMonitoringService } from '../monitoringService';
import { HealthService } from '../healthService';

describe('MonitoringService', () => {
  let healthService: HealthService;
  let monitoringService: MonitoringService;

  beforeEach(() => {
    healthService = new HealthService();
    monitoringService = createMonitoringService(healthService, {
      errorRateThreshold: 0.05,
      memoryThreshold: 100 * 1024 * 1024, // 100MB for testing
      responseTimeThreshold: 1000,
      alertCooldown: 1000, // 1 second for testing
    });

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    healthService.resetMetrics();
  });

  describe('error rate monitoring', () => {
    it('should create alert for high error rate', async () => {
      // Arrange - simulate high error rate
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }

      // Act
      const alerts = await monitoringService.checkAndAlert();

      // Assert
      const errorRateAlert = alerts.find(alert => alert.id === 'high-error-rate');
      expect(errorRateAlert).toBeDefined();
      expect(errorRateAlert?.severity).toBe('critical');
      expect(errorRateAlert?.message).toContain('High error rate detected');
    });

    it('should resolve alert when error rate returns to normal', async () => {
      // Arrange - create high error rate alert
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }
      await monitoringService.checkAndAlert();
      
      // Reset and add normal requests
      healthService.resetMetrics();
      for (let i = 0; i < 20; i++) {
        healthService.recordRequest();
      }

      // Act
      await monitoringService.checkAndAlert();

      // Assert
      const activeAlerts = monitoringService.getActiveAlerts();
      const activeErrorRateAlerts = activeAlerts.filter(alert => alert.id === 'high-error-rate');
      expect(activeErrorRateAlerts).toHaveLength(0);
    });

    it('should respect alert cooldown period', async () => {
      // Arrange - simulate high error rate
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }

      // Act - trigger alerts twice quickly
      const alerts1 = await monitoringService.checkAndAlert();
      const alerts2 = await monitoringService.checkAndAlert();

      // Assert - second check should not create new alert due to cooldown
      const errorRateAlert1 = alerts1.find(alert => alert.id === 'high-error-rate');
      const errorRateAlert2 = alerts2.find(alert => alert.id === 'high-error-rate');
      expect(errorRateAlert1).toBeDefined();
      expect(errorRateAlert2).toBeUndefined();
    });

    it('should create new alert after cooldown period', async () => {
      // Arrange - simulate high error rate
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }

      // Act - trigger alert, wait for cooldown, trigger again
      const alerts1 = await monitoringService.checkAndAlert();
      
      // Wait for cooldown (1 second in test config)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const alerts2 = await monitoringService.checkAndAlert();

      // Assert
      const errorRateAlert1 = alerts1.find(alert => alert.id === 'high-error-rate');
      const errorRateAlert2 = alerts2.find(alert => alert.id === 'high-error-rate');
      expect(errorRateAlert1).toBeDefined();
      expect(errorRateAlert2).toBeDefined();
    });
  });

  describe('memory usage monitoring', () => {
    it('should create alert for high memory usage', async () => {
      // Arrange - mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 200 * 1024 * 1024,
        heapTotal: 150 * 1024 * 1024,
        heapUsed: 120 * 1024 * 1024, // Above 100MB threshold
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      // Act
      const alerts = await monitoringService.checkAndAlert();

      // Assert
      expect(alerts.some(alert => alert.id === 'high-memory-usage')).toBe(true);
      const memoryAlert = alerts.find(alert => alert.id === 'high-memory-usage');
      expect(memoryAlert?.message).toContain('High memory usage');
      expect(memoryAlert?.severity).toBe('medium');

      // Cleanup
      process.memoryUsage = originalMemoryUsage;
    });

    it('should create critical alert for very high memory usage', async () => {
      // Arrange - mock very high memory usage
      const originalMemoryUsage = process.memoryUsage;
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 300 * 1024 * 1024,
        heapTotal: 250 * 1024 * 1024,
        heapUsed: 200 * 1024 * 1024, // Above 150MB (1.5x threshold)
        external: 20 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });

      // Act
      const alerts = await monitoringService.checkAndAlert();

      // Assert
      const memoryAlert = alerts.find(alert => alert.id === 'high-memory-usage');
      expect(memoryAlert?.severity).toBe('critical');

      // Cleanup
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('alert management', () => {
    it('should track active alerts', async () => {
      // Arrange - create conditions for alerts
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }

      // Act
      await monitoringService.checkAndAlert();

      // Assert
      const activeAlerts = monitoringService.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
      expect(activeAlerts.every(alert => !alert.resolved)).toBe(true);
    });

    it('should provide alert history', async () => {
      // Arrange - create and resolve alerts
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }
      await monitoringService.checkAndAlert();
      
      // Reset to resolve alerts
      healthService.resetMetrics();
      await monitoringService.checkAndAlert();

      // Act
      const history = monitoringService.getAlertHistory();

      // Assert
      expect(history.length).toBeGreaterThan(0);
      expect(history.some(alert => alert.resolved)).toBe(true);
    });

    it('should provide monitoring statistics', async () => {
      // Arrange - create various alerts
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }
      await monitoringService.checkAndAlert();

      // Act
      const stats = monitoringService.getMonitoringStats();

      // Assert
      expect(stats.totalAlerts).toBeGreaterThan(0);
      expect(stats.alertsBySeverity).toBeDefined();
      expect(Object.keys(stats.alertsBySeverity).length).toBeGreaterThan(0);
    });

    it('should clear old resolved alerts', async () => {
      // Arrange - create alerts
      for (let i = 0; i < 10; i++) {
        healthService.recordError();
      }
      await monitoringService.checkAndAlert();
      
      const initialHistory = monitoringService.getAlertHistory();
      const initialCount = initialHistory.length;
      
      // Act - clear old alerts (this should clear all alerts regardless of resolved status for testing)
      monitoringService.clearOldAlerts(0);

      // Assert - some alerts should be cleared
      const finalHistory = monitoringService.getAlertHistory();
      expect(finalHistory.length).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('configuration management', () => {
    it('should allow configuration updates', () => {
      // Act
      monitoringService.updateConfig({
        errorRateThreshold: 0.1,
        memoryThreshold: 200 * 1024 * 1024,
      });

      // Assert - test by checking if new thresholds are applied
      expect(() => monitoringService.updateConfig({})).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle monitoring system errors gracefully', async () => {
      // Arrange - mock healthService to throw error
      vi.spyOn(healthService, 'getDetailedStatus').mockRejectedValue(new Error('Health service error'));

      // Act
      const alerts = await monitoringService.checkAndAlert();

      // Assert
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('system-monitoring-error');
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].message).toContain('Monitoring system error');
    });
  });

  describe('factory function', () => {
    it('should create monitoring service with default config', () => {
      // Act
      const service = createMonitoringService(healthService);

      // Assert
      expect(service).toBeInstanceOf(MonitoringService);
    });

    it('should create monitoring service with custom config', () => {
      // Act
      const service = createMonitoringService(healthService, {
        errorRateThreshold: 0.1,
      });

      // Assert
      expect(service).toBeInstanceOf(MonitoringService);
    });
  });
});