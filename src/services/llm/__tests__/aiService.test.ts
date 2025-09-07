/**
 * Unit tests for AI Service
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService, createDefaultAIConfig, createAIService } from '../aiService';
import { LLMProvider, LLMResponse } from '../../../types';

// Mock the utility modules
vi.mock('../../../utils/textSanitization', () => ({
  processTextForAnalytics: vi.fn(() => ({
    originalText: 'test message',
    piiResult: { isClean: true, foundPatterns: [], scrubbedText: 'test message' },
    safeSnippet: 'test message',
    analyticsText: 'test message',
    safetyResult: {
      isSafe: true,
      flaggedCategories: [],
      recommendLineHandoff: false,
      emergencyDetected: false,
    },
    topic: 'general',
    responseTemplate: 'standard',
    isReadyForLogging: true,
    requiresHumanReview: false,
    processingTimestamp: new Date(),
  })),
  validateTextForAIProcessing: vi.fn(() => ({
    isValid: true,
    shouldProcess: true,
    recommendLineHandoff: false,
    emergencyDetected: false,
  })),
}));

vi.mock('../../../utils/contentSafety', () => ({
  classifyTopic: vi.fn(() => 'general'),
  performSafetyCheck: vi.fn(() => ({
    isSafe: true,
    flaggedCategories: [],
    recommendLineHandoff: false,
    emergencyDetected: false,
  })),
}));

vi.mock('../systemPrompts', () => ({
  buildUserPrompt: vi.fn(() => 'System prompt with user message'),
  getResponseDisclaimer: vi.fn(() => ''),
  validateUserInput: vi.fn((input) => input?.trim() || null),
}));

describe('AIService', () => {
  let mockLLMProvider: LLMProvider;
  let aiService: AIService;

  beforeEach(() => {
    mockLLMProvider = {
      generateResponse: vi.fn(),
      validateConnection: vi.fn(),
      getProviderName: vi.fn(() => 'mock-provider'),
    };

    const config = createDefaultAIConfig(mockLLMProvider);
    aiService = new AIService(config);

    vi.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should process valid message successfully', async () => {
      const mockLLMResponse: LLMResponse = {
        content: 'AI response to user message',
        safetyRatings: [],
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
        },
      };

      (mockLLMProvider.generateResponse as any).mockResolvedValue(mockLLMResponse);

      const result = await aiService.processMessage('แม่ไม่สบาย', 'session-123', 'th');

      expect(result.response).toBe('AI response to user message');
      expect(result.topic).toBe('general');
      expect(result.showLineOption).toBe(false);
      expect(result.usage).toEqual(mockLLMResponse.usage);
    });

    it('should handle emergency content appropriately', async () => {
      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: false,
        recommendLineHandoff: true,
        emergencyDetected: true,
        validationMessage: 'Emergency content detected',
      });

      const result = await aiService.processMessage('แม่หมดสติ', 'session-123', 'th');

      expect(result.response).toContain('⚠️');
      expect(result.response).toContain('1669');
      expect(result.showLineOption).toBe(true);
      expect(mockLLMProvider.generateResponse).not.toHaveBeenCalled();
    });

    it('should handle complex content with LINE handoff', async () => {
      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: false,
        recommendLineHandoff: true,
        emergencyDetected: false,
        validationMessage: 'Complex content - requires expert guidance',
      });

      const result = await aiService.processMessage('ปัญหาครอบครัว', 'session-123', 'th');

      expect(result.response).toContain('ซับซ้อน');
      expect(result.response).toContain('LINE');
      expect(result.showLineOption).toBe(true);
    });

    it('should handle invalid input', async () => {
      await expect(aiService.processMessage('', 'session-123', 'th'))
        .rejects.toMatchObject({
          code: 'INVALID_INPUT',
          message: 'Invalid or empty message',
        });
    });

    it('should handle LLM provider errors', async () => {
      // Ensure validation allows processing
      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: true,
        recommendLineHandoff: false,
        emergencyDetected: false,
      });

      (mockLLMProvider.generateResponse as any).mockRejectedValue({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        retryable: true,
      });

      await expect(aiService.processMessage('test message', 'session-123', 'th'))
        .rejects.toMatchObject({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
        });
    }, 10000);

    it('should retry on retryable errors', async () => {
      // Ensure validation allows processing
      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: true,
        recommendLineHandoff: false,
        emergencyDetected: false,
      });

      (mockLLMProvider.generateResponse as any)
        .mockRejectedValueOnce({
          code: 'SERVER_ERROR',
          message: 'Server error',
          retryable: true,
        })
        .mockResolvedValueOnce({
          content: 'Success after retry',
          safetyRatings: [],
        });

      const result = await aiService.processMessage('test message', 'session-123', 'th');

      expect(result.response).toBe('Success after retry');
      expect(mockLLMProvider.generateResponse).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      // Ensure validation allows processing
      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: true,
        recommendLineHandoff: false,
        emergencyDetected: false,
      });

      (mockLLMProvider.generateResponse as any).mockRejectedValue({
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid API key',
        retryable: false,
      });

      await expect(aiService.processMessage('test message', 'session-123', 'th'))
        .rejects.toMatchObject({
          code: 'AUTHENTICATION_ERROR',
        });

      expect(mockLLMProvider.generateResponse).toHaveBeenCalledTimes(1);
    });

    it('should handle English language preference', async () => {
      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: false,
        recommendLineHandoff: true,
        emergencyDetected: true,
      });

      const result = await aiService.processMessage('emergency', 'session-123', 'en');

      expect(result.response).toContain('emergency');
      expect(result.response).toContain('1669');
    });

    it('should add LINE handoff suggestion for complex topics', async () => {
      const mockLLMResponse: LLMResponse = {
        content: 'Medical advice response',
        safetyRatings: [],
      };

      (mockLLMProvider.generateResponse as any).mockResolvedValue(mockLLMResponse);

      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: true,
        recommendLineHandoff: true,
        emergencyDetected: false,
      });

      const { getResponseDisclaimer } = await import('../systemPrompts');
      (getResponseDisclaimer as any).mockReturnValue('Medical disclaimer');

      const result = await aiService.processMessage('medical question', 'session-123', 'th');

      expect(result.response).toContain('Medical advice response');
      expect(result.response).toContain('Medical disclaimer');
      expect(result.response).toContain('LINE');
    });
  });

  describe('validateConnection', () => {
    it('should return true for valid connection', async () => {
      (mockLLMProvider.validateConnection as any).mockResolvedValue(true);

      const isValid = await aiService.validateConnection();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid connection', async () => {
      (mockLLMProvider.validateConnection as any).mockRejectedValue(new Error('Connection failed'));

      const isValid = await aiService.validateConnection();
      expect(isValid).toBe(false);
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const name = aiService.getProviderName();
      expect(name).toBe('mock-provider');
    });
  });

  describe('updateLLMConfig', () => {
    it('should update LLM configuration', () => {
      aiService.updateLLMConfig({ temperature: 0.5 });

      // Verify config is updated by checking if it's used in next call
      const mockLLMResponse: LLMResponse = {
        content: 'Response',
        safetyRatings: [],
      };

      (mockLLMProvider.generateResponse as any).mockResolvedValue(mockLLMResponse);

      aiService.processMessage('test', 'session-123', 'th');

      expect(mockLLMProvider.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ temperature: 0.5 })
      );
    });
  });

  describe('retry logic', () => {
    it('should implement exponential backoff', async () => {
      const startTime = Date.now();
      
      (mockLLMProvider.generateResponse as any)
        .mockRejectedValueOnce({ code: 'SERVER_ERROR', retryable: true })
        .mockRejectedValueOnce({ code: 'SERVER_ERROR', retryable: true })
        .mockResolvedValueOnce({ content: 'Success', safetyRatings: [] });

      await aiService.processMessage('test message', 'session-123', 'th');

      const duration = Date.now() - startTime;
      // Should have some delay due to exponential backoff
      expect(duration).toBeGreaterThan(1000); // At least 1 second for retries
    });

    it('should stop retrying after max attempts', async () => {
      // Ensure validation allows processing
      const { validateTextForAIProcessing } = await import('../../../utils/textSanitization');
      (validateTextForAIProcessing as any).mockReturnValue({
        isValid: true,
        shouldProcess: true,
        recommendLineHandoff: false,
        emergencyDetected: false,
      });

      (mockLLMProvider.generateResponse as any).mockRejectedValue({
        code: 'SERVER_ERROR',
        message: 'Persistent server error',
        retryable: true,
      });

      await expect(aiService.processMessage('test message', 'session-123', 'th'))
        .rejects.toMatchObject({
          code: 'SERVER_ERROR',
        });

      // Should try initial + 3 retries = 4 total attempts
      expect(mockLLMProvider.generateResponse).toHaveBeenCalledTimes(4);
    }, 10000); // Increase timeout for retry test
  });

  describe('factory functions', () => {
    it('should create default AI config', () => {
      const config = createDefaultAIConfig(mockLLMProvider);

      expect(config.llmProvider).toBe(mockLLMProvider);
      expect(config.defaultLLMConfig.temperature).toBe(0.7);
      expect(config.maxRetries).toBe(3);
      expect(config.enableSafetyChecks).toBe(true);
      expect(config.enablePIIScrubbing).toBe(true);
    });

    it('should create AI service with factory function', () => {
      const service = createAIService(mockLLMProvider);
      expect(service).toBeInstanceOf(AIService);
      expect(service.getProviderName()).toBe('mock-provider');
    });

    it('should create AI service with custom config', () => {
      const customConfig = {
        maxRetries: 5,
        retryDelayMs: 2000,
      };

      const service = createAIService(mockLLMProvider, customConfig);
      expect(service).toBeInstanceOf(AIService);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle unknown errors gracefully', async () => {
      (mockLLMProvider.generateResponse as any).mockRejectedValue(
        new Error('Unknown error')
      );

      await expect(aiService.processMessage('test message', 'session-123', 'th'))
        .rejects.toMatchObject({
          code: 'UNKNOWN_ERROR',
        });
    });

    it('should handle errors without code property', async () => {
      (mockLLMProvider.generateResponse as any).mockRejectedValue({
        message: 'Error without code',
      });

      await expect(aiService.processMessage('test message', 'session-123', 'th'))
        .rejects.toMatchObject({
          code: 'UNKNOWN_ERROR',
          message: 'Error without code',
        });
    });
  });
});