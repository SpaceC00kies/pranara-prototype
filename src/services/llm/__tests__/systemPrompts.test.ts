/**
 * Unit tests for System Prompts
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildUserPrompt,
  getResponseDisclaimer,
  validateUserInput,
  BASE_SYSTEM_PROMPT,
  TOPIC_PROMPTS,
  SAFETY_DISCLAIMERS,
} from '../systemPrompts';

describe('System Prompts', () => {
  describe('buildSystemPrompt', () => {
    it('should build basic system prompt in Thai', () => {
      const prompt = buildSystemPrompt('general', 'th', false);
      expect(prompt).toContain('คุณคือ "จิรัง"');
      expect(prompt).toContain('ผู้ช่วยดูแลผู้สูงอายุ');
    });

    it('should build basic system prompt in English', () => {
      const prompt = buildSystemPrompt('general', 'en', false);
      expect(prompt).toContain('You are "Jirung"');
      expect(prompt).toContain('elderly care assistant');
    });

    it('should include topic-specific context', () => {
      const prompt = buildSystemPrompt('alzheimer', 'th', false);
      expect(prompt).toContain('อัลไซเมอร์');
      expect(prompt).toContain('ภาวะสมองเสื่อม');
    });

    it('should include safety disclaimers when requested', () => {
      const prompt = buildSystemPrompt('medication', 'th', true);
      expect(prompt).toContain('อย่าเปลี่ยนแปลงยา');
    });

    it('should include emergency disclaimer for emergency topics', () => {
      const prompt = buildSystemPrompt('emergency', 'th', true);
      expect(prompt).toContain('⚠️ สถานการณ์ฉุกเฉิน');
      expect(prompt).toContain('1669');
    });

    it('should handle unknown topics gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prompt = buildSystemPrompt('unknown' as any, 'th', false);
      expect(prompt).toContain('คุณคือ "จิรัง"');
    });
  });

  describe('buildUserPrompt', () => {
    it('should combine system and user prompts in Thai', () => {
      const prompt = buildUserPrompt('แม่ไม่สบาย', 'general', 'th');
      expect(prompt).toContain('คุณคือ "จิรัง"');
      expect(prompt).toContain('ผู้ดูแลถาม: แม่ไม่สบาย');
    });

    it('should combine system and user prompts in English', () => {
      const prompt = buildUserPrompt('Mother is sick', 'general', 'en');
      expect(prompt).toContain('You are "Jirung"');
      expect(prompt).toContain('Caregiver asks: Mother is sick');
    });

    it('should include topic-specific context in user prompt', () => {
      const prompt = buildUserPrompt('ลืมของ', 'alzheimer', 'th');
      expect(prompt).toContain('อัลไซเมอร์');
      expect(prompt).toContain('ผู้ดูแลถาม: ลืมของ');
    });
  });

  describe('getResponseDisclaimer', () => {
    it('should return emergency disclaimer for emergency topics', () => {
      const disclaimer = getResponseDisclaimer('emergency', 'th');
      expect(disclaimer).toContain('⚠️ สถานการณ์ฉุกเฉิน');
      expect(disclaimer).toContain('1669');
    });

    it('should return medication disclaimer for medication topics', () => {
      const disclaimer = getResponseDisclaimer('medication', 'th');
      expect(disclaimer).toContain('อย่าเปลี่ยนแปลงยา');
    });

    it('should return medical disclaimer for medical topics', () => {
      const disclaimer = getResponseDisclaimer('alzheimer', 'th');
      expect(disclaimer).toContain('ไม่ใช่การวินิจฉัยทางการแพทย์');
    });

    it('should return empty string for general topics', () => {
      const disclaimer = getResponseDisclaimer('general', 'th');
      expect(disclaimer).toBe('');
    });

    it('should work in English', () => {
      const disclaimer = getResponseDisclaimer('emergency', 'en');
      expect(disclaimer).toContain('Emergency');
      expect(disclaimer).toContain('1669');
    });
  });

  describe('validateUserInput', () => {
    it('should accept valid input', () => {
      const result = validateUserInput('แม่ไม่สบาย');
      expect(result).toBe('แม่ไม่สบาย');
    });

    it('should trim whitespace', () => {
      const result = validateUserInput('  แม่ไม่สบาย  ');
      expect(result).toBe('แม่ไม่สบาย');
    });

    it('should reject empty input', () => {
      expect(validateUserInput('')).toBeNull();
      expect(validateUserInput('   ')).toBeNull();
    });

    it('should reject null/undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateUserInput(null as any)).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateUserInput(undefined as any)).toBeNull();
    });

    it('should reject non-string input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateUserInput(123 as any)).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateUserInput({} as any)).toBeNull();
    });

    it('should reject too short input', () => {
      expect(validateUserInput('a')).toBeNull();
    });

    it('should truncate too long input', () => {
      const longInput = 'a'.repeat(1500);
      const result = validateUserInput(longInput);
      expect(result).toHaveLength(1000);
    });

    it('should accept minimum valid length', () => {
      const result = validateUserInput('ab');
      expect(result).toBe('ab');
    });

    it('should accept maximum valid length', () => {
      const input = 'a'.repeat(1000);
      const result = validateUserInput(input);
      expect(result).toBe(input);
    });
  });

  describe('prompt constants', () => {
    it('should have base system prompts in both languages', () => {
      expect(BASE_SYSTEM_PROMPT.th).toContain('จิรัง');
      expect(BASE_SYSTEM_PROMPT.en).toContain('Jirung');
    });

    it('should have topic prompts for all categories', () => {
      const expectedTopics = [
        'alzheimer', 'fall', 'sleep', 'diet', 'night_care',
        'post_op', 'diabetes', 'mood', 'medication', 'emergency', 'general'
      ];

      expectedTopics.forEach(topic => {
        expect(TOPIC_PROMPTS[topic as keyof typeof TOPIC_PROMPTS]).toBeDefined();
        expect(TOPIC_PROMPTS[topic as keyof typeof TOPIC_PROMPTS].th).toBeTruthy();
        expect(TOPIC_PROMPTS[topic as keyof typeof TOPIC_PROMPTS].en).toBeTruthy();
      });
    });

    it('should have safety disclaimers in both languages', () => {
      expect(SAFETY_DISCLAIMERS.medical.th).toContain('การวินิจฉัยทางการแพทย์');
      expect(SAFETY_DISCLAIMERS.medical.en).toContain('medical diagnosis');
      
      expect(SAFETY_DISCLAIMERS.emergency.th).toContain('1669');
      expect(SAFETY_DISCLAIMERS.emergency.en).toContain('1669');
      
      expect(SAFETY_DISCLAIMERS.medication.th).toContain('ยา');
      expect(SAFETY_DISCLAIMERS.medication.en).toContain('medication');
    });
  });

  describe('edge cases', () => {
    it('should handle mixed language input gracefully', () => {
      const prompt = buildUserPrompt('แม่ has pain', 'general', 'th');
      expect(prompt).toContain('แม่ has pain');
    });

    it('should handle special characters in user input', () => {
      const prompt = buildUserPrompt('แม่ไม่สบาย!@#$%', 'general', 'th');
      expect(prompt).toContain('แม่ไม่สบาย!@#$%');
    });

    it('should handle very long topic-specific prompts', () => {
      const prompt = buildSystemPrompt('alzheimer', 'th', true);
      expect(prompt.length).toBeGreaterThan(BASE_SYSTEM_PROMPT.th.length);
    });

    it('should maintain prompt structure with all components', () => {
      const prompt = buildSystemPrompt('medication', 'th', true);
      
      // Should contain base prompt
      expect(prompt).toContain('จิรัง');
      
      // Should contain topic-specific content
      expect(prompt).toContain('ยา');
      
      // Should contain safety disclaimer
      expect(prompt).toContain('อย่าเปลี่ยนแปลงยา');
    });
  });
});