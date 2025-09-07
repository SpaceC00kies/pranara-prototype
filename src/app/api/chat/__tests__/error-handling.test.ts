/**
 * Integration tests for Chat API error handling and fallback mechanisms
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { vi } from 'vitest';

// Mock the services
vi.mock('../../../services/llm/aiService');
vi.mock('../../../services/databaseService');
vi.mock('../../../services/retryService');
vi.mock('../../../services/fallbackService');

describe('Chat API Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle invalid request body', async () => {
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.code).toBe('INVALID_INPUT');
  });

  it('should handle empty message', async () => {
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: '',
        sessionId: 'test-session'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.code).toBe('INVALID_INPUT');
  });

  it('should handle message too long', async () => {
    const longMessage = 'a'.repeat(1001);
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: longMessage,
        sessionId: 'test-session'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.code).toBe('INVALID_INPUT');
  });

  it('should generate session ID if not provided', async () => {
    // Mock successful AI response
    const { createAIService } = await import('../../../services/llm/aiService');
    const mockAIService = {
      processMessage: vi.fn().mockResolvedValue({
        response: 'Test response',
        topic: 'general',
        showLineOption: false
      })
    };
    (createAIService as any).mockReturnValue(mockAIService);

    // Mock database
    const { getDatabase } = await import('../../../services/databaseService');
    const mockDatabase = {
      storeAnalyticsEvent: vi.fn().mockResolvedValue(true),
      isHealthy: vi.fn().mockResolvedValue(true)
    };
    (getDatabase as any).mockResolvedValue(mockDatabase);

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionId).toBeDefined();
    expect(data.sessionId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  it('should use fallback when AI service fails', async () => {
    // Mock AI service failure
    const { retryApiCall } = await import('../../../services/retryService');
    (retryApiCall as any).mockRejectedValue({
      code: 'GEMINI_UNAVAILABLE',
      message: 'Service unavailable'
    });

    // Mock fallback service
    const { getFallbackResponse, FallbackService } = await import('../../../services/fallbackService');
    (getFallbackResponse as any).mockReturnValue('Fallback response from service');
    
    const mockFallbackService = {
      getContextualFallback: vi.fn().mockReturnValue('Contextual fallback response')
    };
    (FallbackService.getInstance as any).mockReturnValue(mockFallbackService);

    // Mock database
    const { getDatabase } = await import('../../../services/databaseService');
    const mockDatabase = {
      storeAnalyticsEvent: vi.fn().mockResolvedValue(true),
      isHealthy: vi.fn().mockResolvedValue(true)
    };
    (getDatabase as any).mockResolvedValue(mockDatabase);

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        sessionId: 'test-session'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe('Contextual fallback response');
    expect(data.showLineOption).toBe(true);
  });

  it('should use emergency fallback for emergency keywords', async () => {
    // Mock AI service failure
    const { retryApiCall } = await import('../../../services/retryService');
    (retryApiCall as any).mockRejectedValue({
      code: 'GEMINI_UNAVAILABLE',
      message: 'Service unavailable'
    });

    // Mock emergency detection
    const { shouldUseEmergencyFallback, getFallbackResponse } = await import('../../../services/fallbackService');
    (shouldUseEmergencyFallback as any).mockReturnValue(true);
    (getFallbackResponse as any).mockReturnValue('🚨 Emergency response - call 1669');

    // Mock database
    const { getDatabase } = await import('../../../services/databaseService');
    const mockDatabase = {
      storeAnalyticsEvent: vi.fn().mockResolvedValue(true),
      isHealthy: vi.fn().mockResolvedValue(true)
    };
    (getDatabase as any).mockResolvedValue(mockDatabase);

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'ผู้ป่วยหมดสติ',
        sessionId: 'test-session'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toContain('🚨');
    expect(data.response).toContain('1669');
    expect(data.topic).toBe('emergency');
    expect(data.showLineOption).toBe(true);
  });

  it('should log analytics with fallback route', async () => {
    // Mock AI service failure
    const { retryApiCall } = await import('../../../services/retryService');
    (retryApiCall as any).mockRejectedValue({
      code: 'GEMINI_UNAVAILABLE',
      message: 'Service unavailable'
    });

    // Mock fallback service
    const { FallbackService } = await import('../../../services/fallbackService');
    const mockFallbackService = {
      getContextualFallback: vi.fn().mockReturnValue('Fallback response')
    };
    (FallbackService.getInstance as any).mockReturnValue(mockFallbackService);

    // Mock database
    const { getDatabase } = await import('../../../services/databaseService');
    const mockDatabase = {
      storeAnalyticsEvent: vi.fn().mockResolvedValue(true),
      isHealthy: vi.fn().mockResolvedValue(true)
    };
    (getDatabase as any).mockResolvedValue(mockDatabase);

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message',
        sessionId: 'test-session'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(mockDatabase.storeAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        routed: 'fallback'
      })
    );
  });

  it('should handle analytics logging failure gracefully', async () => {
    // Mock successful AI response
    const { createAIService } = await import('../../../services/llm/aiService');
    const mockAIService = {
      processMessage: vi.fn().mockResolvedValue({
        response: 'Test response',
        topic: 'general',
        showLineOption: false
      })
    };
    (createAIService as any).mockReturnValue(mockAIService);

    // Mock database failure
    const { getDatabase } = await import('../../../services/databaseService');
    const mockDatabase = {
      storeAnalyticsEvent: vi.fn().mockRejectedValue(new Error('Database error')),
      isHealthy: vi.fn().mockResolvedValue(true)
    };
    (getDatabase as any).mockResolvedValue(mockDatabase);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        sessionId: 'test-session'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still return successful response despite analytics failure
    expect(response.status).toBe(200);
    expect(data.response).toBe('Test response');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Analytics logging failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should include performance headers', async () => {
    // Mock successful AI response
    const { createAIService } = await import('../../../services/llm/aiService');
    const mockAIService = {
      processMessage: vi.fn().mockResolvedValue({
        response: 'Test response',
        topic: 'general',
        showLineOption: false
      }),
      getProviderName: vi.fn().mockReturnValue('gemini')
    };
    (createAIService as any).mockReturnValue(mockAIService);

    // Mock database
    const { getDatabase } = await import('../../../services/databaseService');
    const mockDatabase = {
      storeAnalyticsEvent: vi.fn().mockResolvedValue(true),
      isHealthy: vi.fn().mockResolvedValue(true)
    };
    (getDatabase as any).mockResolvedValue(mockDatabase);

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        sessionId: 'test-session'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.headers.get('X-Response-Time')).toMatch(/\d+ms/);
    expect(response.headers.get('X-AI-Provider')).toBe('gemini');
  });
});