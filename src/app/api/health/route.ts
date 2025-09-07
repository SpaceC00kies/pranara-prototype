/**
 * Health Check API Endpoint
 * 
 * Provides system health status including service connectivity checks,
 * basic performance metrics, and error rate tracking.
 */

import { NextResponse } from 'next/server';
import { HealthResponse, ApiResponse } from '../../../types';
import { HealthService } from '../../../services/healthService';

// Initialize health service
const healthService = new HealthService();

/**
 * GET /api/health
 * Returns system health status and service connectivity
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Perform comprehensive health check
    const healthStatus = await healthService.performHealthCheck();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Add performance metrics
    const healthResponse: HealthResponse = {
      ...healthStatus,
      responseTime,
    };

    // Determine HTTP status code based on health status
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    const response: ApiResponse<HealthResponse> = {
      success: healthStatus.status !== 'unhealthy',
      data: healthResponse,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: httpStatus });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse: ApiResponse<HealthResponse> = {
      success: false,
      error: {
        error: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        fallbackMessage: 'Unable to determine system health',
        showLineOption: false,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

/**
 * HEAD /api/health
 * Lightweight health check for load balancers
 */
export async function HEAD(): Promise<NextResponse> {
  try {
    const healthStatus = await healthService.getBasicHealthStatus();
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;
    
    return new NextResponse(null, { 
      status: httpStatus,
      headers: {
        'X-Health-Status': healthStatus.status,
        'X-Uptime': healthStatus.uptime.toString(),
      }
    });
    
  } catch (error) {
    console.error('Basic health check failed:', error);
    return new NextResponse(null, { status: 503 });
  }
}