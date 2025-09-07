/**
 * LINE Click Tracking API Endpoint
 * Handles LINE handoff click tracking for analytics and conversion measurement
 */

import { NextRequest, NextResponse } from 'next/server';
import { TopicCategory, AnalyticsEvent } from '@/types';
import { getDatabase } from '@/services/databaseService';
import { createAnalyticsEvent } from '@/services/analyticsService';

interface LineClickRequest {
  sessionId: string;
  topic: TopicCategory;
  reason: 'emergency' | 'complex_topic' | 'complex_language' | 'long_conversation' | 'manual';
  timestamp: string;
  urgency?: 'high' | 'medium' | 'low';
}

interface LineClickResponse {
  success: boolean;
  tracked: boolean;
  timestamp: Date;
}

/**
 * POST /api/chat/line-click
 * Track LINE handoff clicks for analytics and conversion measurement
 */
export async function POST(request: NextRequest) {
  try {
    const body: LineClickRequest = await request.json();

    // Validate request
    const validation = validateLineClickRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error,
          tracked: false,
          timestamp: new Date()
        },
        { status: 400 }
      );
    }

    const { sessionId, topic, reason, timestamp, urgency } = body;

    // Create LINE click analytics event
    const analyticsEvent = createAnalyticsEvent(
      sessionId,
      `[LINE_CLICK:${reason}:${urgency || 'unknown'}]`, // Special marker for LINE clicks with context
      topic,
      'th', // Default to Thai for now
      true, // lineClicked = true
      'primary'
    );

    // Add additional LINE-specific metadata
    const enhancedEvent: AnalyticsEvent & {
      lineClickReason?: string;
      lineClickUrgency?: string;
      lineClickTimestamp?: Date;
    } = {
      ...analyticsEvent,
      lineClickReason: reason,
      lineClickUrgency: urgency || 'unknown',
      lineClickTimestamp: new Date(timestamp)
    };

    // Log analytics (with error handling)
    let tracked = false;
    try {
      const db = await getDatabase();
      await db.storeAnalyticsEvent(enhancedEvent);
      tracked = true;
      
      // Log additional LINE-specific metrics if database supports it
      await logLineConversionMetrics(db, {
        sessionId,
        topic,
        reason,
        urgency: urgency || 'unknown',
        timestamp: new Date(timestamp)
      });
      
    } catch (error) {
      console.error('Failed to log LINE click analytics:', error);
      // Don't fail the request if analytics logging fails
    }

    // Return success response
    const response: LineClickResponse = {
      success: true,
      tracked,
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('LINE click tracking error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track LINE click',
        tracked: false,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

/**
 * Validate LINE click request
 */
function validateLineClickRequest(body: unknown): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required' };
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.sessionId || typeof requestBody.sessionId !== 'string') {
    return { isValid: false, error: 'Session ID is required and must be a string' };
  }

  if (!requestBody.topic || typeof requestBody.topic !== 'string') {
    return { isValid: false, error: 'Topic is required and must be a string' };
  }

  if (!requestBody.reason || typeof requestBody.reason !== 'string') {
    return { isValid: false, error: 'Reason is required and must be a string' };
  }

  const validReasons = ['emergency', 'complex_topic', 'complex_language', 'long_conversation', 'manual'];
  if (!validReasons.includes(requestBody.reason as string)) {
    return { isValid: false, error: 'Invalid reason provided' };
  }

  if (!requestBody.timestamp || typeof requestBody.timestamp !== 'string') {
    return { isValid: false, error: 'Timestamp is required and must be a string' };
  }

  // Validate timestamp format
  const timestamp = new Date(requestBody.timestamp as string);
  if (isNaN(timestamp.getTime())) {
    return { isValid: false, error: 'Invalid timestamp format' };
  }

  // Optional urgency validation
  if (requestBody.urgency && typeof requestBody.urgency !== 'string') {
    return { isValid: false, error: 'Urgency must be a string if provided' };
  }

  const validUrgencies = ['high', 'medium', 'low'];
  if (requestBody.urgency && !validUrgencies.includes(requestBody.urgency as string)) {
    return { isValid: false, error: 'Invalid urgency level provided' };
  }

  return { isValid: true };
}

/**
 * Log LINE-specific conversion metrics
 */
async function logLineConversionMetrics(
  _db: unknown,
  metrics: {
    sessionId: string;
    topic: TopicCategory;
    reason: string;
    urgency: string;
    timestamp: Date;
  }
): Promise<void> {
  try {
    // This would be implemented based on the specific database schema
    // For now, we'll just log to console for debugging
    console.log('LINE Conversion Metrics:', {
      sessionId: metrics.sessionId.substring(0, 8), // Privacy-safe logging
      topic: metrics.topic,
      reason: metrics.reason,
      urgency: metrics.urgency,
      timestamp: metrics.timestamp.toISOString()
    });

    // If using a more advanced analytics system, you could:
    // - Track conversion funnels
    // - Measure time-to-handoff
    // - Analyze handoff success rates
    // - Create cohort analyses
    
  } catch (error) {
    console.error('Failed to log LINE conversion metrics:', error);
    // Don't throw - this is supplementary logging
  }
}

/**
 * GET /api/chat/line-click/stats
 * Get LINE handoff statistics (for admin/analytics purposes)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const topic = searchParams.get('topic') as TopicCategory | null;

    const db = await getDatabase();
    
    // Get LINE click statistics
    const stats = await getLineClickStats(db, days, topic);
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Failed to get LINE click stats:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve LINE click statistics',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

/**
 * Get LINE click statistics from database
 */
async function getLineClickStats(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _db: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _days: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _topic: TopicCategory | null
): Promise<{
  totalClicks: number;
  clicksByTopic: Record<string, number>;
  clicksByReason: Record<string, number>;
  clicksByUrgency: Record<string, number>;
  conversionRate: number;
  averageTimeToClick: number;
}> {
  try {
    // This would be implemented based on the specific database schema
    // For now, return mock data structure
    return {
      totalClicks: 0,
      clicksByTopic: {},
      clicksByReason: {},
      clicksByUrgency: {},
      conversionRate: 0,
      averageTimeToClick: 0
    };
    
  } catch (error) {
    console.error('Failed to calculate LINE click stats:', error);
    throw error;
  }
}