/**
 * LINE Click Tracking API Integration Tests
 * Tests the /api/chat/line-click endpoint functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { TopicCategory } from '@/types';

// Mock the database service
vi.mock('@/services/databaseService', () => ({
  getDatabase: vi.fn()
}));

// Mock the analytics service
vi.mock('@/services/analyticsService', () => ({
  createAnalyticsEvent: vi.fn()
}));

describe('/api/chat/line-click', () => {
  let mockDatabase: any;
  let mockCreateAnalyticsEvent: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock database
    mockDatabase = {
      storeAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
      isHealthy: vi.fn().mockResolvedValue(true)
    };

    // Mock analytics service
    mockCreateAnalyticsEvent = vi.fn().mockReturnValue({
      sessionId: 'hashed-session',
      timestamp: new Date(),
      textSnippet: '[LINE_CLICK:complex_topic:medium]',
      topic: 'diabetes',
      language: 'th',
      lineClicked: true,
      routed: 'primary'
    });

    // Setup module mocks
    const { getDatabase } = require('@/services/databaseService');
    const { createAnalyticsEvent } = require('@/services/analyticsService');
    
    (getDatabase as any).mockResolvedValue(mockDatabase);
    (createAnalyticsEvent as any).mockImplementation(mockCreateAnalyticsEvent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/chat/line-click', () => {
    it('should successfully track LINE click with valid data', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        topic: 'diabetes' as TopicCategory,
        reason: 'complex_topic',
        timestamp: new Date().toISOString(),
        urgency: 'medium'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(true);
      expect(data.timestamp).toBeDefined();

      // Verify analytics event was created
      expect(mockCreateAnalyticsEvent).toHaveBeenCalledWith(
        'test-session-123',
        '[LINE_CLICK:complex_topic:medium]',
        'diabetes',
        'th',
        true,
        'primary'
      );

      // Verify database storage was called
      expect(mockDatabase.storeAnalyticsEvent).toHaveBeenCalled();
    });

    it('should handle missing sessionId', async () => {
      const requestBody = {
        topic: 'general' as TopicCategory,
        reason: 'manual',
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Session ID is required');
      expect(data.tracked).toBe(false);
    });

    it('should handle missing topic', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        reason: 'manual',
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Topic is required');
      expect(data.tracked).toBe(false);
    });

    it('should handle missing reason', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        topic: 'general' as TopicCategory,
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Reason is required');
      expect(data.tracked).toBe(false);
    });

    it('should handle invalid reason', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        topic: 'general' as TopicCategory,
        reason: 'invalid_reason',
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid reason provided');
      expect(data.tracked).toBe(false);
    });

    it('should handle missing timestamp', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        topic: 'general' as TopicCategory,
        reason: 'manual'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Timestamp is required');
      expect(data.tracked).toBe(false);
    });

    it('should handle invalid timestamp format', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        topic: 'general' as TopicCategory,
        reason: 'manual',
        timestamp: 'invalid-timestamp'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid timestamp format');
      expect(data.tracked).toBe(false);
    });

    it('should handle invalid urgency level', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        topic: 'general' as TopicCategory,
        reason: 'manual',
        timestamp: new Date().toISOString(),
        urgency: 'invalid_urgency'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid urgency level provided');
      expect(data.tracked).toBe(false);
    });

    it('should handle database storage failure gracefully', async () => {
      // Mock database to throw error
      mockDatabase.storeAnalyticsEvent.mockRejectedValue(new Error('Database error'));

      const requestBody = {
        sessionId: 'test-session-123',
        topic: 'general' as TopicCategory,
        reason: 'manual',
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(false); // Should be false due to database error
      expect(data.timestamp).toBeDefined();
    });

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: 'invalid-json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to track LINE click');
      expect(data.tracked).toBe(false);
    });

    it('should track emergency clicks with high urgency', async () => {
      const requestBody = {
        sessionId: 'emergency-session',
        topic: 'emergency' as TopicCategory,
        reason: 'emergency',
        timestamp: new Date().toISOString(),
        urgency: 'high'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(true);

      // Verify analytics event was created with emergency context
      expect(mockCreateAnalyticsEvent).toHaveBeenCalledWith(
        'emergency-session',
        '[LINE_CLICK:emergency:high]',
        'emergency',
        'th',
        true,
        'primary'
      );
    });

    it('should track long conversation clicks with low urgency', async () => {
      const requestBody = {
        sessionId: 'long-conversation-session',
        topic: 'general' as TopicCategory,
        reason: 'long_conversation',
        timestamp: new Date().toISOString(),
        urgency: 'low'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(true);

      // Verify analytics event was created with long conversation context
      expect(mockCreateAnalyticsEvent).toHaveBeenCalledWith(
        'long-conversation-session',
        '[LINE_CLICK:long_conversation:low]',
        'general',
        'th',
        true,
        'primary'
      );
    });
  });

  describe('GET /api/chat/line-click/stats', () => {
    it('should return LINE click statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/line-click/stats?days=7');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.totalClicks).toBeDefined();
      expect(data.data.clicksByTopic).toBeDefined();
      expect(data.data.clicksByReason).toBeDefined();
      expect(data.data.clicksByUrgency).toBeDefined();
      expect(data.data.conversionRate).toBeDefined();
      expect(data.data.averageTimeToClick).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should handle database error in stats endpoint', async () => {
      // Mock database to throw error
      const { getDatabase } = require('@/services/databaseService');
      (getDatabase as any).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/chat/line-click/stats');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to retrieve LINE click statistics');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle query parameters correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/line-click/stats?days=30&topic=diabetes');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete emergency handoff tracking flow', async () => {
      const emergencyRequestBody = {
        sessionId: 'emergency-session-456',
        topic: 'emergency' as TopicCategory,
        reason: 'emergency',
        timestamp: new Date().toISOString(),
        urgency: 'high'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(emergencyRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(true);

      // Verify the analytics event includes emergency context
      const analyticsCall = mockCreateAnalyticsEvent.mock.calls[0];
      expect(analyticsCall[1]).toBe('[LINE_CLICK:emergency:high]');
      expect(analyticsCall[2]).toBe('emergency');
    });

    it('should handle complete complex topic handoff tracking flow', async () => {
      const complexRequestBody = {
        sessionId: 'complex-session-789',
        topic: 'diabetes' as TopicCategory,
        reason: 'complex_topic',
        timestamp: new Date().toISOString(),
        urgency: 'medium'
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(complexRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(true);

      // Verify the analytics event includes complex topic context
      const analyticsCall = mockCreateAnalyticsEvent.mock.calls[0];
      expect(analyticsCall[1]).toBe('[LINE_CLICK:complex_topic:medium]');
      expect(analyticsCall[2]).toBe('diabetes');
    });

    it('should handle manual LINE clicks without urgency', async () => {
      const manualRequestBody = {
        sessionId: 'manual-session-101',
        topic: 'general' as TopicCategory,
        reason: 'manual',
        timestamp: new Date().toISOString()
        // No urgency provided
      };

      const request = new NextRequest('http://localhost:3000/api/chat/line-click', {
        method: 'POST',
        body: JSON.stringify(manualRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(true);

      // Verify the analytics event handles missing urgency
      const analyticsCall = mockCreateAnalyticsEvent.mock.calls[0];
      expect(analyticsCall[1]).toBe('[LINE_CLICK:manual:unknown]');
      expect(analyticsCall[2]).toBe('general');
    });
  });
});