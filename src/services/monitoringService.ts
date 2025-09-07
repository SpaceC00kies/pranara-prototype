/**
 * Monitoring Service
 * 
 * Provides alerting and monitoring capabilities for the health system.
 * This service can be extended to integrate with external monitoring systems
 * like Vercel Analytics, Sentry, or custom alerting systems.
 */

import { HealthService } from './healthService';
import { ServiceStatus } from '../types';

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  service?: string;
  metadata?: Record<string, unknown>;
}

export interface MonitoringConfig {
  errorRateThreshold: number; // Percentage (0-1)
  memoryThreshold: number; // Bytes
  responseTimeThreshold: number; // Milliseconds
  alertCooldown: number; // Milliseconds between same alerts
}

export class MonitoringService {
  private healthService: HealthService;
  private config: MonitoringConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();

  constructor(healthService: HealthService, config?: Partial<MonitoringConfig>) {
    this.healthService = healthService;
    this.config = {
      errorRateThreshold: 0.05, // 5%
      memoryThreshold: 500 * 1024 * 1024, // 500MB
      responseTimeThreshold: 5000, // 5 seconds
      alertCooldown: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Check system health and generate alerts
   */
  async checkAndAlert(): Promise<Alert[]> {
    const newAlerts: Alert[] = [];

    try {
      const detailedStatus = await this.healthService.getDetailedStatus();
      
      // Check service health
      for (const service of detailedStatus.services) {
        const serviceAlert = this.checkServiceHealth(service);
        if (serviceAlert) {
          newAlerts.push(serviceAlert);
        }
      }

      // Check error rate
      const errorRateAlert = this.checkErrorRate(detailedStatus.metrics.errorRate);
      if (errorRateAlert) {
        newAlerts.push(errorRateAlert);
      }

      // Check memory usage
      const memoryAlert = this.checkMemoryUsage(detailedStatus.metrics.memoryUsage);
      if (memoryAlert) {
        newAlerts.push(memoryAlert);
      }

      // Process new alerts
      for (const alert of newAlerts) {
        this.processAlert(alert);
      }

    } catch (error) {
      const systemAlert = this.createAlert(
        'system-monitoring-error',
        'critical',
        `Monitoring system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'monitoring'
      );
      newAlerts.push(systemAlert);
      this.processAlert(systemAlert);
    }

    return newAlerts;
  }

  /**
   * Check individual service health
   */
  private checkServiceHealth(service: ServiceStatus): Alert | null {
    if (!service.healthy) {
      const alertId = `service-${service.name}-unhealthy`;
      
      if (this.shouldCreateAlert(alertId)) {
        return this.createAlert(
          alertId,
          service.name === 'gemini' ? 'high' : 'critical',
          `Service ${service.name} is unhealthy: ${service.error || 'Unknown error'}`,
          service.name,
          {
            responseTime: service.responseTime,
            lastChecked: service.lastChecked,
            error: service.error,
          }
        );
      }
    } else {
      // Resolve alert if service is now healthy
      this.resolveAlert(`service-${service.name}-unhealthy`);
    }

    return null;
  }

  /**
   * Check error rate threshold
   */
  private checkErrorRate(errorRate: number): Alert | null {
    const alertId = 'high-error-rate';
    
    if (errorRate > this.config.errorRateThreshold) {
      if (this.shouldCreateAlert(alertId)) {
        return this.createAlert(
          alertId,
          errorRate > 0.2 ? 'critical' : 'high',
          `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
          'system',
          { errorRate, threshold: this.config.errorRateThreshold }
        );
      }
    } else {
      this.resolveAlert(alertId);
    }

    return null;
  }

  /**
   * Check memory usage threshold
   */
  private checkMemoryUsage(memoryUsage: NodeJS.MemoryUsage): Alert | null {
    const alertId = 'high-memory-usage';
    
    if (memoryUsage.heapUsed > this.config.memoryThreshold) {
      if (this.shouldCreateAlert(alertId)) {
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const thresholdMB = Math.round(this.config.memoryThreshold / 1024 / 1024);
        
        return this.createAlert(
          alertId,
          memoryUsage.heapUsed > this.config.memoryThreshold * 1.5 ? 'critical' : 'medium',
          `High memory usage: ${memoryMB}MB (threshold: ${thresholdMB}MB)`,
          'system',
          { memoryUsage, threshold: this.config.memoryThreshold }
        );
      }
    } else {
      this.resolveAlert(alertId);
    }

    return null;
  }

  /**
   * Create a new alert
   */
  private createAlert(
    id: string,
    severity: Alert['severity'],
    message: string,
    service?: string,
    metadata?: Record<string, unknown>
  ): Alert {
    return {
      id,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      service,
      metadata,
    };
  }

  /**
   * Process and store alert
   */
  private processAlert(alert: Alert): void {
    this.activeAlerts.set(alert.id, alert);
    this.lastAlertTimes.set(alert.id, Date.now());
    
    // Log alert (in production, this would integrate with external systems)
    console.warn(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`, {
      id: alert.id,
      service: alert.service,
      timestamp: alert.timestamp,
      metadata: alert.metadata,
    });

    // Here you would integrate with external alerting systems:
    // - Send to Slack/Discord webhook
    // - Send to PagerDuty
    // - Send to email notification service
    // - Log to external monitoring service
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.timestamp = new Date();
      
      console.info(`[RESOLVED] Alert ${alertId} has been resolved`);
    }
  }

  /**
   * Check if we should create an alert (respects cooldown)
   */
  private shouldCreateAlert(alertId: string): boolean {
    const lastAlertTime = this.lastAlertTimes.get(alertId);
    if (!lastAlertTime) return true;
    
    const timeSinceLastAlert = Date.now() - lastAlertTime;
    return timeSinceLastAlert > this.config.alertCooldown;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 50): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear resolved alerts older than specified time
   */
  clearOldAlerts(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoffTime = Date.now() - maxAge;
    
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.resolved && alert.timestamp.getTime() < cutoffTime) {
        this.activeAlerts.delete(alertId);
        this.lastAlertTimes.delete(alertId);
      }
    }
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    activeAlerts: number;
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByService: Record<string, number>;
  } {
    const allAlerts = Array.from(this.activeAlerts.values());
    const activeAlerts = allAlerts.filter(alert => !alert.resolved);
    
    const alertsBySeverity: Record<string, number> = {};
    const alertsByService: Record<string, number> = {};
    
    for (const alert of allAlerts) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      if (alert.service) {
        alertsByService[alert.service] = (alertsByService[alert.service] || 0) + 1;
      }
    }
    
    return {
      activeAlerts: activeAlerts.length,
      totalAlerts: allAlerts.length,
      alertsBySeverity,
      alertsByService,
    };
  }
}

/**
 * Create monitoring service instance
 */
export function createMonitoringService(
  healthService: HealthService,
  config?: Partial<MonitoringConfig>
): MonitoringService {
  return new MonitoringService(healthService, config);
}