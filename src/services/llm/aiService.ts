/**
 * AI Service for Jirung Senior Advisor
 * 
 * This service orchestrates AI interactions, combining LLM providers,
 * content safety, PII scrubbing, and response processing.
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

import { 
  processTextForAnalytics, 
  validateTextForAIProcessing,
  TextProcessingResult 
} from '../../utils/textSanitization';

import { classifyTopic } from '../../utils/contentSafety';

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

// ============================================================================
// AI SERVICE CONFIGURATION
// ============================================================================

export interface AIServiceConfig {
  llmProvider: LLMProvider;
  defaultLLMConfig: LLMConfig;
  maxRetries: number;
  retryDelayMs: number;
  enableSafetyChecks: boolean;
  enablePIIScrubbing: boolean;
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

      // Step 2: Process text for safety and PII
      const processingResult = processTextForAnalytics(validatedMessage);
      
      // Step 3: Validate if content is appropriate for AI processing
      const validation = validateTextForAIProcessing(validatedMessage);
      
      if (!validation.shouldProcess) {
        const safetyResult: SafetyCheckResult = {
          isSafe: validation.isValid,
          flaggedCategories: validation.emergencyDetected ? ['emergency'] : [],
          recommendLineHandoff: validation.recommendLineHandoff,
          emergencyDetected: validation.emergencyDetected
        };
        return this.handleUnsafeContent(safetyResult, processingResult, language);
      }

      // Step 4: Classify topic (Jirung context now handled in system prompt)
      const topic = classifyTopic(validatedMessage);
      
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
          conversationLength: contextToUse.conversationLength
        }
      );
      const llmResponse = await this.generateWithRetry(prompt, sessionId);
      const validatedResponse = await this.validateAndRegenerateIfRepetitive(
        llmResponse.content,
        sessionId,
        prompt
      );
      const enhancedResponse = validatedResponse;
      
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

      // Step 11: Store conversation history (only if not provided externally)
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

  /**
   * Simplified validation - let the improved system prompt handle repetition avoidance
   */
  private async validateAndRegenerateIfRepetitive(
    response: string,
    sessionId: string,
    prompt: string,
    attemptCount: number = 0
  ): Promise<string> {
    // The improved system prompt with explicit anti-repetition instructions
    // should handle variation naturally. Only regenerate for truly identical responses.
    const isIdentical = conversationHistoryService.isRepetitiveResponse(sessionId, response);
    
    if (isIdentical && attemptCount < 1) { // Reduced from 3 attempts to 1
      console.log(`🔄 Response was identical, regenerating once`);
      
      // Simple regeneration with slightly higher temperature
      const newResponse = await this.generateWithRetry(prompt, sessionId);
      return newResponse.content;
    }

    return response;
  }

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
          { ...this.config.defaultLLMConfig, sessionId }
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
    enablePIIScrubbing: true,
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