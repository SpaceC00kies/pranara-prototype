/**
 * Unit tests for PII Scrubbing utilities
 */

import { describe, it, expect } from 'vitest';
import {
  scrubPII,
  createSafeSnippet,
  isTextSafeForLogging,
  sanitizeForAnalytics,
  detectPIIPatterns,
  PII_PATTERNS,
  REPLACEMENT_TOKENS,
} from '../piiScrubber';

describe('PII Scrubbing Utilities', () => {
  describe('scrubPII', () => {
    it('should handle empty or invalid input', () => {
      expect(scrubPII('')).toEqual({
        scrubbedText: '',
        foundPatterns: [],
        isClean: true,
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(scrubPII(null as any)).toEqual({
        scrubbedText: '',
        foundPatterns: [],
        isClean: true,
      });
    });

    it('should detect and mask email addresses', () => {
      const text = 'ติดต่อฉันที่ john.doe@example.com นะครับ';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toBe('ติดต่อฉันที่ [EMAIL] นะครับ');
      expect(result.foundPatterns).toContain('email');
      expect(result.isClean).toBe(false);
    });

    it('should detect and mask Thai phone numbers', () => {
      const text = 'โทรหาฉันที่ 0812345678 นะ';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toBe('โทรหาฉันที่ [PHONE] นะ');
      expect(result.foundPatterns).toContain('thaiPhone');
      expect(result.isClean).toBe(false);
    });

    it('should detect and mask Thai ID numbers', () => {
      const text = 'เลขบัตรประชาชน 1234567890123';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toBe('เลขบัตรประชาชน [ID]');
      expect(result.foundPatterns).toContain('thaiId');
      expect(result.isClean).toBe(false);
    });

    it('should detect and mask URLs', () => {
      const text = 'ดูที่ https://example.com/page สิ';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toBe('ดูที่ [URL] สิ');
      expect(result.foundPatterns).toContain('url');
      expect(result.isClean).toBe(false);
    });

    it('should detect and mask LINE IDs', () => {
      const text = 'เพิ่มฉันใน LINE @john_doe123';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toBe('เพิ่มฉันใน LINE [LINE_ID]');
      expect(result.foundPatterns).toContain('lineId');
      expect(result.isClean).toBe(false);
    });

    it('should detect and mask Thai names with titles', () => {
      const text = 'คุณสมชาย มาเยี่ยมแม่ครับ';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toBe('[NAME] มาเยี่ยมแม่ครับ');
      expect(result.foundPatterns).toContain('thai_name_0');
      expect(result.isClean).toBe(false);
    });

    it('should detect and mask Thai addresses', () => {
      const text = 'บ้าน 123/45 หมู่ 6 ซอยลาดพร้าว';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toContain('[ADDRESS]');
      expect(result.foundPatterns.some(p => p.startsWith('thai_address'))).toBe(true);
      expect(result.isClean).toBe(false);
    });

    it('should handle multiple PII patterns in one text', () => {
      const text = 'คุณสมชาย โทร 0812345678 อีเมล john@example.com';
      const result = scrubPII(text);
      
      expect(result.foundPatterns.length).toBeGreaterThan(1);
      expect(result.isClean).toBe(false);
      expect(result.scrubbedText).toContain('[NAME]');
      expect(result.scrubbedText).toContain('[PHONE]');
      expect(result.scrubbedText).toContain('[EMAIL]');
    });

    it('should return clean result for text without PII', () => {
      const text = 'แม่ไม่สบาย ปวดหัวมาก ต้องทำอย่างไร';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toBe(text);
      expect(result.foundPatterns).toEqual([]);
      expect(result.isClean).toBe(true);
    });
  });

  describe('createSafeSnippet', () => {
    it('should handle empty input', () => {
      expect(createSafeSnippet('')).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(createSafeSnippet(null as any)).toBe('');
    });

    it('should scrub PII and truncate long text', () => {
      const longText = 'คุณสมชาย โทร 0812345678 ' + 'ข'.repeat(200);
      const result = createSafeSnippet(longText, 50);
      
      expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(result).toContain('[NAME]');
      expect(result).toContain('[PHONE]');
      expect(result).toContain('...');
    });

    it('should preserve short text without truncation', () => {
      const shortText = 'แม่ไม่สบาย';
      const result = createSafeSnippet(shortText);
      
      expect(result).toBe(shortText);
    });

    it('should truncate at word boundary when possible', () => {
      const text = 'แม่ไม่สบาย ปวดหัวมาก ต้องทำอย่างไร ช่วยแนะนำหน่อย';
      const result = createSafeSnippet(text, 30);
      
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(33); // 30 + "..."
    });
  });

  describe('isTextSafeForLogging', () => {
    it('should return true for clean text', () => {
      const cleanText = 'แม่ไม่สบาย ปวดหัวมาก';
      expect(isTextSafeForLogging(cleanText)).toBe(true);
    });

    it('should return false for text with PII', () => {
      const piiText = 'โทรหาฉันที่ 0812345678';
      expect(isTextSafeForLogging(piiText)).toBe(false);
    });
  });

  describe('sanitizeForAnalytics', () => {
    it('should handle empty input', () => {
      expect(sanitizeForAnalytics('')).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeForAnalytics(null as any)).toBe('');
    });

    it('should scrub PII and personal references', () => {
      const text = 'ฉันโทรหาแม่ที่ 0812345678 แต่ไม่รับ';
      const result = sanitizeForAnalytics(text);
      
      expect(result).toContain('[PERSON]');
      expect(result).toContain('[FAMILY]');
      expect(result).toContain('[PHONE]');
    });

    it('should mask Thai personal pronouns', () => {
      const text = 'ฉันดูแลแม่ ผมเหนื่อยมาก';
      const result = sanitizeForAnalytics(text);
      
      expect(result).toBe('[PERSON]ดูแล[FAMILY] [PERSON]เหนื่อยมาก');
    });

    it('should mask English personal pronouns', () => {
      const text = 'I take care of my mother';
      const result = sanitizeForAnalytics(text);
      
      expect(result).toBe('[PERSON] take care of [PERSON] [FAMILY]');
    });

    it('should mask family relationship terms', () => {
      const text = 'พ่อกับแม่ไม่สบาย ลูกเครียดมาก';
      const result = sanitizeForAnalytics(text);
      
      expect(result).toBe('[FAMILY]กับ[FAMILY]ไม่สบาย [FAMILY]เครียดมาก');
    });

    it('should mask specific ages', () => {
      const text = 'แม่อายุ 75 ปี ป่วยมาก';
      const result = sanitizeForAnalytics(text);
      
      expect(result).toBe('[FAMILY][AGE] ป่วยมาก');
    });
  });

  describe('detectPIIPatterns', () => {
    it('should return empty array for clean text', () => {
      const cleanText = 'แม่ไม่สบาย ปวดหัวมาก';
      expect(detectPIIPatterns(cleanText)).toEqual([]);
    });

    it('should detect multiple PII pattern types', () => {
      const text = 'คุณสมชาย โทร 0812345678 อีเมล john@example.com';
      const patterns = detectPIIPatterns(text);
      
      expect(patterns).toContain('thaiPhone');
      expect(patterns).toContain('email');
      expect(patterns.some(p => p.startsWith('thai_name'))).toBe(true);
    });

    it('should handle empty input', () => {
      expect(detectPIIPatterns('')).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(detectPIIPatterns(null as any)).toEqual([]);
    });
  });

  describe('PII_PATTERNS', () => {
    it('should have all required pattern types', () => {
      const requiredPatterns = ['email', 'phone', 'thaiPhone', 'url', 'thaiId', 'lineId'];
      
      requiredPatterns.forEach(pattern => {
        expect(PII_PATTERNS).toHaveProperty(pattern);
        expect(PII_PATTERNS[pattern as keyof typeof PII_PATTERNS]).toBeInstanceOf(RegExp);
      });
    });

    it('should have corresponding replacement tokens', () => {
      Object.keys(PII_PATTERNS).forEach(pattern => {
        expect(REPLACEMENT_TOKENS).toHaveProperty(pattern);
        expect(typeof REPLACEMENT_TOKENS[pattern as keyof typeof REPLACEMENT_TOKENS]).toBe('string');
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle text with only whitespace', () => {
      const result = scrubPII('   \n\t   ');
      expect(result.scrubbedText).toBe('');
      expect(result.isClean).toBe(true);
    });

    it('should handle text with special characters', () => {
      const text = 'แม่ไม่สบาย!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const result = scrubPII(text);
      expect(result.isClean).toBe(true);
    });

    it('should handle mixed Thai and English text', () => {
      const text = 'My แม่ is sick, call 0812345678';
      const result = scrubPII(text);
      
      expect(result.scrubbedText).toContain('[PHONE]');
      expect(result.foundPatterns).toContain('thaiPhone');
    });

    it('should handle very long text efficiently', () => {
      const longText = 'แม่ไม่สบาย '.repeat(1000) + '0812345678';
      const result = scrubPII(longText);
      
      expect(result.foundPatterns).toContain('thaiPhone');
      expect(result.scrubbedText).toContain('[PHONE]');
    });
  });
});