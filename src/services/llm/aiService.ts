/**
 * AI Service for Jirung Senior Advisor
 * 
 * This service orchestrates AI interactions, combining LLM providers,
 * content safety, and response processing.
 */

import { 
  LLMProvider, 
  LLMConfig, 
  LLMResponse, 
  LLMError,
  TopicCategory,
  SafetyCheckResult,
  UserProfile,
  AppMode
} from '../../types';

// Removed heavy processing imports - keeping it simple

import { 
  buildUserPrompt, 
  getResponseDisclaimer, 
  validateUserInput,
  formatThaiTextResponse
} from './promptUtils';
// Complex conversation patterns removed - letting Gemini 2.5 handle variation naturally
import { 
  conversationHistoryService, 
  createChatMessage,
  ConversationContext 
} from '../conversationHistoryService';

// Sanitization logic moved to system prompt for better LLM-native handling
import { 
  shouldRecommendLineHandoff
} from '../lineService';
import { getUserProfile } from '../userProfileService';
import { TextProcessingResult } from '@/utils';
// validateTextForAIProcessing removed - keeping system simple
import { TextProcessingResult } from '@/utils';

// ============================================================================
// AI SERVICE CONFIGURATION
// ============================================================================

export interface AIServiceConfig {
  llmProvider: LLMProvider;
  defaultLLMConfig: LLMConfig;
  maxRetries: number;
  retryDelayMs: number;
  enableSafetyChecks: boolean;
  // PII scrubbing removed - keeping system simple
}

export interface AIServiceResponse {
  response: string;
  topic: TopicCategory;
  showLineOption: boolean;
  safetyResult: SafetyCheckResult;
  processingResult: TextProcessingResult;
  lineHandoffReason?: 'emergency' | 'complex_topic' | 'complex_language' | 'long_conversation' | 'none';
  lineHandoffUrgency?: 'high' | 'medium' | 'low';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  mode?: AppMode;
}

// ============================================================================
// MAIN AI SERVICE CLASS
// ============================================================================

export class AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  /**
   * Processes a chat message and generates an AI response
   * @param message - User's message
   * @param sessionId - Session identifier
   * @param language - Language preference (th/en)
   * @param conversationLength - Number of messages in conversation (for LINE handoff logic)
   * @param mode - App mode (conversation or intelligence)
   * @param userProfile - User profile for demographic-aware responses
   * @param conversationContext - Optional conversation context to avoid repetition
   * @returns Promise<AIServiceResponse> - Complete response with metadata
   */
  async processMessage(
    message: string,
    sessionId: string,
    language: 'th' | 'en' = 'th',
    conversationLength: number = 1,
    mode: AppMode = 'conversation',
    userProfile?: UserProfile,
    conversationContext?: ConversationContext
  ): Promise<AIServiceResponse> {
    try {
      // Step 1: Validate and sanitize input
      const validatedMessage = validateUserInput(message);
      if (!validatedMessage) {
        throw this.createError('INVALID_INPUT', 'Invalid or empty message');
      }

      // Step 2: Simple validation - keeping it simple

      // Step 3: Simple topic classification
      const topic = this.getSimpleTopic(validatedMessage);
      
      // Step 5: Get or use provided user profile
      const profile = userProfile || await getUserProfile(sessionId) || undefined;
      
      // Step 6: Use provided conversation context or get from service
      const contextToUse = conversationContext || conversationHistoryService.getConversationContext(sessionId);
      
      // Step 7: Generate AI response using the working buildUserPrompt (keep it simple and working)
      const prompt = buildUserPrompt(
        validatedMessage, 
        topic, 
        language, 
        profile, 
        mode,
        {
          recentMessages: contextToUse.recentMessages,
          recentResponsePatterns: contextToUse.recentResponsePatterns,
          conversationLength: contextToUse.conversationLength,
          emotionalJourney: conversationHistoryService.getEmotionalJourneySummary(sessionId),
          providedConcepts: conversationHistoryService.getProvidedConcepts(sessionId)
        }
      );
      const llmResponse = await this.generateWithRetry(prompt, sessionId);
      // Trust the system prompt to handle variation - no need for validation
      const enhancedResponse = llmResponse.content;
      
      // Step 8: Determine LINE handoff recommendation
      const lineHandoffRecommendation = shouldRecommendLineHandoff(
        validatedMessage,
        topic,
        contextToUse.conversationLength
      );

      // Step 9: Response is already optimized by improved system prompt
      const sanitizedResponse = enhancedResponse;
      
      // Step 10: Process and format response
      const formattedResponse = this.formatResponse(
        sanitizedResponse,
        topic,
        language,
        validation.recommendLineHandoff || lineHandoffRecommendation.shouldRecommend,
        mode
      );

      // Step 11: Track concepts from response to prevent repetition
      conversationHistoryService.trackConceptsFromResponse(sessionId, formattedResponse);

      // Step 12: Store conversation history (only if not provided externally)
      if (!conversationContext) {
        // Add user message
        conversationHistoryService.addMessage(
          sessionId,
          createChatMessage(validatedMessage, 'user', topic)
        );
        
        // Add assistant response
        conversationHistoryService.addMessage(
          sessionId,
          createChatMessage(
            formattedResponse, 
            'assistant', 
            topic, 
            validation.recommendLineHandoff || processingResult.safetyResult.recommendLineHandoff || lineHandoffRecommendation.shouldRecommend
          )
        );
      }

      return {
        response: formattedResponse,
        topic: topic,
        showLineOption: validation.recommendLineHandoff || 
                       processingResult.safetyResult.recommendLineHandoff ||
                       lineHandoffRecommendation.shouldRecommend,
        safetyResult: processingResult.safetyResult,
        processingResult,
        lineHandoffReason: lineHandoffRecommendation.reason,
        lineHandoffUrgency: lineHandoffRecommendation.urgency,
        mode,
        usage: llmResponse.usage
      };

    } catch (error) {
      throw this.handleServiceError(error);
    }
  }

  /**
   * Processes a chat message and generates a streaming AI response
   * @param message - User's message
   * @param sessionId - Session identifier
   * @param language - Language preference (th/en)
   * @param mode - App mode (conversation or intelligence)
   * @returns AsyncGenerator<string> - Streaming response chunks
   */
  async* processMessageStream(
    message: string,
    sessionId: string,
    language: 'th' | 'en' = 'th',
    mode: AppMode = 'conversation',
    model?: 'pnr-g' | 'pnr-g2'
  ): AsyncGenerator<string> {
    try {
      // Step 1: Simple validation - no heavy processing
      const validatedMessage = validateUserInput(message);
      
      if (!validatedMessage || validatedMessage.trim().length === 0) {
        yield 'ขออภัยค่ะ กรุณาพิมพ์ข้อความค่ะ';
        return;
      }

      if (validatedMessage.length > 2000) {
        yield 'ขออภัยค่ะ ข้อความยาวเกินไป กรุณาพิมพ์สั้นลงค่ะ';
        return;
      }

      // Update model instruction if needed
      if (model && this.config.llmProvider && 'updateModelInstruction' in this.config.llmProvider) {
        // Check current model type before logging or switching
        const currentType = 'getCurrentModelType' in this.config.llmProvider 
          ? (this.config.llmProvider as any).getCurrentModelType()
          : 'unknown';
        
        if (currentType !== model) {
          console.log(`🎯 AIService: Switching from ${currentType.toUpperCase()} to ${model.toUpperCase()}`);
          (this.config.llmProvider as any).updateModelInstruction(model);
        }
        // Removed the "already using" log to reduce noise - only log actual switches
      } else if (model) {
        console.log(`⚠️ AIService: Model parameter ${model} provided but provider doesn't support updateModelInstruction`);
      }

      // Step 2: Simple topic classification
      const topic = this.getSimpleTopic(validatedMessage);
      const contextToUse = conversationHistoryService.getConversationContext(sessionId);
      
      const prompt = buildUserPrompt(
        validatedMessage, 
        topic, 
        language, 
        undefined, 
        mode,
        {
          recentMessages: contextToUse.recentMessages,
          recentResponsePatterns: contextToUse.recentResponsePatterns,
          conversationLength: contextToUse.conversationLength,
          emotionalJourney: conversationHistoryService.getEmotionalJourneySummary(sessionId),
          providedConcepts: conversationHistoryService.getProvidedConcepts(sessionId)
        }
      );

      // Step 4: Generate streaming response
      const provider = this.config.llmProvider as any; // Type assertion for streaming method
      if (provider.generateStreamingResponse) {
        let fullResponse = '';
        
        for await (const chunk of provider.generateStreamingResponse(prompt, { sessionId })) {
          fullResponse += chunk;
          
          // Break large chunks into smaller pieces for smoother streaming
          if (chunk.length > 8) {
            // Split chunk into smaller pieces for natural typing effect
            const pieces = this.splitIntoSmoothChunks(chunk);
            for (const piece of pieces) {
              yield piece;
              // Add small delay between pieces for natural typing effect
              await this.delay(25 + Math.random() * 15); // 25-40ms delay
            }
          } else {
            yield chunk;
            // Small delay for short chunks too
            await this.delay(15 + Math.random() * 10); // 15-25ms delay
          }
        }

        // Step 5: Track concepts and store conversation after streaming completes
        const formattedResponse = this.formatResponse(fullResponse, topic, language, false, mode);
        conversationHistoryService.trackConceptsFromResponse(sessionId, formattedResponse);
        
        // Store conversation history
        conversationHistoryService.addMessage(
          sessionId,
          createChatMessage(validatedMessage, 'user', topic)
        );
        
        conversationHistoryService.addMessage(
          sessionId,
          createChatMessage(formattedResponse, 'assistant', topic)
        );
      } else {
        // Fallback to non-streaming
        const response = await this.processMessage(message, sessionId, language, undefined, mode);
        yield response.response;
      }

    } catch (error) {
      console.error('Streaming error:', error);
      yield 'ขออภัยค่ะ เกิดข้อผิดพลาดในการตอบกลับ กรุณาลองใหม่อีกครั้งค่ะ';
    }
  }

  /**
   * Validates the LLM provider connection
   * @returns Promise<boolean> - True if connection is valid
   */
  async validateConnection(): Promise<boolean> {
    try {
      return await this.config.llmProvider.validateConnection();
    } catch (error) {
      console.error('AI Service connection validation failed:', error);
      return false;
    }
  }

  /**
   * Gets the current LLM provider name
   * @returns string - Provider identifier
   */
  getProviderName(): string {
    return this.config.llmProvider.getProviderName();
  }

  /**
   * Updates the LLM configuration
   * @param newConfig - New LLM configuration
   */
  updateLLMConfig(newConfig: Partial<LLMConfig>): void {
    this.config.defaultLLMConfig = {
      ...this.config.defaultLLMConfig,
      ...newConfig
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  // Removed validateAndRegenerateIfRepetitive - trusting system prompt to handle variation

  /**
   * Generates response with retry logic
   * @param prompt - The prompt to send to LLM
   * @returns Promise<LLMResponse> - LLM response
   */
  private async generateWithRetry(prompt: string, sessionId?: string): Promise<LLMResponse> {
    let lastError: LLMError | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.config.llmProvider.generateResponse(
          prompt, 
          this.config.defaultLLMConfig
        );
      } catch (error) {
        lastError = error as LLMError;
        
        // Don't retry non-retryable errors
        if (!lastError.retryable || attempt === this.config.maxRetries) {
          break;
        }

        // Wait before retrying
        await this.delay(this.config.retryDelayMs * Math.pow(2, attempt));
      }
    }

    throw lastError || this.createError('UNKNOWN_ERROR', 'Failed to generate response');
  }

  /**
   * Handles content that's not safe for AI processing
   * @param validation - Validation result
   * @param processingResult - Text processing result
   * @param language - Language preference
   * @returns AIServiceResponse - Response for unsafe content
   */
  private handleUnsafeContent(
    validation: SafetyCheckResult,
    processingResult: TextProcessingResult,
    language: 'th' | 'en'
  ): AIServiceResponse {
    let response: string;
    let lineHandoffReason: 'emergency' | 'complex_topic' | 'complex_language' | 'long_conversation' | 'none';
    let lineHandoffUrgency: 'high' | 'medium' | 'low';
    
    if (validation.emergencyDetected) {
      response = language === 'th' 
        ? '⚠️ นี่เป็นสถานการณ์ฉุกเฉิน กรุณาโทร 1669 หรือพาไปโรงพยาบาลทันที อย่าเสียเวลา'
        : '⚠️ This is an emergency. Call 1669 or go to hospital immediately. Don\'t delay.';
      lineHandoffReason = 'emergency';
      lineHandoffUrgency = 'high';
    } else {
      response = language === 'th'
        ? 'เรื่องนี้ซับซ้อนและต้องการคำแนะนำจากผู้เชี่ยวชาญ กรุณาติดต่อ LINE สำหรับการช่วยเหลือจากทีมงานของเรา'
        : 'This matter is complex and requires expert guidance. Please contact LINE for assistance from our team.';
      lineHandoffReason = 'complex_topic';
      lineHandoffUrgency = 'medium';
    }

    return {
      response,
      topic: processingResult.topic,
      showLineOption: true,
      safetyResult: processingResult.safetyResult,
      processingResult,
      lineHandoffReason,
      lineHandoffUrgency,
    };
  }

  /**
   * Formats the AI response with disclaimers and safety information
   * @param content - Raw AI response content
   * @param topic - Conversation topic
   * @param language - Language preference
   * @param recommendLineHandoff - Whether to recommend LINE handoff
   * @param mode - App mode (conversation or intelligence)
   * @returns Formatted response string
   */
  private formatResponse(
    content: string,
    topic: TopicCategory,
    language: 'th' | 'en',
    recommendLineHandoff: boolean,
    mode: AppMode = 'conversation'
  ): string {
    let formattedResponse = content.trim();

    // Apply Thai text formatting for better paragraph structure
    if (language === 'th') {
      formattedResponse = formatThaiTextResponse(formattedResponse);
    }

    // Add disclaimer if needed (different for intelligence mode)
    const disclaimer = getResponseDisclaimer(topic, language, mode);
    if (disclaimer) {
      formattedResponse += '\n\n' + disclaimer;
    }

    // LINE handoff message disabled - Pranara handles this naturally in conversation
    // if (recommendLineHandoff && (topic === 'emergency' || topic === 'medication')) {
    //   const lineMessage = language === 'th'
    //     ? '\n\nหากต้องการคำแนะนำเพิ่มเติม สามารถติดต่อทีมงานผ่าน LINE ได้เลยค่ะ'
    //     : '\n\nFor additional guidance, you can contact our team via LINE.';
    //   
    //   formattedResponse += lineMessage;
    // }

    // Add mode switching suggestion for conversation mode
    if (mode === 'conversation' && (topic === 'alzheimer' || topic === 'diabetes' || topic === 'medication')) {
      const modeSwitchMessage = language === 'th'
        ? '\n\n💡 สำหรับข้อมูลเชิงลึกและการวิเคราะห์แบบมืออาชีพ ลองเปลี่ยนไปใช้โหมด "Health Intelligence" ได้ค่ะ'
        : '\n\n💡 For in-depth information and professional analysis, try switching to "Health Intelligence" mode.';
      
      formattedResponse += modeSwitchMessage;
    }

    return formattedResponse;
  }

  /**
   * Handles service-level errors
   * @param error - Raw error
   * @returns LLMError - Standardized error
   */
  private handleServiceError(error: unknown): LLMError {
    if (error && typeof error === 'object' && 'code' in error) {
      return error as LLMError;
    }

    const message = error && typeof error === 'object' && 'message' in error 
      ? (error as Error).message 
      : 'Unknown service error';
    
    return this.createError('UNKNOWN_ERROR', message);
  }

  /**
   * Creates a standardized error
   * @param code - Error code
   * @param message - Error message
   * @returns LLMError
   */
  private createError(code: string, message: string): LLMError {
    const error = new Error(message) as LLMError;
    error.code = code;
    error.retryable = false;
    return error;
  }

  /**
   * Delays execution for specified milliseconds
   * @param ms - Milliseconds to delay
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Splits a large chunk into smaller pieces for smoother streaming
   * @param chunk - The text chunk to split
   * @returns Array of smaller text pieces
   */
  private splitIntoSmoothChunks(chunk: string): string[] {
    const pieces: string[] = [];
    let currentPos = 0;
    
    while (currentPos < chunk.length) {
      // Random chunk size between 3-8 characters for natural variation
      const chunkSize = Math.floor(Math.random() * 6) + 3;
      const piece = chunk.substring(currentPos, currentPos + chunkSize);
      pieces.push(piece);
      currentPos += chunkSize;
    }
    
    return pieces;
  }

  /**
   * Simple topic classification without heavy processing
   */
  private getSimpleTopic(message: string): TopicCategory {
    const lowerMessage = message.toLowerCase();
    
    // Basic keyword matching for common topics
    if (lowerMessage.includes('สวัสดี') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'general';
    }
    if (lowerMessage.includes('ขอบคุณ') || lowerMessage.includes('thank')) {
      return 'general';
    }
    if (lowerMessage.includes('ช่วย') || lowerMessage.includes('help')) {
      return 'health_general';
    }
    
    return 'general';
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a default AI service configuration
 * @param llmProvider - LLM provider instance
 * @returns AIServiceConfig - Default configuration
 */
export function createDefaultAIConfig(llmProvider: LLMProvider): AIServiceConfig {
  return {
    llmProvider,
    defaultLLMConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    },
    maxRetries: 3,
    retryDelayMs: 1000,
    enableSafetyChecks: true,
    // PII scrubbing removed
  };
}

/**
 * Creates an AI service instance with Gemini provider
 * @param geminiProvider - Gemini provider instance
 * @param customConfig - Optional custom configuration
 * @returns AIService instance
 */
export function createAIService(
  llmProvider: LLMProvider,
  customConfig?: Partial<AIServiceConfig>
): AIService {
  const defaultConfig = createDefaultAIConfig(llmProvider);
  const config = customConfig ? { ...defaultConfig, ...customConfig } : defaultConfig;
  
  return new AIService(config);
}