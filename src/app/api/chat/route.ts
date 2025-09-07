/**
 * Chat API Endpoint
 * Handles user messages, AI responses, and analytics logging
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ChatRequest,
  ChatResponse,
  ErrorResponse,
  ErrorCode,
  AnalyticsEvent,
  TopicCategory
} from '../../../types';
import { AIService, createAIService } from '../../../services/llm/aiService';
import { createGeminiProvider } from '../../../services/llm/geminiProvider';
import { getDatabase } from '../../../services/databaseService';
import { createAnalyticsEvent } from '../../../services/analyticsService';
import {
  generateSessionId,
  isValidSessionId,
  detectLanguage
} from '../../../services/sessionService';
import { 
  classifyTopic as classifyJirungTopic,
  scrubPII 
} from '../../../data/jirungKnowledge';
import { 
  getFallbackResponse, 
  shouldUseEmergencyFallback,
  FallbackService 
} from '../../../services/fallbackService';
import { retryApiCall } from '../../../services/retryService';
import { getUserProfile } from '../../../services/userProfileService';

// Initialize AI service and fallback service
let aiService: AIService | null = null;
const fallbackService = FallbackService.getInstance();

function getAIService(): AIService {
  if (!aiService) {
    const geminiProvider = createGeminiProvider();
    aiService = createAIService(geminiProvider);
  }
  return aiService;
}

/**
 * POST /api/chat
 * Process user message and return AI response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: ChatRequest = await request.json();

    // Validate request
    const validation = validateChatRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        createErrorResponse('INVALID_INPUT', validation.error || 'Invalid request'),
        { status: 400 }
      );
    }

    const { message, sessionId } = body;

    // Generate session ID if not provided or invalid
    const validSessionId = isValidSessionId(sessionId) ? sessionId : generateSessionId();

    // Detect language
    const language = detectLanguage(message);

    // Get user profile for demographic-aware responses
    const userProfile = await getUserProfile(validSessionId);

    // For Jirung queries, we'll handle context in the system prompt instead
    // to avoid triggering greeting responses
    const enhancedMessage = message;

    // Process message with AI service with fallback handling
    let aiResponse;
    let usedFallback = false;
    
    try {
      const ai = getAIService();
      // Note: In a real implementation, you'd track conversation length per session
      // For now, we'll use a simple heuristic based on message content
      const conversationLength = 1; // This should be tracked per session in production
      
      aiResponse = await retryApiCall(
        () => ai.processMessage(enhancedMessage, validSessionId, language, conversationLength),
        'ai-process-message',
        {
          maxAttempts: 2,
          baseDelay: 1000,
          retryCondition: (error: unknown) => {
            // Only retry on specific errors
            if (error && typeof error === 'object' && 'code' in error) {
              const errorCode = (error as { code: string }).code;
              return ['NETWORK_ERROR', 'RATE_LIMIT_EXCEEDED', 'GEMINI_UNAVAILABLE'].includes(errorCode);
            }
            return false;
          }
        }
      );
    } catch (error) {
      console.warn('AI service failed, using fallback response:', error);
      usedFallback = true;
      
      // Classify topic for fallback
      const topicCategory = classifyJirungTopic(message);
      
      // Check for emergency situations
      if (shouldUseEmergencyFallback(message)) {
        const emergencyResponse = getFallbackResponse('emergency', language);
        aiResponse = {
          response: emergencyResponse,
          topic: 'emergency',
          showLineOption: true
        };
      } else {
        // Use contextual fallback
        const fallbackResponse = fallbackService.getContextualFallback(
          topicCategory as TopicCategory,
          language,
          1, // conversationLength - would be tracked in real implementation
          [] // previous topics would be tracked in real implementation
        );
        
        aiResponse = {
          response: fallbackResponse,
          topic: topicCategory as TopicCategory,
          showLineOption: true
        };
      }
    }

    // Create analytics event with enhanced topic classification and demographic context
    const topicCategory = classifyJirungTopic(message);
    const analyticsEvent = createAnalyticsEvent(
      validSessionId,
      scrubPII(message), // Use PII-scrubbed version for logging
      topicCategory as TopicCategory,
      language,
      false, // lineClicked will be tracked separately
      usedFallback ? 'fallback' : 'primary',
      userProfile ? {
        ageRange: userProfile.ageRange,
        gender: userProfile.gender,
        location: userProfile.location
      } : undefined
    );

    // Log analytics (non-blocking)
    logAnalytics(analyticsEvent).catch(error => {
      console.error('Analytics logging failed:', error);
    });

    // Create response
    const chatResponse: ChatResponse = {
      response: aiResponse.response,
      topic: aiResponse.topic as TopicCategory,
      showLineOption: aiResponse.showLineOption,
      sessionId: validSessionId
    };

    // Add performance headers
    const responseTime = Date.now() - startTime;
    const response = NextResponse.json(chatResponse);
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    response.headers.set('X-AI-Provider', getAIService().getProviderName());

    return response;

  } catch (error) {
    console.error('Chat API error:', error);

    // Handle specific error types
    if (error && typeof error === 'object' && 'code' in error) {
      const llmError = error as { code: string; message: string };
      return NextResponse.json(
        createErrorResponse(llmError.code, llmError.message),
        { status: getStatusCodeForError(llmError.code) }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      createErrorResponse('UNKNOWN_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}

/**
 * Validate chat request
 */
function validateChatRequest(body: unknown): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required' };
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.message || typeof requestBody.message !== 'string') {
    return { isValid: false, error: 'Message is required and must be a string' };
  }

  if (requestBody.message.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (requestBody.message.length > 1000) {
    return { isValid: false, error: 'Message is too long (max 1000 characters)' };
  }

  // Session ID is optional - will be generated if not provided
  if (requestBody.sessionId && typeof requestBody.sessionId !== 'string') {
    return { isValid: false, error: 'Session ID must be a string' };
  }

  return { isValid: true };
}

/**
 * Create standardized error response
 */
function createErrorResponse(code: string, message: string): ErrorResponse {
  return {
    error: message,
    code: code as ErrorCode,
    fallbackMessage: getFallbackMessage(code),
    showLineOption: shouldShowLineOptionForError(code),
    timestamp: new Date()
  };
}

/**
 * Get fallback message for error codes
 */
function getFallbackMessage(code: string): string {
  const fallbacks: Record<string, string> = {
    'GEMINI_UNAVAILABLE': 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
    'RATE_LIMIT_EXCEEDED': 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
    'INVALID_INPUT': 'กรุณาใส่ข้อความที่ถูกต้อง',
    'SAFETY_VIOLATION': 'เนื้อหานี้ไม่เหมาะสม กรุณาลองถามในหัวข้ออื่น',
    'NETWORK_ERROR': 'เกิดปัญหาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
    'DATABASE_ERROR': 'เกิดปัญหาระบบ กรุณาลองใหม่อีกครั้ง',
    'UNKNOWN_ERROR': 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  };

  return fallbacks[code] || fallbacks['UNKNOWN_ERROR'];
}

/**
 * Determine if LINE option should be shown for error
 */
function shouldShowLineOptionForError(code: string): boolean {
  const showLineForErrors = [
    'GEMINI_UNAVAILABLE',
    'RATE_LIMIT_EXCEEDED',
    'SAFETY_VIOLATION',
    'UNKNOWN_ERROR'
  ];

  return showLineForErrors.includes(code);
}

/**
 * Get HTTP status code for error
 */
function getStatusCodeForError(code: string): number {
  const statusCodes: Record<string, number> = {
    'INVALID_INPUT': 400,
    'RATE_LIMIT_EXCEEDED': 429,
    'SAFETY_VIOLATION': 400,
    'NETWORK_ERROR': 502,
    'GEMINI_UNAVAILABLE': 503,
    'DATABASE_ERROR': 500,
    'UNKNOWN_ERROR': 500
  };

  return statusCodes[code] || 500;
}

/**
 * Log analytics event (non-blocking)
 */
async function logAnalytics(event: AnalyticsEvent): Promise<void> {
  try {
    const db = await getDatabase();
    await db.storeAnalyticsEvent(event);
  } catch (error) {
    // Don't throw - analytics logging should not break the main flow
    console.error('Failed to log analytics:', error);
  }
}



/**
 * Health check for chat API
 * GET /api/chat/health
 */
export async function GET() {
  try {
    const ai = getAIService();
    const isAIHealthy = await ai.validateConnection();

    let isDatabaseHealthy = false;
    try {
      const db = await getDatabase();
      isDatabaseHealthy = await db.isHealthy();
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    const status = isAIHealthy && isDatabaseHealthy ? 'healthy' : 'degraded';

    return NextResponse.json({
      status,
      timestamp: new Date(),
      services: {
        ai: isAIHealthy,
        database: isDatabaseHealthy
      }
    });

  } catch (error) {
    console.error('Chat health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date(),
      services: {
        ai: false,
        database: false
      }
    }, { status: 503 });
  }
}