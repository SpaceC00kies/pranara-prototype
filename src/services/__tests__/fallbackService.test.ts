/**
 * Tests for Fallback Service
 */

import { 
  getFallbackResponse, 
  getAvailableFallbackTopics,
  hasFallbackForTopic,
  getEmergencyFallback,
  shouldUseEmergencyFallback,
  FallbackService
} from '../fallbackService';
import { TopicCategory } from '@/types';

describe('FallbackService', () => {
  describe('getFallbackResponse', () => {
    it('should return Thai response for general topic', () => {
      const response = getFallbackResponse('general', 'th');
      expect(response).toContain('ขออภัย');
      expect(response).toContain('Jirung');
      expect(response).toContain('LINE');
    });

    it('should return English response for general topic', () => {
      const response = getFallbackResponse('general', 'en');
      expect(response).toContain('apologize');
      expect(response).toContain('Jirung');
      expect(response).toContain('LINE');
    });

    it('should return emergency response for emergency topic', () => {
      const response = getFallbackResponse('emergency', 'th');
      expect(response).toContain('🚨');
      expect(response).toContain('1669');
      expect(response).toContain('ฉุกเฉิน');
    });

    it('should fallback to general for unknown topic', () => {
      const response = getFallbackResponse('unknown_topic' as TopicCategory, 'th');
      expect(response).toContain('ขออภัย');
    });
  });

  describe('getAvailableFallbackTopics', () => {
    it('should return all available topics', () => {
      const topics = getAvailableFallbackTopics();
      expect(topics).toContain('general');
      expect(topics).toContain('emergency');
      expect(topics).toContain('alzheimer');
      expect(topics).toContain('fall');
      expect(topics.length).toBeGreaterThan(5);
    });
  });

  describe('hasFallbackForTopic', () => {
    it('should return true for existing topics', () => {
      expect(hasFallbackForTopic('general')).toBe(true);
      expect(hasFallbackForTopic('emergency')).toBe(true);
      expect(hasFallbackForTopic('alzheimer')).toBe(true);
    });

    it('should return false for non-existing topics', () => {
      expect(hasFallbackForTopic('unknown' as TopicCategory)).toBe(false);
    });
  });

  describe('getEmergencyFallback', () => {
    it('should return emergency response in Thai', () => {
      const response = getEmergencyFallback('th');
      expect(response).toContain('🚨');
      expect(response).toContain('1669');
    });

    it('should return emergency response in English', () => {
      const response = getEmergencyFallback('en');
      expect(response).toContain('🚨');
      expect(response).toContain('1669');
    });
  });

  describe('shouldUseEmergencyFallback', () => {
    it('should detect Thai emergency keywords', () => {
      expect(shouldUseEmergencyFallback('ผู้ป่วยหมดสติ')).toBe(true);
      expect(shouldUseEmergencyFallback('หายใจไม่ออก')).toBe(true);
      expect(shouldUseEmergencyFallback('เจ็บหน้าอกรุนแรง')).toBe(true);
      expect(shouldUseEmergencyFallback('ชักแล้ว')).toBe(true);
    });

    it('should detect English emergency keywords', () => {
      expect(shouldUseEmergencyFallback('patient is unconscious')).toBe(true);
      expect(shouldUseEmergencyFallback('can\'t breathe')).toBe(true);
      expect(shouldUseEmergencyFallback('severe chest pain')).toBe(true);
      expect(shouldUseEmergencyFallback('having a seizure')).toBe(true);
    });

    it('should not trigger for normal messages', () => {
      expect(shouldUseEmergencyFallback('วิธีดูแลผู้สูงอายุ')).toBe(false);
      expect(shouldUseEmergencyFallback('how to care for elderly')).toBe(false);
      expect(shouldUseEmergencyFallback('อาหารที่เหมาะสม')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(shouldUseEmergencyFallback('UNCONSCIOUS')).toBe(true);
      expect(shouldUseEmergencyFallback('หมดสติ')).toBe(true);
    });
  });

  describe('FallbackService class', () => {
    let service: FallbackService;

    beforeEach(() => {
      service = FallbackService.getInstance();
      service.resetUsageStats();
    });

    it('should be a singleton', () => {
      const service1 = FallbackService.getInstance();
      const service2 = FallbackService.getInstance();
      expect(service1).toBe(service2);
    });

    it('should provide contextual fallback', () => {
      const response = service.getContextualFallback('general', 'th', 1, []);
      expect(response).toContain('Jirung');
      expect(response).toContain('LINE');
    });

    it('should add context for long conversations', () => {
      const response = service.getContextualFallback('general', 'th', 5, []);
      expect(response).toContain('คุยกันมาสักพักแล้ว');
    });

    it('should add variety for repeated topics', () => {
      // First call
      service.getContextualFallback('general', 'th', 1, []);
      
      // Second call should have variety note
      const response = service.getContextualFallback('general', 'th', 1, []);
      expect(response.includes('ไม่ตรงกับสถานการณ์') || response.includes('รายละเอียดเพิ่มเติม')).toBe(true);
    });

    it('should track usage statistics', () => {
      service.getContextualFallback('general', 'th', 1, []);
      service.getContextualFallback('alzheimer', 'th', 1, []);
      service.getContextualFallback('general', 'th', 1, []);

      const stats = service.getUsageStats();
      expect(stats.general).toBe(2);
      expect(stats.alzheimer).toBe(1);
    });

    it('should reset usage statistics', () => {
      service.getContextualFallback('general', 'th', 1, []);
      service.resetUsageStats();
      
      const stats = service.getUsageStats();
      expect(stats.general).toBeUndefined();
    });
  });

  describe('Response quality', () => {
    it('should have appropriate length responses', () => {
      const topics: TopicCategory[] = ['general', 'alzheimer', 'fall', 'sleep'];
      
      topics.forEach(topic => {
        const response = getFallbackResponse(topic, 'th');
        expect(response.length).toBeGreaterThan(50);
        expect(response.length).toBeLessThan(1000);
      });
    });

    it('should include LINE contact in all responses', () => {
      const topics: TopicCategory[] = ['general', 'alzheimer', 'fall', 'sleep'];
      
      topics.forEach(topic => {
        const response = getFallbackResponse(topic, 'th');
        expect(response.toLowerCase()).toContain('line');
      });
    });

    it('should include safety warnings for medical topics', () => {
      const medicalTopics: TopicCategory[] = ['alzheimer', 'diabetes', 'medication', 'post_op'];
      
      medicalTopics.forEach(topic => {
        const response = getFallbackResponse(topic, 'th');
        expect(response).toMatch(/แพทย์|ปรึกษา|ติดต่อ/);
      });
    });

    it('should include emergency numbers for emergency topic', () => {
      const response = getFallbackResponse('emergency', 'th');
      expect(response).toContain('1669');
      expect(response).toContain('1646');
    });
  });
});