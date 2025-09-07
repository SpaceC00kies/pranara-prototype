/**
 * Unit tests for Content Safety utilities
 */

import { describe, it, expect } from 'vitest';
import {
  checkMedicalContent,
  checkEmergencyKeywords,
  suggestLineHandoff,
  performSafetyCheck,
  classifyTopic,
  isContentAppropriateForAI,
  getResponseTemplate,
  MEDICAL_KEYWORDS,
  EMERGENCY_KEYWORDS,
  COMPLEX_TOPIC_KEYWORDS,
} from '../contentSafety';

describe('Content Safety Utilities', () => {
  describe('checkMedicalContent', () => {
    it('should handle empty or invalid input', () => {
      expect(checkMedicalContent('')).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(checkMedicalContent(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(checkMedicalContent(undefined as any)).toBe(false);
    });

    it('should detect Thai medical keywords', () => {
      expect(checkMedicalContent('แม่กินยาแล้ว')).toBe(true);
      expect(checkMedicalContent('ปวดหัวมาก')).toBe(true);
      expect(checkMedicalContent('ไข้สูง')).toBe(true);
      expect(checkMedicalContent('โรคเบาหวาน')).toBe(true);
    });

    it('should detect English medical keywords', () => {
      expect(checkMedicalContent('taking medicine')).toBe(true);
      expect(checkMedicalContent('severe pain')).toBe(true);
      expect(checkMedicalContent('high fever')).toBe(true);
      expect(checkMedicalContent('diabetes condition')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(checkMedicalContent('MEDICINE')).toBe(true);
      expect(checkMedicalContent('Medicine')).toBe(true);
      expect(checkMedicalContent('ยา')).toBe(true);
    });

    it('should not detect medical content in normal text', () => {
      expect(checkMedicalContent('แม่นั่งดูทีวี')).toBe(false);
      expect(checkMedicalContent('eating dinner')).toBe(false);
      expect(checkMedicalContent('watching TV together')).toBe(false);
    });

    it('should handle mixed language text', () => {
      expect(checkMedicalContent('แม่ taking medicine')).toBe(true);
      expect(checkMedicalContent('mother กินยา')).toBe(true);
    });
  });

  describe('checkEmergencyKeywords', () => {
    it('should handle empty or invalid input', () => {
      expect(checkEmergencyKeywords('')).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(checkEmergencyKeywords(null as any)).toBe(false);
    });

    it('should detect Thai emergency keywords', () => {
      expect(checkEmergencyKeywords('แม่หมดสติ')).toBe(true);
      expect(checkEmergencyKeywords('หายใจไม่ออก')).toBe(true);
      expect(checkEmergencyKeywords('เจ็บหน้าอก')).toBe(true);
      expect(checkEmergencyKeywords('ชักกระตุก')).toBe(true);
      expect(checkEmergencyKeywords('เลือดออกมาก')).toBe(true);
    });

    it('should detect English emergency keywords', () => {
      expect(checkEmergencyKeywords('unconscious')).toBe(true);
      expect(checkEmergencyKeywords('not breathing')).toBe(true);
      expect(checkEmergencyKeywords('chest pain')).toBe(true);
      expect(checkEmergencyKeywords('severe bleeding')).toBe(true);
    });

    it('should detect emergency service references', () => {
      expect(checkEmergencyKeywords('โทร 1669')).toBe(true);
      expect(checkEmergencyKeywords('call ambulance')).toBe(true);
      expect(checkEmergencyKeywords('ต้องไปโรงพยาบาล')).toBe(true);
    });

    it('should not detect emergency in normal medical text', () => {
      expect(checkEmergencyKeywords('ปวดหัวเล็กน้อย')).toBe(false);
      expect(checkEmergencyKeywords('mild headache')).toBe(false);
      expect(checkEmergencyKeywords('กินยาแล้ว')).toBe(false);
    });
  });

  describe('suggestLineHandoff', () => {
    it('should handle empty input', () => {
      expect(suggestLineHandoff('')).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(suggestLineHandoff(null as any)).toBe(false);
    });

    it('should suggest handoff for emergency situations', () => {
      expect(suggestLineHandoff('แม่หมดสติ')).toBe(true);
      expect(suggestLineHandoff('unconscious')).toBe(true);
    });

    it('should suggest handoff for complex topics', () => {
      expect(suggestLineHandoff('เรื่องมรดก')).toBe(true);
      expect(suggestLineHandoff('ปัญหาครอบครัว')).toBe(true);
      expect(suggestLineHandoff('inheritance issues')).toBe(true);
      expect(suggestLineHandoff('family conflict')).toBe(true);
    });

    it('should suggest handoff for multiple medical keywords', () => {
      const complexMedical = 'แม่กินยาความดันแล้ว แต่ยังปวดหัว ไข้สูง ต้องผ่าตัดไหม';
      expect(suggestLineHandoff(complexMedical)).toBe(true);
    });

    it('should not suggest handoff for simple questions', () => {
      expect(suggestLineHandoff('แม่นอนไม่หลับ')).toBe(false);
      expect(suggestLineHandoff('mother can\'t sleep')).toBe(false);
    });

    it('should suggest handoff for end-of-life topics', () => {
      expect(suggestLineHandoff('แม่ใกล้ตาย')).toBe(true);
      expect(suggestLineHandoff('end of life care')).toBe(true);
    });
  });

  describe('performSafetyCheck', () => {
    it('should handle empty input', () => {
      const result = performSafetyCheck('');
      expect(result).toEqual({
        isSafe: true,
        flaggedCategories: [],
        recommendLineHandoff: false,
        emergencyDetected: false,
      });
    });

    it('should flag emergency content', () => {
      const result = performSafetyCheck('แม่หมดสติ');
      expect(result.isSafe).toBe(false);
      expect(result.emergencyDetected).toBe(true);
      expect(result.flaggedCategories).toContain('emergency');
      expect(result.recommendLineHandoff).toBe(true);
    });

    it('should flag medical content as safe but noted', () => {
      const result = performSafetyCheck('แม่ปวดหัว');
      expect(result.isSafe).toBe(true);
      expect(result.emergencyDetected).toBe(false);
      expect(result.flaggedCategories).toContain('medical');
    });

    it('should flag complex content', () => {
      const result = performSafetyCheck('ปัญหาครอบครัว');
      expect(result.isSafe).toBe(true);
      expect(result.flaggedCategories).toContain('complex');
      expect(result.recommendLineHandoff).toBe(true);
    });

    it('should handle multiple flags', () => {
      const result = performSafetyCheck('แม่หมดสติ กินยาแล้ว ปัญหาครอบครัว');
      expect(result.flaggedCategories.length).toBeGreaterThan(1);
      expect(result.flaggedCategories).toContain('emergency');
      expect(result.flaggedCategories).toContain('medical');
      expect(result.flaggedCategories).toContain('complex');
    });
  });

  describe('classifyTopic', () => {
    it('should handle empty input', () => {
      expect(classifyTopic('')).toBe('general');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(classifyTopic(null as any)).toBe('general');
    });

    it('should classify emergency topics', () => {
      expect(classifyTopic('แม่หมดสติ')).toBe('emergency');
      expect(classifyTopic('unconscious')).toBe('emergency');
    });

    it('should classify specific health topics', () => {
      expect(classifyTopic('แม่นอนไม่หลับ')).toBe('sleep');
      expect(classifyTopic('can\'t sleep')).toBe('sleep');
      
      expect(classifyTopic('แม่ล้ม')).toBe('fall');
      expect(classifyTopic('mother fell')).toBe('fall');
      
      expect(classifyTopic('อาหารแม่')).toBe('diet');
      expect(classifyTopic('mother\'s food')).toBe('diet');
      
      expect(classifyTopic('ลืมของ')).toBe('alzheimer');
      expect(classifyTopic('memory problems')).toBe('alzheimer');
    });

    it('should prioritize emergency over other topics', () => {
      expect(classifyTopic('แม่หมดสติ นอนไม่หลับ')).toBe('emergency');
    });

    it('should return general for unmatched content', () => {
      expect(classifyTopic('สวัสดีครับ')).toBe('general');
      expect(classifyTopic('hello there')).toBe('general');
    });

    it('should handle mixed language input', () => {
      expect(classifyTopic('แม่ sleep problems')).toBe('sleep');
      expect(classifyTopic('mother นอนไม่หลับ')).toBe('sleep');
    });
  });

  describe('isContentAppropriateForAI', () => {
    it('should return false for emergency content', () => {
      expect(isContentAppropriateForAI('แม่หมดสติ')).toBe(false);
      expect(isContentAppropriateForAI('unconscious')).toBe(false);
    });

    it('should return true for medical content with disclaimers', () => {
      expect(isContentAppropriateForAI('แม่ปวดหัว')).toBe(true);
      expect(isContentAppropriateForAI('headache')).toBe(true);
    });

    it('should return true for complex content with handoff suggestion', () => {
      expect(isContentAppropriateForAI('ปัญหาครอบครัว')).toBe(true);
      expect(isContentAppropriateForAI('family issues')).toBe(true);
    });

    it('should return true for general content', () => {
      expect(isContentAppropriateForAI('แม่นั่งดูทีวี')).toBe(true);
      expect(isContentAppropriateForAI('watching TV')).toBe(true);
    });
  });

  describe('getResponseTemplate', () => {
    it('should return emergency template for emergency content', () => {
      expect(getResponseTemplate('แม่หมดสติ')).toBe('emergency');
      expect(getResponseTemplate('unconscious')).toBe('emergency');
    });

    it('should return medical template for medical content', () => {
      expect(getResponseTemplate('แม่ปวดหัว')).toBe('medical');
      expect(getResponseTemplate('headache')).toBe('medical');
    });

    it('should return complex template for complex topics', () => {
      expect(getResponseTemplate('ปัญหาครอบครัว')).toBe('complex');
      expect(getResponseTemplate('family conflict')).toBe('complex');
    });

    it('should return standard template for general content', () => {
      expect(getResponseTemplate('แม่นั่งดูทีวี')).toBe('standard');
      expect(getResponseTemplate('watching TV')).toBe('standard');
    });

    it('should prioritize emergency over other templates', () => {
      expect(getResponseTemplate('แม่หมดสติ ปวดหัว')).toBe('emergency');
    });
  });

  describe('Keyword arrays', () => {
    it('should have Thai and English medical keywords', () => {
      expect(MEDICAL_KEYWORDS.th).toBeInstanceOf(Array);
      expect(MEDICAL_KEYWORDS.en).toBeInstanceOf(Array);
      expect(MEDICAL_KEYWORDS.th.length).toBeGreaterThan(0);
      expect(MEDICAL_KEYWORDS.en.length).toBeGreaterThan(0);
    });

    it('should have Thai and English emergency keywords', () => {
      expect(EMERGENCY_KEYWORDS.th).toBeInstanceOf(Array);
      expect(EMERGENCY_KEYWORDS.en).toBeInstanceOf(Array);
      expect(EMERGENCY_KEYWORDS.th.length).toBeGreaterThan(0);
      expect(EMERGENCY_KEYWORDS.en.length).toBeGreaterThan(0);
    });

    it('should have Thai and English complex topic keywords', () => {
      expect(COMPLEX_TOPIC_KEYWORDS.th).toBeInstanceOf(Array);
      expect(COMPLEX_TOPIC_KEYWORDS.en).toBeInstanceOf(Array);
      expect(COMPLEX_TOPIC_KEYWORDS.th.length).toBeGreaterThan(0);
      expect(COMPLEX_TOPIC_KEYWORDS.en.length).toBeGreaterThan(0);
    });

    it('should contain expected medical keywords', () => {
      expect(MEDICAL_KEYWORDS.th).toContain('ยา');
      expect(MEDICAL_KEYWORDS.th).toContain('ปวด');
      expect(MEDICAL_KEYWORDS.en).toContain('medicine');
      expect(MEDICAL_KEYWORDS.en).toContain('pain');
    });

    it('should contain expected emergency keywords', () => {
      expect(EMERGENCY_KEYWORDS.th).toContain('หมดสติ');
      expect(EMERGENCY_KEYWORDS.th).toContain('1669');
      expect(EMERGENCY_KEYWORDS.en).toContain('unconscious');
      expect(EMERGENCY_KEYWORDS.en).toContain('ambulance');
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle very long text efficiently', () => {
      const longText = 'แม่ไม่สบาย '.repeat(1000) + 'หมดสติ';
      const start = Date.now();
      const result = checkEmergencyKeywords(longText);
      const duration = Date.now() - start;
      
      expect(result).toBe(true);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle text with special characters', () => {
      const specialText = 'แม่!@#$%^&*()ปวดหัว';
      expect(checkMedicalContent(specialText)).toBe(true);
    });

    it('should handle mixed case and spacing', () => {
      expect(checkMedicalContent('  MEDICINE  ')).toBe(true);
      expect(checkMedicalContent('ยา   มาก')).toBe(true);
    });

    it('should handle partial word matches correctly', () => {
      // Should not match partial words
      expect(checkMedicalContent('ยาก')).toBe(false); // "difficult" contains "ยา" but shouldn't match
      expect(checkEmergencyKeywords('emergency123')).toBe(true); // Should still match
    });
  });
});