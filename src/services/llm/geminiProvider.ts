/**
 * Gemini AI Provider Implementation
 * 
 * This module implements the LLM provider interface for Google's Gemini API,
 * providing Thai language support and healthcare-specific safety configurations.
 */

import { GoogleGenAI } from '@google/genai';
import { LLMProvider, LLMConfig, LLMResponse, LLMError, SafetySetting, TopicCategory } from '../../types';
import { retryApiCall, geminiCircuitBreaker } from '../retryService';
import { getFallbackResponse, shouldUseEmergencyFallback, FallbackService } from '../fallbackService';

export interface GeminiConfig {
  model?: string;
  apiKey?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  safetySettings?: SafetySetting[];
}

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;
  private model: string;
  private fallbackService: FallbackService;
  private consecutiveFailures: number = 0;
  private lastFailureTime: number = 0;

  constructor(config: GeminiConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
    }

    this.client = new GoogleGenAI({ apiKey });
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.fallbackService = FallbackService.getInstance();
  }

  /**
   * Generates a response using Gemini API with retry logic and fallback
   * @param prompt - The input prompt for the AI
   * @param config - LLM configuration settings
   * @returns Promise<LLMResponse> - Standardized response format
   */
  async generateResponse(prompt: string, config?: LLMConfig): Promise<LLMResponse> {
    const defaultConfig: LLMConfig = {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
      safetySettings: []
    };
    
    const finalConfig = config || defaultConfig;

    try {
      // Use circuit breaker to prevent cascade failures
      const response = await geminiCircuitBreaker.execute(async () => {
        return await retryApiCall(
          async () => {
            const response = await this.client.models.generateContent({
              model: this.model,
              contents: prompt,
              config: {
                temperature: finalConfig.temperature,
                topP: finalConfig.topP,
                topK: finalConfig.topK,
                maxOutputTokens: finalConfig.maxOutputTokens,
              }
            });

            if (!response.text) {
              throw this.createLLMError('EMPTY_RESPONSE', 'No response text generated', true);
            }

            return response;
          },
          'gemini-generate-content',
          {
            maxAttempts: 3,
            baseDelay: 1000,
            backoffMultiplier: 2,
            retryCondition: (error: unknown) => {
              const llmError = error as LLMError;
              return llmError.retryable;
            },
            onRetry: (attempt, error) => {
              console.warn(`Gemini API retry attempt ${attempt}:`, error);
              this.consecutiveFailures++;
            }
          }
        );
      });

      // Reset failure count on success
      this.consecutiveFailures = 0;

      return {
        content: response.text || '',
        safetyRatings: [], // Gemini safety ratings would be populated here
        finishReason: 'stop',
        usage: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        } : undefined,
      };
    } catch (error) {
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();
      
      const llmError = this.handleGeminiError(error);
      
      // If we've had too many failures, throw the error to trigger fallback
      if (this.consecutiveFailures >= 3) {
        llmError.code = 'GEMINI_UNAVAILABLE';
        llmError.message = 'Gemini service is temporarily unavailable';
      }
      
      throw llmError;
    }
  }

  /**
   * Generate response with automatic fallback
   * @param prompt - The input prompt
   * @param topic - Topic category for fallback
   * @param language - Language for fallback
   * @param config - LLM configuration
   * @returns Promise<LLMResponse> - Response or fallback
   */
  async generateResponseWithFallback(
    prompt: string,
    topic: string = 'general',
    language: 'th' | 'en' = 'th',
    config?: LLMConfig
  ): Promise<LLMResponse> {
    try {
      return await this.generateResponse(prompt, config);
    } catch (error) {
      console.warn('Gemini API failed, using fallback response:', error);
      
      // Check if this is an emergency situation
      if (shouldUseEmergencyFallback(prompt)) {
        const emergencyResponse = getFallbackResponse('emergency', language);
        return {
          content: emergencyResponse,
          safetyRatings: [],
          finishReason: 'fallback',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      }

      // Use contextual fallback
      const fallbackResponse = this.fallbackService.getContextualFallback(
        topic as TopicCategory,
        language,
        1, // conversation length - would be tracked in real implementation
        []  // previous topics - would be tracked in real implementation
      );

      return {
        content: fallbackResponse,
        safetyRatings: [],
        finishReason: 'fallback',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
  }

  /**
   * Validates connection to Gemini API with timeout
   * @returns Promise<boolean> - True if connection is successful
   */
  async validateConnection(): Promise<boolean> {
    try {
      const testConfig: LLMConfig = {
        temperature: 0.1,
        topP: 0.8,
        topK: 10,
        maxOutputTokens: 10,
        safetySettings: [],
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection validation timeout')), 5000);
      });

      await Promise.race([
        this.generateResponse('Test connection', testConfig),
        timeoutPromise
      ]);
      
      return true;
    } catch (error) {
      console.error('Gemini connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get service health status
   * @returns Object with health information
   */
  getHealthStatus(): {
    isHealthy: boolean;
    consecutiveFailures: number;
    lastFailureTime: number;
    circuitBreakerState: string;
  } {
    return {
      isHealthy: this.consecutiveFailures < 3,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      circuitBreakerState: geminiCircuitBreaker.getState()
    };
  }

  /**
   * Reset failure tracking
   */
  resetFailureTracking(): void {
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
    geminiCircuitBreaker.reset();
  }

  /**
   * Returns the provider name
   * @returns string - Provider identifier
   */
  getProviderName(): string {
    return 'gemini';
  }

  /**
   * Creates a standardized LLM error
   * @param code - Error code
   * @param message - Error message
   * @param retryable - Whether the error is retryable
   * @returns LLMError
   */
  private createLLMError(code: string, message: string, retryable: boolean): LLMError {
    const error = new Error(message) as LLMError;
    error.code = code;
    error.retryable = retryable;
    return error;
  }

  /**
   * Handles and standardizes Gemini API errors
   * @param error - Raw error from API call
   * @returns LLMError - Standardized error format
   */
  private handleGeminiError(error: unknown): LLMError {
    // Type guard for Error objects
    const isError = error && typeof error === 'object' && 'message' in error;
    const errorMessage = isError ? (error as Error).message : '';
    const errorName = isError && 'name' in error ? (error as Error).name : '';

    // Handle timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return this.createLLMError('NETWORK_ERROR', 'Request timeout', true);
    }

    // Handle network errors
    if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
      return this.createLLMError('NETWORK_ERROR', 'Failed to connect to Gemini API', true);
    }

    // Handle connection errors
    if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ENOTFOUND')) {
      return this.createLLMError('NETWORK_ERROR', 'Connection error', true);
    }

    // Handle API errors from the new SDK
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return this.createLLMError('AUTHENTICATION_ERROR', 'Invalid Gemini API key', false);
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return this.createLLMError('RATE_LIMIT_EXCEEDED', 'Gemini API rate limit exceeded', true);
    }

    if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
      return this.createLLMError('SAFETY_VIOLATION', 'Content blocked by safety filters', false);
    }

    // Handle server errors
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return this.createLLMError('GEMINI_UNAVAILABLE', 'Gemini service temporarily unavailable', true);
    }

    // Handle circuit breaker errors
    if (errorMessage.includes('Circuit breaker is OPEN')) {
      return this.createLLMError('GEMINI_UNAVAILABLE', 'Service temporarily unavailable due to repeated failures', true);
    }

    // Handle validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return this.createLLMError('INVALID_INPUT', 'Invalid request format', false);
    }

    // Handle unknown errors - make them retryable if we're not sure
    const isRetryable = !errorMessage.includes('permission') && !errorMessage.includes('forbidden');
    return this.createLLMError('UNKNOWN_ERROR', errorMessage || 'Unknown error occurred', isRetryable);
  }
}

/**
 * Factory function to create Gemini provider instance
 * @param config - Optional configuration
 * @returns GeminiProvider instance
 */
export function createGeminiProvider(config: GeminiConfig = {}): GeminiProvider {
  return new GeminiProvider(config);
}