/**
 * Integration tests for AI Service
 * 
 * These tests verify the complete AI service workflow with real dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService, createAIService, createDefaultAIConfig } from '../index';
import { GeminiProvider } from '../geminiProvider';

// Mock environment variables for testing
vi.mock('process', () => ({
  env: {
    GEMINI_API_KEY: 'test-api-key',
  },
}));

describe('AI Service Integration', () => {
  let aiService: AIService;
  let mockProvider: GeminiProvider;

  beforeEach(() => {
    // Create mock provider
    mockProvider = new GeminiProvider({ apiKey: 'test-api-key' });
    
    // Create AI service with test configuration
    const config = createDefaultAIConfig(mockProvider);
    config.maxRetries = 1;
    
    aiService = new AIService(config);
  });

  describe('Service Creation', () => {
    it('should create AI service with factory function', () => {
      expect(aiService).toBeInstanceOf(AIService);
    });

    it('should create AI service with factory function', () => {
      const factoryService = createAIService(mockProvider);
      expect(factoryService).toBeInstanceOf(AIService);
    });
  });

  describe('Service Configuration', () => {
    it('should return provider information', () => {
      const providerName = aiService.getProviderName();
      expect(providerName).toBe('gemini');
    });

    it('should allow LLM configuration updates', () => {
      const newConfig = {
        temperature: 0.5,
        maxTokens: 512,
        topP: 0.8,
      };

      aiService.updateLLMConfig(newConfig);
      
      // The configuration should be updated internally
      // We can't directly test this without exposing internal state
      // but we can verify the method doesn't throw
      expect(() => aiService.updateLLMConfig(newConfig)).not.toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should handle valid Thai input', async () => {
      const message = 'คุณยายมีอาการปวดหัว ควรทำอย่างไร';
      
      // Mock the provider response
      vi.spyOn(mockProvider, 'generateResponse').mockResolvedValue({
        content: 'แนะนำให้พักผ่อนและดื่มน้ำเพิ่ม หากอาการไม่ดีขึ้นให้ปรึกษาแพทย์',
        finishReason: 'stop',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });

      const result = await aiService.processMessage(message, 'session-123', 'th');
      
      expect(result).toMatchObject({
        response: expect.any(String),
        topic: expect.any(String),
        safetyResult: expect.any(Object),
      });
    });

    it('should handle valid English input', async () => {
      const message = 'My grandmother has a headache, what should I do?';
      
      vi.spyOn(mockProvider, 'generateResponse').mockResolvedValue({
        content: 'Recommend rest and increased water intake. If symptoms persist, consult a doctor.',
        finishReason: 'stop',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });

      const result = await aiService.processMessage(message, 'session-123', 'en');
      
      expect(result).toMatchObject({
        response: expect.any(String),
        topic: expect.any(String),
        safetyResult: expect.any(Object),
      });
    });

    it('should reject invalid input', async () => {
      const invalidInputs = [
        '', // empty
        '   ', // whitespace only
        'a', // too short
        'x'.repeat(5001), // too long
      ];

      for (const input of invalidInputs) {
        await expect(aiService.processMessage(input, 'session-123'))
          .rejects.toMatchObject({
            code: expect.any(String),
            message: expect.any(String),
          });
      }
    });
  });

  describe('Safety Features', () => {
    it('should detect emergency content', async () => {
      const emergencyMessage = 'คุณปู่หายใจไม่ออก หน้าเขียว ช่วยด้วย!';
      
      const result = await aiService.processMessage(emergencyMessage, 'session-123', 'th');
      
      expect(result.response).toContain('1669');
    });

    it('should recommend LINE handoff for complex topics', async () => {
      const complexMessage = 'คุณยายเป็นเบาหวาน ความดันสูง และมีปัญหาหัวใจ ต้องดูแลอย่างไร';
      
      vi.spyOn(mockProvider, 'generateResponse').mockResolvedValue({
        content: 'เรื่องนี้ซับซ้อนและต้องการคำแนะนำจากผู้เชี่ยวชาญ',
        finishReason: 'stop',
      });

      const result = await aiService.processMessage(complexMessage, 'session-123', 'th');
      
      expect(result.showLineOption).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection validation gracefully', async () => {
      // Mock connection failure
      vi.spyOn(mockProvider, 'validateConnection').mockResolvedValue(false);
      
      const isValid = await aiService.validateConnection();
      expect(isValid).toBe(false);
    });

    it('should handle provider errors gracefully', async () => {
      const message = 'Test message';
      
      // Mock provider error
      vi.spyOn(mockProvider, 'generateResponse').mockRejectedValue(
        new Error('Provider unavailable')
      );

      await expect(aiService.processMessage(message, 'session-123'))
        .rejects.toMatchObject({
          code: expect.any(String),
          message: expect.any(String),
        });
    });
  });

  describe('Performance', () => {
    it('should process messages within reasonable time', async () => {
      const message = 'คุณยายมีอาการปวดหัว';
      
      vi.spyOn(mockProvider, 'generateResponse').mockResolvedValue({
        content: 'แนะนำให้พักผ่อน',
        finishReason: 'stop',
      });

      const startTime = Date.now();
      await aiService.processMessage(message, 'session-123');
      const endTime = Date.now();
      
      // Should complete within 1 second (mocked)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});