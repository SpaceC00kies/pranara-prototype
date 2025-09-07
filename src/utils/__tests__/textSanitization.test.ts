/**
 * Unit tests for Text Sanitization utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  processTextForAnalytics,
  createAnalyticsLogEntry,
  validateTextForAIProcessing,
  batchProcessTextsForAnalytics,
  getProcessingStatistics,
} from '../textSanitization';
import type { TextProcessingResult } from '../textSanitization';

describe('Text Sanitization Utilities', () => {
  describe('processTextForAnalytics', () => {
    it('should handle empty or invalid input', () => {
      const result = processTextForAnalytics('');
      
      expect(result.originalText).toBe('');
      expect(result.piiResult.isClean).toBe(true);
      expect(result.safeSnippet).toBe('');
      expect(result.analyticsText).toBe('');
      expect(result.safetyResult.isSafe).toBe(true);
      expect(result.topic).toBe('general');
      expect(result.responseTemplate).toBe('standard');
      expect(result.isReadyForLogging).toBe(false);
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should process clean text correctly', () => {
      const text = 'แม่นอนไม่หลับ ต้องทำอย่างไร';
      const result = processTextForAnalytics(text);
      
      expect(result.originalText).toBe(text);
      expect(result.piiResult.isClean).toBe(true);
      expect(result.safeSnippet).toBe(text);
      expect(result.safetyResult.isSafe).toBe(true);
      expect(result.topic).toBe('sleep');
      expect(result.responseTemplate).toBe('standard');
      expect(result.isReadyForLogging).toBe(true);
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should process text with PII', () => {
      const text = 'คุณสมชาย โทร 0812345678 แม่ไม่สบาย';
      const result = processTextForAnalytics(text);
      
      expect(result.originalText).toBe(text);
      expect(result.piiResult.isClean).toBe(false);
      expect(result.safeSnippet).toContain('[NAME]');
      expect(result.safeSnippet).toContain('[PHONE]');
      expect(result.analyticsText).toContain('[NAME]');
      expect(result.analyticsText).toContain('[PHONE]');
      expect(result.isReadyForLogging).toBe(false); // PII detected
      expect(result.requiresHumanReview).toBe(true); // Multiple PII patterns
    });

    it('should process emergency content', () => {
      const text = 'แม่หมดสติ ต้องทำอย่างไร';
      const result = processTextForAnalytics(text);
      
      expect(result.originalText).toBe(text);
      expect(result.safetyResult.emergencyDetected).toBe(true);
      expect(result.safetyResult.isSafe).toBe(false);
      expect(result.topic).toBe('emergency');
      expect(result.responseTemplate).toBe('emergency');
      expect(result.isReadyForLogging).toBe(false); // Emergency not safe
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should process medical content', () => {
      const text = 'แม่ปวดหัวมาก กินยาแล้ว';
      const result = processTextForAnalytics(text);
      
      expect(result.safetyResult.flaggedCategories).toContain('medical');
      expect(result.safetyResult.isSafe).toBe(true); // Medical is safe but flagged
      expect(result.responseTemplate).toBe('medical');
      expect(result.isReadyForLogging).toBe(true);
    });

    it('should process complex content requiring handoff', () => {
      const text = 'ปัญหาครอบครัว เรื่องมรดก';
      const result = processTextForAnalytics(text);
      
      expect(result.safetyResult.recommendLineHandoff).toBe(true);
      expect(result.safetyResult.flaggedCategories).toContain('complex');
      expect(result.responseTemplate).toBe('complex');
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should respect custom snippet length', () => {
      const longText = 'แม่ไม่สบาย '.repeat(20);
      const result = processTextForAnalytics(longText, 50);
      
      expect(result.safeSnippet.length).toBeLessThanOrEqual(53); // 50 + "..."
    });

    it('should have consistent timestamp', () => {
      const result = processTextForAnalytics('test text');
      expect(result.processingTimestamp).toBeInstanceOf(Date);
    });
  });

  describe('createAnalyticsLogEntry', () => {
    let sampleProcessedText: TextProcessingResult;

    beforeEach(() => {
      sampleProcessedText = processTextForAnalytics('แม่นอนไม่หลับ');
    });

    it('should create proper analytics log entry', () => {
      const sessionId = 'test-session-123';
      const entry = createAnalyticsLogEntry(sampleProcessedText, sessionId, 'th');
      
      expect(entry.session_id).toBe(sessionId);
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.text_snippet).toBe('แม่นอนไม่หลับ');
      expect(entry.topic).toBe('sleep');
      expect(entry.language).toBe('th');
      expect(entry.line_clicked).toBe(false);
      expect(entry.routed).toBe('primary');
      expect(entry.safety_flags).toBe('');
      expect(entry.pii_detected).toBe(false);
      expect(entry.emergency_detected).toBe(false);
    });

    it('should handle text requiring human review', () => {
      const emergencyText = processTextForAnalytics('แม่หมดสติ');
      const entry = createAnalyticsLogEntry(emergencyText, 'session-123');
      
      expect(entry.routed).toBe('human_review');
      expect(entry.emergency_detected).toBe(true);
      expect(entry.safety_flags).toContain('emergency');
    });

    it('should handle PII detection', () => {
      const piiText = processTextForAnalytics('โทร 0812345678');
      const entry = createAnalyticsLogEntry(piiText, 'session-123');
      
      expect(entry.pii_detected).toBe(true);
    });

    it('should default to Thai language', () => {
      const entry = createAnalyticsLogEntry(sampleProcessedText, 'session-123');
      expect(entry.language).toBe('th');
    });
  });

  describe('validateTextForAIProcessing', () => {
    it('should reject empty input', () => {
      const result = validateTextForAIProcessing('');
      
      expect(result.isValid).toBe(false);
      expect(result.shouldProcess).toBe(false);
      expect(result.recommendLineHandoff).toBe(false);
      expect(result.emergencyDetected).toBe(false);
      expect(result.validationMessage).toContain('Empty or invalid');
    });

    it('should reject emergency content for AI processing', () => {
      const result = validateTextForAIProcessing('แม่หมดสติ');
      
      expect(result.isValid).toBe(true);
      expect(result.shouldProcess).toBe(false);
      expect(result.recommendLineHandoff).toBe(true);
      expect(result.emergencyDetected).toBe(true);
      expect(result.validationMessage).toContain('Emergency content');
    });

    it('should allow complex content with handoff recommendation', () => {
      const result = validateTextForAIProcessing('ปัญหาครอบครัว');
      
      expect(result.isValid).toBe(true);
      expect(result.shouldProcess).toBe(true);
      expect(result.recommendLineHandoff).toBe(true);
      expect(result.emergencyDetected).toBe(false);
      expect(result.validationMessage).toContain('Complex content');
    });

    it('should allow standard content', () => {
      const result = validateTextForAIProcessing('แม่นอนไม่หลับ');
      
      expect(result.isValid).toBe(true);
      expect(result.shouldProcess).toBe(true);
      expect(result.recommendLineHandoff).toBe(false);
      expect(result.emergencyDetected).toBe(false);
      expect(result.validationMessage).toBeUndefined();
    });

    it('should handle null and undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateTextForAIProcessing(null as any).isValid).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateTextForAIProcessing(undefined as any).isValid).toBe(false);
    });
  });

  describe('batchProcessTextsForAnalytics', () => {
    it('should process multiple texts', () => {
      const texts = [
        'แม่นอนไม่หลับ',
        'ปวดหัวมาก',
        'หมดสติ',
        '', // Should be filtered out
        'นั่งดูทีวี'
      ];
      
      const results = batchProcessTextsForAnalytics(texts, 'session-123', 'th');
      
      expect(results).toHaveLength(4); // Empty string filtered out
      expect(results[0].text_snippet).toBe('แม่นอนไม่หลับ');
      expect(results[0].topic).toBe('sleep');
      expect(results[1].topic).toBe('general'); // ปวดหัวมาก should be general or medical
      expect(results[2].emergency_detected).toBe(true);
    });

    it('should handle empty array', () => {
      const results = batchProcessTextsForAnalytics([], 'session-123');
      expect(results).toEqual([]);
    });

    it('should filter out empty and whitespace-only texts', () => {
      const texts = ['', '   ', '\n\t', 'valid text'];
      const results = batchProcessTextsForAnalytics(texts, 'session-123');
      
      expect(results).toHaveLength(1);
      expect(results[0].text_snippet).toBe('valid text');
    });

    it('should use consistent session ID and language', () => {
      const texts = ['text1', 'text2'];
      const results = batchProcessTextsForAnalytics(texts, 'session-456', 'en');
      
      results.forEach(result => {
        expect(result.session_id).toBe('session-456');
        expect(result.language).toBe('en');
      });
    });
  });

  describe('getProcessingStatistics', () => {
    it('should handle empty array', () => {
      const stats = getProcessingStatistics([]);
      
      expect(stats.total).toBe(0);
      expect(stats.piiDetected).toBe(0);
      expect(stats.emergencyDetected).toBe(0);
      expect(stats.humanReviewRequired).toBe(0);
      expect(stats.readyForLogging).toBe(0);
      expect(stats.topTopics).toEqual([]);
      expect(stats.piiDetectionRate).toBe(0);
      expect(stats.emergencyRate).toBe(0);
      expect(stats.humanReviewRate).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const processedTexts = [
        processTextForAnalytics('แม่นอนไม่หลับ'), // Clean
        processTextForAnalytics('โทร 0812345678'), // PII
        processTextForAnalytics('แม่หมดสติ'), // Emergency
        processTextForAnalytics('ปัญหาครอบครัว'), // Complex
        processTextForAnalytics('นั่งดูทีวี'), // Clean
      ];
      
      const stats = getProcessingStatistics(processedTexts);
      
      expect(stats.total).toBe(5);
      expect(stats.piiDetected).toBe(1);
      expect(stats.emergencyDetected).toBe(1);
      expect(stats.humanReviewRequired).toBeGreaterThan(0);
      expect(stats.piiDetectionRate).toBe(20); // 1/5 * 100
      expect(stats.emergencyRate).toBe(20); // 1/5 * 100
    });

    it('should count topics correctly', () => {
      const processedTexts = [
        processTextForAnalytics('แม่นอนไม่หลับ'), // sleep
        processTextForAnalytics('แม่นอนไม่หลับอีก'), // sleep
        processTextForAnalytics('ปวดหัว'), // general or medical
        processTextForAnalytics('หมดสติ'), // emergency
      ];
      
      const stats = getProcessingStatistics(processedTexts);
      
      expect(stats.topTopics).toHaveLength(3); // Should have 3 different topics
      expect(stats.topTopics[0].count).toBe(2); // sleep should be most common
      expect(stats.topTopics[0].topic).toBe('sleep');
      expect(stats.topTopics[0].percentage).toBe(50); // 2/4 * 100
    });

    it('should limit top topics to 5', () => {
      const topics = ['sleep', 'diet', 'fall', 'mood', 'medication', 'general', 'emergency'];
      const processedTexts = topics.map(topic => 
        processTextForAnalytics(`test ${topic}`)
      );
      
      const stats = getProcessingStatistics(processedTexts);
      expect(stats.topTopics.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Integration and edge cases', () => {
    it('should handle mixed language content', () => {
      const text = 'แม่ has severe pain กินยาแล้ว';
      const result = processTextForAnalytics(text);
      
      expect(result.safetyResult.flaggedCategories).toContain('medical');
      expect(result.analyticsText).toContain('[FAMILY]');
    });

    it('should handle very long text', () => {
      const longText = 'แม่ไม่สบาย '.repeat(100) + 'หมดสติ';
      const result = processTextForAnalytics(longText, 100);
      
      expect(result.safetyResult.emergencyDetected).toBe(true);
      expect(result.safeSnippet.length).toBeLessThanOrEqual(103); // 100 + "..."
    });

    it('should handle text with only PII', () => {
      const text = '0812345678 john@example.com';
      const result = processTextForAnalytics(text);
      
      expect(result.piiResult.isClean).toBe(false);
      expect(result.safeSnippet).toBe('[PHONE] [EMAIL]');
      expect(result.isReadyForLogging).toBe(false);
    });

    it('should handle text with multiple safety flags', () => {
      const text = 'คุณสมชาย โทร 0812345678 แม่หมดสติ ปัญหาครอบครัว';
      const result = processTextForAnalytics(text);
      
      expect(result.piiResult.isClean).toBe(false);
      expect(result.safetyResult.emergencyDetected).toBe(true);
      expect(result.safetyResult.flaggedCategories.length).toBeGreaterThan(1);
      expect(result.requiresHumanReview).toBe(true);
      expect(result.isReadyForLogging).toBe(false);
    });

    it('should maintain performance with large batch processing', () => {
      const texts = Array(100).fill('แม่นอนไม่หลับ');
      const start = Date.now();
      const results = batchProcessTextsForAnalytics(texts, 'session-123');
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});