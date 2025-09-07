/**
 * Unit tests for Gemini Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from '../geminiProvider';
import { LLMConfig } from '../../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockConfig: LLMConfig;

  beforeEach(() => {
    provider = new GeminiProvider('test-api-key', 'gemini-1.5-flash');
    mockConfig = {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
      safetySettings: []
    };
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with API key', () => {
      expect(provider.getProviderName()).toBe('gemini');
    });

    it('should throw error without API key', () => {
      // Clear environment variable
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      expect(() => new GeminiProvider()).toThrow('Gemini API key is required');
      
      // Restore environment variable
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('should use environment variable for API key', () => {
      process.env.GEMINI_API_KEY = 'env-api-key';
      const envProvider = new GeminiProvider();
      expect(envProvider.getProviderName()).toBe('gemini');
    });
  });

  describe('generateResponse', () => {
    it('should generate successful response', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Test response from Gemini' }]
          },
          safetyRatings: [
            { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' }
          ],
          finishReason: 'STOP'
        }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await provider.generateResponse('Test prompt', mockConfig);

      expect(result.content).toBe('Test response from Gemini');
      expect(result.safetyRatings).toHaveLength(1);
      expect(result.finishReason).toBe('STOP');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      });
    });

    it('should handle API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({})
      });

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toMatchObject({
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid Gemini API key',
          status: 401,
          retryable: false
        });
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({})
      });

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toMatchObject({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Gemini API rate limit exceeded',
          status: 429,
          retryable: true
        });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toMatchObject({
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to Gemini API',
          retryable: true
        });
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        candidates: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toThrow('No candidates in Gemini response');
    });

    it('should handle response without content', async () => {
      const mockResponse = {
        candidates: [{
          safetyRatings: []
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toThrow('No content in Gemini response candidate');
    });
  });

  describe('validateConnection', () => {
    it('should return true for successful connection', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'OK' }]
          },
          safetyRatings: []
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const isValid = await provider.validateConnection();
      expect(isValid).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const isValid = await provider.validateConnection();
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle server errors as retryable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({})
      });

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toMatchObject({
          code: 'SERVER_ERROR',
          retryable: true,
          status: 500
        });
    });

    it('should handle bad request as non-retryable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({})
      });

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toMatchObject({
          code: 'INVALID_REQUEST',
          retryable: false,
          status: 400
        });
    });

    it('should handle Gemini-specific errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            error: {
              code: 400,
              message: 'Invalid request format',
              status: 'INVALID_ARGUMENT'
            }
          }
        })
      });

      await expect(provider.generateResponse('Test prompt', mockConfig))
        .rejects.toMatchObject({
          code: 'INVALID_ARGUMENT',
          message: 'Invalid request format'
        });
    });
  });

  describe('API request formatting', () => {
    it('should format request correctly', async () => {
      const mockResponse = {
        candidates: [{
          content: { parts: [{ text: 'Response' }] },
          safetyRatings: []
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await provider.generateResponse('Test prompt', mockConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-1.5-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"text":"Test prompt"')
        })
      );
    });

    it('should include safety settings in request', async () => {
      const configWithSafety = {
        ...mockConfig,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      };

      const mockResponse = {
        candidates: [{
          content: { parts: [{ text: 'Response' }] },
          safetyRatings: []
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await provider.generateResponse('Test prompt', configWithSafety);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.safetySettings).toEqual(configWithSafety.safetySettings);
    });
  });
});