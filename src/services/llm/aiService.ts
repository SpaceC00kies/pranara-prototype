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
  SafetyCheckResult
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
} from './systemPrompts';
import { 
  shouldRecommendLineHandoff
} from '../lineService';

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
   * @returns Promise<AIServiceResponse> - Complete response with metadata
   */
  async processMessage(
    message: string,
    sessionId: string,
    language: 'th' | 'en' = 'th',
    conversationLength: number = 1
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
      
      // Step 5: Determine LINE handoff recommendation
      const lineHandoffRecommendation = shouldRecommendLineHandoff(
        validatedMessage,
        topic,
        conversationLength
      );
      
      // Use standard prompt - Jirung info is already in system prompt
      const prompt = buildUserPrompt(validatedMessage, topic, language);

      // Step 6: Generate AI response
      const llmResponse = await this.generateWithRetry(prompt);

      // Step 7: Process and format response
      const formattedResponse = this.formatResponse(
        llmResponse.content,
        topic,
        language,
        validation.recommendLineHandoff || lineHandoffRecommendation.shouldRecommend
      );

      return {
        response: formattedResponse,
        topic,
        showLineOption: validation.recommendLineHandoff || 
                       processingResult.safetyResult.recommendLineHandoff ||
                       lineHandoffRecommendation.shouldRecommend,
        safetyResult: processingResult.safetyResult,
        processingResult,
        lineHandoffReason: lineHandoffRecommendation.reason,
        lineHandoffUrgency: lineHandoffRecommendation.urgency,
        usage: llmResponse.usage,
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
   * Generates response with retry logic
   * @param prompt - The prompt to send to LLM
   * @returns Promise<LLMResponse> - LLM response
   */
  private async generateWithRetry(prompt: string): Promise<LLMResponse> {
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
   * @returns Formatted response string
   */
  private formatResponse(
    content: string,
    topic: TopicCategory,
    language: 'th' | 'en',
    recommendLineHandoff: boolean
  ): string {
    let formattedResponse = content.trim();

    // Apply Thai text formatting for better paragraph structure
    if (language === 'th') {
      formattedResponse = formatThaiTextResponse(formattedResponse);
    }

    // Add disclaimer if needed
    const disclaimer = getResponseDisclaimer(topic, language);
    if (disclaimer) {
      formattedResponse += '\n\n' + disclaimer;
    }

    // Add LINE handoff suggestion for complex topics
    if (recommendLineHandoff && topic !== 'emergency') {
      const lineMessage = language === 'th'
        ? '\n\nหากต้องการคำแนะนำเพิ่มเติม สามารถติดต่อทีมงานผ่าน LINE ได้เลยค่ะ'
        : '\n\nFor additional guidance, you can contact our team via LINE.';
      
      formattedResponse += lineMessage;
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
          category: 'HARM_CATEGORY_MEDICAL',
          threshold: 'BLOCK_NONE' // Allow medical content but with disclaimers
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