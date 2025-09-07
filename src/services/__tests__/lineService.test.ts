/**
 * LINE Service Integration Tests
 * Tests LINE URL configuration, handoff logic, and click tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLineConfig,
  validateLineUrl,
  shouldRecommendLineHandoff,
  generateLineHandoffMessage,
  buildLineUrlWithTracking,
  getClientLineConfig,
  openLineUrl
} from '../lineService';
import { TopicCategory } from '../../types';

// Mock environment variables
const mockEnv = {
  LINE_URL: 'https://line.me/ti/p/@jirung-test',
  NEXT_PUBLIC_LINE_URL: 'https://line.me/ti/p/@jirung-test'
};

describe('LINE Service', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env.LINE_URL = mockEnv.LINE_URL;
    process.env.NEXT_PUBLIC_LINE_URL = mockEnv.NEXT_PUBLIC_LINE_URL;
    
    // Clear any existing mocks
    vi.clearAllMocks();
  });

  describe('getLineConfig', () => {
    it('should return valid config when LINE_URL is set', () => {
      const config = getLineConfig();
      
      expect(config.url).toBe(mockEnv.LINE_URL);
      expect(config.isEnabled).toBe(true);
    });

    it('should return disabled config when LINE_URL is not set', () => {
      delete process.env.LINE_URL;
      delete process.env.NEXT_PUBLIC_LINE_URL;
      
      const config = getLineConfig();
      
      expect(config.url).toBe('');
      expect(config.isEnabled).toBe(false);
    });

    it('should fallback to NEXT_PUBLIC_LINE_URL when LINE_URL is not set', () => {
      delete process.env.LINE_URL;
      process.env.NEXT_PUBLIC_LINE_URL = 'https://line.me/ti/p/@fallback';
      
      const config = getLineConfig();
      
      expect(config.url).toBe('https://line.me/ti/p/@fallback');
      expect(config.isEnabled).toBe(true);
    });
  });

  describe('validateLineUrl', () => {
    it('should validate official LINE account URLs', () => {
      const validUrls = [
        'https://line.me/ti/p/@jirung',
        'https://line.me/ti/p/jirung123',
        'https://line.me/ti/p/@test_account'
      ];

      validUrls.forEach(url => {
        expect(validateLineUrl(url)).toBe(true);
      });
    });

    it('should validate LINE QR code URLs', () => {
      const validUrls = [
        'https://line.me/R/ti/p/@jirung',
        'https://line.me/R/ti/p/test123'
      ];

      validUrls.forEach(url => {
        expect(validateLineUrl(url)).toBe(true);
      });
    });

    it('should validate LIFF URLs', () => {
      const validUrls = [
        'https://liff.line.me/1234567890-abcdefgh',
        'https://liff.line.me/9876543210-zyxwvuts'
      ];

      validUrls.forEach(url => {
        expect(validateLineUrl(url)).toBe(true);
      });
    });

    it('should validate LINE short URLs', () => {
      const validUrls = [
        'https://lin.ee/abc123',
        'https://lin.ee/XYZ789'
      ];

      validUrls.forEach(url => {
        expect(validateLineUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'https://google.com',
        'https://line.com/invalid',
        'http://line.me/ti/p/@test', // http instead of https
        null,
        undefined
      ];

      invalidUrls.forEach(url => {
        expect(validateLineUrl(url as any)).toBe(false);
      });
    });
  });

  describe('shouldRecommendLineHandoff', () => {
    it('should recommend handoff for emergency keywords', () => {
      const emergencyMessages = [
        'ฉุกเฉิน ผู้ป่วยหมดสติ',
        'หายใจไม่ออก ช่วยด้วย',
        'เจ็บหน้าอกรุนแรง',
        'emergency unconscious',
        'can\'t breathe help'
      ];

      emergencyMessages.forEach(message => {
        const result = shouldRecommendLineHandoff(message, 'general');
        expect(result.shouldRecommend).toBe(true);
        expect(result.reason).toBe('emergency');
        expect(result.urgency).toBe('high');
      });
    });

    it('should recommend handoff for complex topics', () => {
      const complexTopics: TopicCategory[] = ['emergency', 'medication', 'post_op', 'diabetes'];

      complexTopics.forEach(topic => {
        const result = shouldRecommendLineHandoff('ปกติทั่วไป', topic);
        expect(result.shouldRecommend).toBe(true);
        expect(result.reason).toBe('complex_topic');
        expect(result.urgency).toBe('medium');
      });
    });

    it('should recommend handoff for complex language patterns', () => {
      const complexMessages = [
        'ไม่รู้จะทำยังไง ช่วยไม่ได้แล้ว',
        'ซับซ้อนมาก งงมาก',
        'don\'t know what to do, very confused',
        'need help, overwhelmed'
      ];

      complexMessages.forEach(message => {
        const result = shouldRecommendLineHandoff(message, 'general');
        expect(result.shouldRecommend).toBe(true);
        expect(result.reason).toBe('complex_language');
        expect(result.urgency).toBe('medium');
      });
    });

    it('should recommend handoff for long conversations', () => {
      const result = shouldRecommendLineHandoff('ปกติทั่วไป', 'general', 5);
      expect(result.shouldRecommend).toBe(true);
      expect(result.reason).toBe('long_conversation');
      expect(result.urgency).toBe('low');
    });

    it('should not recommend handoff for normal messages', () => {
      const normalMessages = [
        'สวัสดีครับ',
        'ขอคำแนะนำการดูแลผู้สูงอายุ',
        'hello, need advice'
      ];

      normalMessages.forEach(message => {
        const result = shouldRecommendLineHandoff(message, 'general', 1);
        expect(result.shouldRecommend).toBe(false);
        expect(result.reason).toBe('none');
        expect(result.urgency).toBe('low');
      });
    });
  });

  describe('generateLineHandoffMessage', () => {
    it('should generate appropriate emergency messages', () => {
      const thaiMessage = generateLineHandoffMessage('emergency', 'high', 'th');
      const englishMessage = generateLineHandoffMessage('emergency', 'high', 'en');

      expect(thaiMessage).toContain('เร่งด่วน');
      expect(thaiMessage).toContain('1669');
      expect(englishMessage).toContain('urgent');
      expect(englishMessage).toContain('1669');
    });

    it('should generate appropriate complex topic messages', () => {
      const thaiMessage = generateLineHandoffMessage('complex_topic', 'medium', 'th');
      const englishMessage = generateLineHandoffMessage('complex_topic', 'medium', 'en');

      expect(thaiMessage).toContain('ซับซ้อน');
      expect(thaiMessage).toContain('ทีม Jirung');
      expect(englishMessage).toContain('complex');
      expect(englishMessage).toContain('Jirung team');
    });

    it('should generate appropriate complex language messages', () => {
      const thaiMessage = generateLineHandoffMessage('complex_language', 'medium', 'th');
      const englishMessage = generateLineHandoffMessage('complex_language', 'medium', 'en');

      expect(thaiMessage).toContain('ยุ่งยาก');
      expect(thaiMessage).toContain('ช่วยเหลือ');
      expect(englishMessage).toContain('challenging');
      expect(englishMessage).toContain('help');
    });

    it('should generate appropriate long conversation messages', () => {
      const thaiMessage = generateLineHandoffMessage('long_conversation', 'low', 'th');
      const englishMessage = generateLineHandoffMessage('long_conversation', 'low', 'en');

      expect(thaiMessage).toContain('หลายเรื่อง');
      expect(thaiMessage).toContain('เจาะลึก');
      expect(englishMessage).toContain('several questions');
      expect(englishMessage).toContain('in-depth');
    });

    it('should default to general message for unknown reasons', () => {
      const thaiMessage = generateLineHandoffMessage('none', 'low', 'th');
      const englishMessage = generateLineHandoffMessage('none', 'low', 'en');

      expect(thaiMessage).toContain('ความช่วยเหลือเพิ่มเติม');
      expect(englishMessage).toContain('additional assistance');
    });
  });

  describe('buildLineUrlWithTracking', () => {
    it('should add tracking parameters to LIFF URLs', () => {
      const baseUrl = 'https://liff.line.me/1234567890-abcdefgh';
      const sessionId = 'test-session-123';
      const topic: TopicCategory = 'diabetes';
      const reason = 'complex_topic';

      const trackedUrl = buildLineUrlWithTracking(baseUrl, sessionId, topic, reason);
      const url = new URL(trackedUrl);

      expect(url.searchParams.get('source')).toBe('jirung_ai');
      expect(url.searchParams.get('session')).toBe('test-ses'); // First 8 chars
      expect(url.searchParams.get('topic')).toBe('diabetes');
      expect(url.searchParams.get('reason')).toBe('complex_topic');
    });

    it('should not add tracking parameters to regular LINE URLs', () => {
      const baseUrl = 'https://line.me/ti/p/@jirung';
      const sessionId = 'test-session-123';
      const topic: TopicCategory = 'general';
      const reason = 'manual';

      const trackedUrl = buildLineUrlWithTracking(baseUrl, sessionId, topic, reason);

      expect(trackedUrl).toBe(baseUrl); // Should be unchanged
    });

    it('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-valid-url';
      const sessionId = 'test-session';
      const topic: TopicCategory = 'general';
      const reason = 'manual';

      const result = buildLineUrlWithTracking(invalidUrl, sessionId, topic, reason);

      expect(result).toBe(invalidUrl); // Should return original URL
    });

    it('should handle empty URL', () => {
      const result = buildLineUrlWithTracking('', 'session', 'general', 'manual');
      expect(result).toBe('');
    });
  });

  describe('getClientLineConfig', () => {
    it('should return config from NEXT_PUBLIC_LINE_URL', () => {
      const config = getClientLineConfig();
      
      expect(config.url).toBe(mockEnv.NEXT_PUBLIC_LINE_URL);
      expect(config.isEnabled).toBe(true);
    });

    it('should return disabled config when NEXT_PUBLIC_LINE_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_LINE_URL;
      
      const config = getClientLineConfig();
      
      expect(config.url).toBe('');
      expect(config.isEnabled).toBe(false);
    });
  });

  describe('openLineUrl', () => {
    let mockWindowOpen: any;

    beforeEach(() => {
      // Mock window.open
      mockWindowOpen = vi.fn();
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true
      });
    });

    it('should open LINE URL with tracking', () => {
      const sessionId = 'test-session-123';
      const topic: TopicCategory = 'diabetes';
      const reason = 'complex_topic';
      const mockCallback = vi.fn();

      openLineUrl(sessionId, topic, reason, mockCallback);

      expect(mockCallback).toHaveBeenCalled();
      expect(mockWindowOpen).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_LINE_URL,
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should not open URL when LINE is not configured', () => {
      delete process.env.NEXT_PUBLIC_LINE_URL;
      
      const sessionId = 'test-session';
      const topic: TopicCategory = 'general';
      const reason = 'manual';

      // Mock console.error to avoid test output
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      openLineUrl(sessionId, topic, reason);

      expect(mockConsoleError).toHaveBeenCalledWith('LINE integration is not configured');
      expect(mockWindowOpen).not.toHaveBeenCalled();

      mockConsoleError.mockRestore();
    });

    it('should call tracking callback before opening URL', () => {
      const mockCallback = vi.fn();
      
      openLineUrl('session', 'general', 'manual', mockCallback);

      expect(mockCallback).toHaveBeenCalled();
      expect(mockWindowOpen).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete emergency handoff flow', () => {
      const emergencyMessage = 'ฉุกเฉิน ผู้ป่วยหมดสติ';
      const topic: TopicCategory = 'emergency';

      // Check handoff recommendation
      const handoffResult = shouldRecommendLineHandoff(emergencyMessage, topic);
      expect(handoffResult.shouldRecommend).toBe(true);
      expect(handoffResult.reason).toBe('emergency');
      expect(handoffResult.urgency).toBe('high');

      // Generate appropriate message
      const message = generateLineHandoffMessage(
        handoffResult.reason,
        handoffResult.urgency,
        'th'
      );
      expect(message).toContain('เร่งด่วน');
      expect(message).toContain('1669');

      // Build tracking URL
      const trackedUrl = buildLineUrlWithTracking(
        mockEnv.LINE_URL,
        'emergency-session',
        topic,
        handoffResult.reason
      );
      expect(trackedUrl).toBe(mockEnv.LINE_URL); // Regular LINE URL, no tracking params
    });

    it('should handle complete complex topic handoff flow', () => {
      const complexMessage = 'ยาเบาหวานของคุณยายไม่รู้จะปรับยังไง';
      const topic: TopicCategory = 'diabetes';

      // Check handoff recommendation
      const handoffResult = shouldRecommendLineHandoff(complexMessage, topic);
      expect(handoffResult.shouldRecommend).toBe(true);
      expect(handoffResult.reason).toBe('complex_topic');
      expect(handoffResult.urgency).toBe('medium');

      // Generate appropriate message
      const message = generateLineHandoffMessage(
        handoffResult.reason,
        handoffResult.urgency,
        'th'
      );
      expect(message).toContain('ซับซ้อน');
      expect(message).toContain('ทีม Jirung');
    });

    it('should handle complete long conversation handoff flow', () => {
      const normalMessage = 'ขอคำแนะนำเพิ่มเติม';
      const topic: TopicCategory = 'general';
      const conversationLength = 6;

      // Check handoff recommendation
      const handoffResult = shouldRecommendLineHandoff(normalMessage, topic, conversationLength);
      expect(handoffResult.shouldRecommend).toBe(true);
      expect(handoffResult.reason).toBe('long_conversation');
      expect(handoffResult.urgency).toBe('low');

      // Generate appropriate message
      const message = generateLineHandoffMessage(
        handoffResult.reason,
        handoffResult.urgency,
        'th'
      );
      expect(message).toContain('หลายเรื่อง');
      expect(message).toContain('เจาะลึก');
    });
  });
});