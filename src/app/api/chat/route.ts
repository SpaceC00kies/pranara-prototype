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
import { GeminiDirectProvider } from '../../../services/llm/geminiDirectProvider';
import { getDatabase } from '../../../services/databaseService';
import { createAnalyticsEvent } from '../../../services/analyticsService';
// Utility functions for session management
function generateSessionId(): string {
  return crypto.randomUUID();
}

function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Check if it's a UUID format (for authenticated users) or 64-char hex (for anonymous users)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexRegex = /^[a-f0-9]{64}$/i;
  
  return uuidRegex.test(sessionId) || hexRegex.test(sessionId);
}

function detectLanguage(message: string): string {
  // Simple Thai language detection
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(message) ? 'th' : 'en';
}
import {
  classifyTopic as classifyJirungTopic
} from '../../../data/jirungKnowledge';
import {
  getFallbackResponse,
  shouldUseEmergencyFallback,
  FallbackService
} from '../../../services/fallbackService';
import { retryApiCall } from '../../../services/retryService';
import { getUserProfile } from '../../../services/userProfileService';
import {
  conversationHistoryService,
  createChatMessage
} from '../../../services/conversationHistoryService';
import { authenticateRequest } from '../../../services/authService';
import { 
  addChatMessage, 
  validateSessionOwnership,
  getOrCreateDefaultSession 
} from '../../../services/sessionService';

// Initialize AI service and fallback service
let aiService: AIService | null = null;
const fallbackService = FallbackService.getInstance();

function getAIService(): AIService {
  if (!aiService) {
    const geminiProvider = new GeminiDirectProvider();
    aiService = createAIService(geminiProvider);
  }
  return aiService;
}

/**
 * POST /api/chat
 * Process user message and return streaming AI response
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

    const { message, sessionId, mode = 'conversation', model } = body;

    // Check if user is authenticated
    const user = await authenticateRequest(request.headers);
    let validSessionId = sessionId;

    if (user) {
      // Authenticated user - handle persistent sessions
      if (sessionId) {
        // Validate session ownership
        const isOwner = await validateSessionOwnership(sessionId, user.id);
        if (!isOwner) {
          return NextResponse.json(
            createErrorResponse('INVALID_INPUT', 'Session not found or access denied'),
            { status: 403 }
          );
        }
        validSessionId = sessionId;
      } else {
        // No session provided - get or create default session
        const defaultSession = await getOrCreateDefaultSession(user.id);
        if (!defaultSession) {
          return NextResponse.json(
            createErrorResponse('DATABASE_ERROR', 'Failed to create session'),
            { status: 500 }
          );
        }
        validSessionId = defaultSession.id;
      }
    } else {
      // Anonymous user - use simple session validation
      if (!sessionId || !isValidSessionId(sessionId)) {
        console.error('❌ Invalid session ID for anonymous user:', {
          sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : 'null',
          length: sessionId?.length,
          isString: typeof sessionId === 'string'
        });
        return NextResponse.json(
          createErrorResponse('INVALID_INPUT', 'A valid session ID is required.'),
          { status: 400 }
        );
      }
      validSessionId = sessionId;
    }

    // Detect language
    const language = detectLanguage(message);

    // Get user profile for demographic-aware responses
    const userProfile = await getUserProfile(validSessionId) || undefined;

    // Add user message to conversation history
    const userMessage = createChatMessage(message, 'user', classifyJirungTopic(message) as TopicCategory);
    conversationHistoryService.addMessage(validSessionId, userMessage);

    // For authenticated users, also persist to database
    if (user) {
      try {
        await addChatMessage(validSessionId, user.id, message, 'user', classifyJirungTopic(message));
      } catch (error) {
        console.error('Failed to persist user message:', error);
        // Continue with response - don't fail the chat
      }
    }

    // Get conversation context for repetition detection
    const conversationContext = conversationHistoryService.getConversationContext(validSessionId);

    // For Jirung queries, we'll handle context in the system prompt instead
    // to avoid triggering greeting responses
    const enhancedMessage = message;

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const ai = getAIService();

          // Generate streaming response
          for await (const chunk of ai.processMessageStream(enhancedMessage, validSessionId, language, mode, model)) {
            fullResponse += chunk;
            const data = JSON.stringify({ chunk }) + '\n';
            controller.enqueue(encoder.encode(data));
          }

          // For authenticated users, persist AI response to database
          if (user && fullResponse.trim()) {
            try {
              await addChatMessage(validSessionId, user.id, fullResponse, 'assistant', classifyJirungTopic(message));
            } catch (error) {
              console.error('Failed to persist AI response:', error);
              // Don't fail the stream - response was already sent
            }
          }

          controller.close();
        } catch (error) {
          console.warn('AI service failed, using fallback response:', error);

          // Send fallback response
          const fallbackResponse = 'ขออภัยค่ะ เกิดข้อผิดพลาดในการตอบกลับ กรุณาลองใหม่อีกครั้งค่ะ';
          fullResponse = fallbackResponse;
          
          // For authenticated users, persist fallback response
          if (user) {
            try {
              await addChatMessage(validSessionId, user.id, fallbackResponse, 'assistant');
            } catch (error) {
              console.error('Failed to persist fallback response:', error);
            }
          }
          
          const data = JSON.stringify({ chunk: fallbackResponse }) + '\n';
          controller.enqueue(encoder.encode(data));
          controller.close();
        }
      }
    });

    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

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