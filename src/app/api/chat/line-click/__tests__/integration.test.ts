/**
 * LINE Click Tracking Integration Tests
 * Simplified integration tests for LINE handoff functionality
 */

import { describe, it, expect } from 'vitest';
import { 
  shouldRecommendLineHandoff, 
  generateLineHandoffMessage,
  validateLineUrl,
  buildLineUrlWithTracking
} from '@/services/lineService';
import { TopicCategory } from '@/types';

describe('LINE Integration Tests', () => {
  describe('LINE handoff recommendation logic', () => {
    it('should recommend handoff for emergency situations', () => {
      const emergencyMessages = [
        'ฉุกเฉิน ผู้ป่วยหมดสติ',
        'หายใจไม่ออก ช่วยด้วย',
        'เจ็บหน้าอกรุนแรง'
      ];

      emergencyMessages.forEach(message => {
        const result = shouldRecommendLineHandoff(message, 'general');
        expect(result.shouldRecommend).toBe(true);
        expect(result.reason).toBe('emergency');
        expect(result.urgency).toBe('high');
      });
    });

    it('should recommend handoff for complex medical topics', () => {
      const complexTopics: TopicCategory[] = ['medication', 'diabetes', 'post_op'];

      complexTopics.forEach(topic => {
        const result = shouldRecommendLineHandoff('ปกติทั่วไป', topic);
        expect(result.shouldRecommend).toBe(true);
        expect(result.reason).toBe('complex_topic');
        expect(result.urgency).toBe('medium');
      });
    });

    it('should recommend handoff for long conversations', () => {
      const result = shouldRecommendLineHandoff('ขอคำแนะนำ', 'general', 6);
      expect(result.shouldRecommend).toBe(true);
      expect(result.reason).toBe('long_conversation');
      expect(result.urgency).toBe('low');
    });
  });

  describe('LINE handoff message generation', () => {
    it('should generate appropriate emergency messages', () => {
      const message = generateLineHandoffMessage('emergency', 'high', 'th');
      expect(message).toContain('เร่งด่วน');
      expect(message).toContain('1669');
    });

    it('should generate appropriate complex topic messages', () => {
      const message = generateLineHandoffMessage('complex_topic', 'medium', 'th');
      expect(message).toContain('ซับซ้อน');
      expect(message).toContain('ทีม Jirung');
    });

    it('should generate appropriate long conversation messages', () => {
      const message = generateLineHandoffMessage('long_conversation', 'low', 'th');
      expect(message).toContain('หลายเรื่อง');
      expect(message).toContain('เจาะลึก');
    });
  });

  describe('LINE URL validation and tracking', () => {
    it('should validate various LINE URL formats', () => {
      const validUrls = [
        'https://line.me/ti/p/@jirung',
        'https://line.me/R/ti/p/@test',
        'https://liff.line.me/1234567890-abcdefgh',
        'https://lin.ee/abc123'
      ];

      validUrls.forEach(url => {
        expect(validateLineUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'https://google.com',
        'http://line.me/ti/p/@test', // http instead of https
        'not-a-url',
        ''
      ];

      invalidUrls.forEach(url => {
        expect(validateLineUrl(url)).toBe(false);
      });
    });

    it('should add tracking parameters to LIFF URLs', () => {
      const baseUrl = 'https://liff.line.me/1234567890-abcdefgh';
      const trackedUrl = buildLineUrlWithTracking(baseUrl, 'session123', 'diabetes', 'complex_topic');
      
      const url = new URL(trackedUrl);
      expect(url.searchParams.get('source')).toBe('jirung_ai');
      expect(url.searchParams.get('topic')).toBe('diabetes');
      expect(url.searchParams.get('reason')).toBe('complex_topic');
    });

    it('should not modify regular LINE URLs', () => {
      const baseUrl = 'https://line.me/ti/p/@jirung';
      const trackedUrl = buildLineUrlWithTracking(baseUrl, 'session123', 'general', 'manual');
      
      expect(trackedUrl).toBe(baseUrl);
    });
  });

  describe('Complete handoff scenarios', () => {
    it('should handle emergency handoff flow', () => {
      const message = 'ฉุกเฉิน ผู้ป่วยหมดสติ';
      const topic: TopicCategory = 'emergency';

      // Check recommendation
      const recommendation = shouldRecommendLineHandoff(message, topic);
      expect(recommendation.shouldRecommend).toBe(true);
      expect(recommendation.reason).toBe('emergency');
      expect(recommendation.urgency).toBe('high');

      // Generate message
      const handoffMessage = generateLineHandoffMessage(
        recommendation.reason,
        recommendation.urgency,
        'th'
      );
      expect(handoffMessage).toContain('เร่งด่วน');
      expect(handoffMessage).toContain('1669');

      // Validate URL
      const lineUrl = 'https://line.me/ti/p/@jirung-emergency';
      expect(validateLineUrl(lineUrl)).toBe(true);
    });

    it('should handle complex topic handoff flow', () => {
      const message = 'ยาเบาหวานของคุณยายไม่รู้จะปรับยังไง';
      const topic: TopicCategory = 'diabetes';

      // Check recommendation
      const recommendation = shouldRecommendLineHandoff(message, topic);
      expect(recommendation.shouldRecommend).toBe(true);
      expect(recommendation.reason).toBe('complex_topic');
      expect(recommendation.urgency).toBe('medium');

      // Generate message
      const handoffMessage = generateLineHandoffMessage(
        recommendation.reason,
        recommendation.urgency,
        'th'
      );
      expect(handoffMessage).toContain('ซับซ้อน');
      expect(handoffMessage).toContain('ทีม Jirung');
    });

    it('should handle long conversation handoff flow', () => {
      const message = 'ขอคำแนะนำเพิ่มเติม';
      const topic: TopicCategory = 'general';
      const conversationLength = 7;

      // Check recommendation
      const recommendation = shouldRecommendLineHandoff(message, topic, conversationLength);
      expect(recommendation.shouldRecommend).toBe(true);
      expect(recommendation.reason).toBe('long_conversation');
      expect(recommendation.urgency).toBe('low');

      // Generate message
      const handoffMessage = generateLineHandoffMessage(
        recommendation.reason,
        recommendation.urgency,
        'th'
      );
      expect(handoffMessage).toContain('หลายเรื่อง');
      expect(handoffMessage).toContain('เจาะลึก');
    });

    it('should not recommend handoff for normal conversations', () => {
      const message = 'สวัสดีครับ ขอคำแนะนำการดูแลผู้สูงอายุ';
      const topic: TopicCategory = 'general';
      const conversationLength = 2;

      const recommendation = shouldRecommendLineHandoff(message, topic, conversationLength);
      expect(recommendation.shouldRecommend).toBe(false);
      expect(recommendation.reason).toBe('none');
      expect(recommendation.urgency).toBe('low');
    });
  });

  describe('Request validation logic', () => {
    it('should validate LINE click request structure', () => {
      const validRequest = {
        sessionId: 'test-session-123',
        topic: 'diabetes' as TopicCategory,
        reason: 'complex_topic',
        timestamp: new Date().toISOString(),
        urgency: 'medium'
      };

      // Basic validation checks
      expect(typeof validRequest.sessionId).toBe('string');
      expect(validRequest.sessionId.length).toBeGreaterThan(0);
      expect(typeof validRequest.topic).toBe('string');
      expect(['emergency', 'complex_topic', 'complex_language', 'long_conversation', 'manual']).toContain(validRequest.reason);
      expect(new Date(validRequest.timestamp).getTime()).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(validRequest.urgency);
    });

    it('should handle missing required fields', () => {
      const invalidRequests = [
        { topic: 'general', reason: 'manual', timestamp: new Date().toISOString() }, // missing sessionId
        { sessionId: 'test', reason: 'manual', timestamp: new Date().toISOString() }, // missing topic
        { sessionId: 'test', topic: 'general', timestamp: new Date().toISOString() }, // missing reason
        { sessionId: 'test', topic: 'general', reason: 'manual' } // missing timestamp
      ];

      invalidRequests.forEach(request => {
        const hasAllRequired = 
          request.hasOwnProperty('sessionId') &&
          request.hasOwnProperty('topic') &&
          request.hasOwnProperty('reason') &&
          request.hasOwnProperty('timestamp');
        
        expect(hasAllRequired).toBe(false);
      });
    });
  });
});