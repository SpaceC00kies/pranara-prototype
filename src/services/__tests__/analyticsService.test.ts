/**
 * Unit tests for Analytics Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyTopic,
  createAnalyticsEvent,
  eventToLogFormat,
  logToEventFormat,
  calculateTopicAnalytics,
  calculateUsageStats,
  analyzeConversationFlow,
  getCommonPatterns
} from '../analyticsService';
import { AnalyticsLog, TopicCategory } from '../../types';

// Mock the PII scrubber
vi.mock('../../utils/piiScrubber', () => ({
  scrubPII: vi.fn((text: string) => ({
    scrubbedText: text.replace(/test@email\.com/g, '[EMAIL]'),
    foundPatterns: text.includes('test@email.com') ? ['email'] : [],
    isClean: !text.includes('test@email.com')
  }))
}));

// Mock session service
vi.mock('../sessionService', () => ({
  createSessionHash: vi.fn((sessionId: string) => sessionId.substring(0, 8))
}));

describe('AnalyticsService', () => {
  describe('classifyTopic', () => {
    it('should classify Alzheimer-related messages', () => {
      const result = classifyTopic('คุณยายลืมเรื่องต่างๆ และสับสน');
      expect(result.topic).toBe('alzheimer');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('ลืม');
      expect(result.keywords).toContain('สับสน');
    });

    it('should classify fall-related messages', () => {
      const result = classifyTopic('คุณปู่ล้มเมื่อวาน ขาอ่อนแอ');
      expect(result.topic).toBe('fall');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('ล้ม');
      expect(result.keywords).toContain('ขาอ่อน');
    });

    it('should classify sleep-related messages', () => {
      const result = classifyTopic('นอนไม่หลับ ตื่นกลางคืน');
      expect(result.topic).toBe('sleep');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('นอนไม่หลับ');
      expect(result.keywords).toContain('ตื่น');
    });

    it('should classify emergency messages', () => {
      const result = classifyTopic('หมดสติ หายใจไม่ออก');
      expect(result.topic).toBe('emergency');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('หมดสติ');
      expect(result.keywords).toContain('หายใจไม่ออก');
    });

    it('should classify English messages', () => {
      const result = classifyTopic('memory loss and confusion');
      expect(result.topic).toBe('alzheimer');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('memory');
      expect(result.keywords).toContain('confusion');
    });

    it('should default to general for unmatched content', () => {
      const result = classifyTopic('random unrelated content');
      expect(result.topic).toBe('general');
      expect(result.confidence).toBe(0);
      expect(result.keywords).toHaveLength(0);
    });

    it('should handle empty messages', () => {
      const result = classifyTopic('');
      expect(result.topic).toBe('general');
      expect(result.confidence).toBe(0);
    });

    it('should calculate confidence correctly', () => {
      // Message with multiple keywords should have higher confidence
      const result1 = classifyTopic('ลืม สับสน ความจำ'); // 3 keywords
      const result2 = classifyTopic('ลืม'); // 1 keyword
      
      expect(result1.confidence).toBeGreaterThan(result2.confidence);
      expect(result1.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('createAnalyticsEvent', () => {
    it('should create analytics event with PII scrubbing', () => {
      const sessionId = 'a'.repeat(64); // Valid session ID
      const message = 'Help with test@email.com contact';
      
      const event = createAnalyticsEvent(sessionId, message, 'general', 'en');
      
      expect(event.sessionId).toBe('aaaaaaaa'); // First 8 chars
      expect(event.textSnippet).toBe('Help with [EMAIL] contact');
      expect(event.topic).toBe('general');
      expect(event.language).toBe('en');
      expect(event.lineClicked).toBe(false);
      expect(event.routed).toBe('primary');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should truncate long messages to 160 characters', () => {
      const sessionId = 'a'.repeat(64);
      const longMessage = 'a'.repeat(200);
      
      const event = createAnalyticsEvent(sessionId, longMessage, 'general', 'th');
      
      expect(event.textSnippet.length).toBe(160);
    });

    it('should handle LINE click tracking', () => {
      const sessionId = 'a'.repeat(64);
      const event = createAnalyticsEvent(sessionId, 'test', 'general', 'th', true, 'fallback');
      
      expect(event.lineClicked).toBe(true);
      expect(event.routed).toBe('fallback');
    });
  });

  describe('eventToLogFormat and logToEventFormat', () => {
    it('should convert between event and log formats', () => {
      const originalEvent = {
        sessionId: 'session123',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        textSnippet: 'test message',
        topic: 'general' as TopicCategory,
        language: 'th' as const,
        lineClicked: true,
        routed: 'primary' as const
      };

      const log = eventToLogFormat(originalEvent);
      expect(log.session_id).toBe('session123');
      expect(log.text_snippet).toBe('test message');
      expect(log.topic).toBe('general');
      expect(log.line_clicked).toBe(true);

      const convertedEvent = logToEventFormat(log);
      expect(convertedEvent.sessionId).toBe(originalEvent.sessionId);
      expect(convertedEvent.textSnippet).toBe(originalEvent.textSnippet);
      expect(convertedEvent.topic).toBe(originalEvent.topic);
      expect(convertedEvent.lineClicked).toBe(originalEvent.lineClicked);
    });
  });

  describe('calculateTopicAnalytics', () => {
    let sampleLogs: AnalyticsLog[];

    beforeEach(() => {
      sampleLogs = [
        {
          id: 1,
          session_id: 'session1',
          timestamp: new Date(),
          text_snippet: 'sleep problem',
          topic: 'sleep',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        },
        {
          id: 2,
          session_id: 'session2',
          timestamp: new Date(),
          text_snippet: 'sleep issue',
          topic: 'sleep',
          language: 'th',
          line_clicked: true,
          routed: 'primary'
        },
        {
          id: 3,
          session_id: 'session3',
          timestamp: new Date(),
          text_snippet: 'fall incident',
          topic: 'fall',
          language: 'en',
          line_clicked: false,
          routed: 'primary'
        }
      ];
    });

    it('should calculate topic analytics correctly', () => {
      const analytics = calculateTopicAnalytics(sampleLogs);
      
      expect(analytics).toHaveLength(2);
      
      const sleepAnalytics = analytics.find(a => a.topic === 'sleep');
      expect(sleepAnalytics).toBeDefined();
      expect(sleepAnalytics!.count).toBe(2);
      expect(sleepAnalytics!.percentage).toBe((2/3) * 100);
      expect(sleepAnalytics!.lineClickRate).toBe(50); // 1 out of 2 clicked
      
      const fallAnalytics = analytics.find(a => a.topic === 'fall');
      expect(fallAnalytics).toBeDefined();
      expect(fallAnalytics!.count).toBe(1);
      expect(fallAnalytics!.percentage).toBe((1/3) * 100);
      expect(fallAnalytics!.lineClickRate).toBe(0);
    });

    it('should sort by count descending', () => {
      const analytics = calculateTopicAnalytics(sampleLogs);
      expect(analytics[0].count).toBeGreaterThanOrEqual(analytics[1].count);
    });

    it('should handle empty logs', () => {
      const analytics = calculateTopicAnalytics([]);
      expect(analytics).toHaveLength(0);
    });
  });

  describe('calculateUsageStats', () => {
    let sampleLogs: AnalyticsLog[];

    beforeEach(() => {
      sampleLogs = [
        {
          id: 1,
          session_id: 'session1',
          timestamp: new Date(),
          text_snippet: 'message 1',
          topic: 'sleep',
          language: 'th',
          line_clicked: true,
          routed: 'primary'
        },
        {
          id: 2,
          session_id: 'session1',
          timestamp: new Date(),
          text_snippet: 'message 2',
          topic: 'fall',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        },
        {
          id: 3,
          session_id: 'session2',
          timestamp: new Date(),
          text_snippet: 'message 3',
          topic: 'sleep',
          language: 'en',
          line_clicked: false,
          routed: 'primary'
        }
      ];
    });

    it('should calculate usage statistics correctly', () => {
      const stats = calculateUsageStats(sampleLogs);
      
      expect(stats.totalQuestions).toBe(3);
      expect(stats.uniqueSessions).toBe(2);
      expect(stats.lineClickRate).toBe((1/3) * 100);
      expect(stats.languageDistribution).toEqual({ th: 2, en: 1 });
      expect(stats.topTopics).toHaveLength(2);
      expect(stats.averageResponseTime).toBe(2.5); // Placeholder value
    });

    it('should handle empty logs', () => {
      const stats = calculateUsageStats([]);
      
      expect(stats.totalQuestions).toBe(0);
      expect(stats.uniqueSessions).toBe(0);
      expect(stats.lineClickRate).toBe(0);
      expect(stats.languageDistribution).toEqual({});
      expect(stats.topTopics).toHaveLength(0);
    });
  });

  describe('analyzeConversationFlow', () => {
    let sampleLogs: AnalyticsLog[];

    beforeEach(() => {
      sampleLogs = [
        {
          id: 1,
          session_id: 'session1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          text_snippet: 'first message',
          topic: 'sleep',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        },
        {
          id: 2,
          session_id: 'session1',
          timestamp: new Date('2024-01-01T10:05:00Z'),
          text_snippet: 'second message',
          topic: 'fall',
          language: 'th',
          line_clicked: true,
          routed: 'primary'
        },
        {
          id: 3,
          session_id: 'session2',
          timestamp: new Date('2024-01-01T11:00:00Z'),
          text_snippet: 'single message',
          topic: 'diet',
          language: 'en',
          line_clicked: false,
          routed: 'primary'
        }
      ];
    });

    it('should analyze conversation flows correctly', () => {
      const flows = analyzeConversationFlow(sampleLogs);
      
      expect(flows).toHaveLength(2);
      
      const session1Flow = flows.find(f => f.sessionId === 'session1');
      expect(session1Flow).toBeDefined();
      expect(session1Flow!.totalSteps).toBe(2);
      expect(session1Flow!.duration).toBe(5); // 5 minutes
      expect(session1Flow!.endedWithLineHandoff).toBe(true);
      expect(session1Flow!.steps).toHaveLength(2);
      expect(session1Flow!.steps[0].topic).toBe('sleep');
      expect(session1Flow!.steps[1].topic).toBe('fall');
      
      const session2Flow = flows.find(f => f.sessionId === 'session2');
      expect(session2Flow).toBeDefined();
      expect(session2Flow!.totalSteps).toBe(1);
      expect(session2Flow!.endedWithLineHandoff).toBe(false);
    });

    it('should handle empty logs', () => {
      const flows = analyzeConversationFlow([]);
      expect(flows).toHaveLength(0);
    });
  });

  describe('getCommonPatterns', () => {
    it('should identify common conversation patterns', () => {
      const flows = [
        {
          sessionId: 'session1',
          steps: [
            { step: 1, topic: 'sleep' as TopicCategory, timestamp: new Date(), lineHandoff: false },
            { step: 2, topic: 'fall' as TopicCategory, timestamp: new Date(), lineHandoff: true }
          ],
          totalSteps: 2,
          duration: 10,
          endedWithLineHandoff: true
        },
        {
          sessionId: 'session2',
          steps: [
            { step: 1, topic: 'sleep' as TopicCategory, timestamp: new Date(), lineHandoff: false },
            { step: 2, topic: 'fall' as TopicCategory, timestamp: new Date(), lineHandoff: false }
          ],
          totalSteps: 2,
          duration: 15,
          endedWithLineHandoff: false
        },
        {
          sessionId: 'session3',
          steps: [
            { step: 1, topic: 'diet' as TopicCategory, timestamp: new Date(), lineHandoff: false }
          ],
          totalSteps: 1,
          duration: 5,
          endedWithLineHandoff: false
        }
      ];

      const patterns = getCommonPatterns(flows);
      
      expect(patterns).toHaveLength(2);
      
      const sleepFallPattern = patterns.find(p => 
        p.pattern.length === 2 && p.pattern[0] === 'sleep' && p.pattern[1] === 'fall'
      );
      expect(sleepFallPattern).toBeDefined();
      expect(sleepFallPattern!.frequency).toBe(2);
      expect(sleepFallPattern!.averageDuration).toBe(12.5);
      expect(sleepFallPattern!.lineHandoffRate).toBe(50);
      
      const dietPattern = patterns.find(p => 
        p.pattern.length === 1 && p.pattern[0] === 'diet'
      );
      expect(dietPattern).toBeDefined();
      expect(dietPattern!.frequency).toBe(1);
    });

    it('should handle empty flows', () => {
      const patterns = getCommonPatterns([]);
      expect(patterns).toHaveLength(0);
    });

    it('should limit to top 10 patterns', () => {
      // Create 15 different patterns
      const flows = Array.from({ length: 15 }, (_, i) => ({
        sessionId: `session${i}`,
        steps: [{ 
          step: 1, 
          topic: `topic${i}` as TopicCategory, 
          timestamp: new Date(), 
          lineHandoff: false 
        }],
        totalSteps: 1,
        duration: 5,
        endedWithLineHandoff: false
      }));

      const patterns = getCommonPatterns(flows);
      expect(patterns.length).toBeLessThanOrEqual(10);
    });
  });
});