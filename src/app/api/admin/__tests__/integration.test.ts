/**
 * Admin Integration Tests
 * Tests the complete admin dashboard functionality end-to-end
 */

import { NextRequest } from 'next/server';
import { GET } from '../stats/route';
import { DatabaseService } from '../../../../services/databaseService';
import { AnalyticsLog, TopicCategory } from '../../../../types';
import { vi } from 'vitest';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { expect } from 'playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock environment
const originalEnv = process.env;

describe('Admin Dashboard Integration', () => {
  let mockDatabase: ReturnType<typeof vi.mocked<DatabaseService>>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ADMIN_PASSWORD = 'test123';

    // Create mock database
    mockDatabase = {
      connect: vi.fn(),
      isHealthy: vi.fn(),
      storeAnalyticsEvent: vi.fn(),
      getAnalyticsLogs: vi.fn(),
      getUsageStats: vi.fn(),
      getTopQuestions: vi.fn(),
      initializeSchema: vi.fn(),
      disconnect: vi.fn()
    } as any;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockLogs = (count: number): AnalyticsLog[] => {
    const logs: AnalyticsLog[] = [];
    const topics: TopicCategory[] = ['sleep', 'diet', 'diabetes', 'mood', 'general'];
    const languages = ['th', 'en'];
    
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(i / 10)); // Spread across days
      date.setHours(9 + (i % 8)); // Spread across hours
      
      logs.push({
        id: i + 1,
        session_id: `session_${Math.floor(i / 3) + 1}`, // 3 questions per session on average
        timestamp: date,
        text_snippet: `Question ${i + 1} about ${topics[i % topics.length]}`,
        topic: topics[i % topics.length],
        language: languages[i % languages.length],
        line_clicked: Math.random() > 0.8, // 20% click rate
        routed: Math.random() > 0.9 ? 'fallback' : 'primary' // 10% fallback rate
      });
    }
    
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  describe('Real-world Data Scenarios', () => {
    it('should handle large dataset efficiently', async () => {
      const largeLogs = createMockLogs(1000);
      const topQuestions = [
        { snippet: 'How to help with sleep problems?', count: 45, topic: 'sleep' },
        { snippet: 'What diet is best for elderly?', count: 38, topic: 'diet' },
        { snippet: 'Managing diabetes in seniors', count: 32, topic: 'diabetes' }
      ];

      // Mock database with large dataset
      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockResolvedValue(largeLogs),
          getTopQuestions: vi.fn().mockResolvedValue(topQuestions)
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/stats?period=30d', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      
      // Verify data processing
      expect(data.stats.totalQuestions).toBe(1000);
      expect(data.stats.uniqueSessions).toBeGreaterThan(0);
      expect(data.stats.topTopics).toHaveLength(5); // All 5 topics should be present
      expect(data.conversationFlows).toHaveLength(20); // Limited to 20 for performance
      expect(data.commonPatterns).toBeDefined();
      expect(data.hourlyDistribution).toBeDefined();
      expect(data.dailyTrends).toBeDefined();
    });

    it('should calculate accurate metrics for realistic conversation patterns', async () => {
      // Create realistic conversation patterns
      const realisticLogs: AnalyticsLog[] = [
        // Session 1: Single question, abandoned
        {
          id: 1,
          session_id: 'session_1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          text_snippet: 'Quick question about sleep',
          topic: 'sleep',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        },
        
        // Session 2: Multi-turn conversation ending in LINE handoff
        {
          id: 2,
          session_id: 'session_2',
          timestamp: new Date('2024-01-15T14:00:00Z'),
          text_snippet: 'My father has diabetes',
          topic: 'diabetes',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        },
        {
          id: 3,
          session_id: 'session_2',
          timestamp: new Date('2024-01-15T14:02:00Z'),
          text_snippet: 'What foods should he avoid?',
          topic: 'diet',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        },
        {
          id: 4,
          session_id: 'session_2',
          timestamp: new Date('2024-01-15T14:05:00Z'),
          text_snippet: 'He also has trouble sleeping',
          topic: 'sleep',
          language: 'th',
          line_clicked: true,
          routed: 'primary'
        },
        
        // Session 3: Emergency scenario
        {
          id: 5,
          session_id: 'session_3',
          timestamp: new Date('2024-01-15T20:30:00Z'),
          text_snippet: 'Emergency - chest pain',
          topic: 'emergency',
          language: 'en',
          line_clicked: true,
          routed: 'fallback'
        }
      ];

      const topQuestions = [
        { snippet: 'My father has diabetes', count: 1, topic: 'diabetes' },
        { snippet: 'Emergency - chest pain', count: 1, topic: 'emergency' }
      ];

      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockResolvedValue(realisticLogs),
          getTopQuestions: vi.fn().mockResolvedValue(topQuestions)
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const data = await response.json();

      // Verify realistic metrics
      expect(data.stats.totalQuestions).toBe(5);
      expect(data.stats.uniqueSessions).toBe(3);
      expect(data.stats.lineClickRate).toBe(40); // 2 out of 5 questions
      
      // Session analytics
      expect(data.sessionAnalytics.averageQuestionsPerSession).toBeCloseTo(1.67, 1); // 5 questions / 3 sessions
      expect(data.sessionAnalytics.conversionRate).toBeCloseTo(66.67, 1); // 2 out of 3 sessions ended with LINE click
      expect(data.sessionAnalytics.abandonmentRate).toBeCloseTo(33.33, 1); // 1 out of 3 sessions was single question
      
      // Language distribution
      expect(data.stats.languageDistribution.th).toBe(4);
      expect(data.stats.languageDistribution.en).toBe(1);
      
      // Topic distribution
      const sleepTopic = data.stats.topTopics.find(t => t.topic === 'sleep');
      const diabetesTopic = data.stats.topTopics.find(t => t.topic === 'diabetes');
      
      expect(sleepTopic?.count).toBe(2);
      expect(diabetesTopic?.count).toBe(1);
      
      // Hourly distribution
      expect(data.hourlyDistribution['10']).toBe(1); // 10:00 AM
      expect(data.hourlyDistribution['14']).toBe(3); // 2:00 PM
      expect(data.hourlyDistribution['20']).toBe(1); // 8:00 PM
    });

    it('should handle Thai language content correctly', async () => {
      const thaiLogs: AnalyticsLog[] = [
        {
          id: 1,
          session_id: 'thai_session_1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          text_snippet: 'ผู้สูงอายุนอนไม่หลับ ควรทำอย่างไร',
          topic: 'sleep',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        },
        {
          id: 2,
          session_id: 'thai_session_1',
          timestamp: new Date('2024-01-15T10:02:00Z'),
          text_snippet: 'มีวิธีธรรมชาติช่วยให้หลับได้ไหม',
          topic: 'sleep',
          language: 'th',
          line_clicked: true,
          routed: 'primary'
        }
      ];

      const thaiQuestions = [
        { snippet: 'ผู้สูงอายุนอนไม่หลับ ควรทำอย่างไร', count: 1, topic: 'sleep' }
      ];

      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockResolvedValue(thaiLogs),
          getTopQuestions: vi.fn().mockResolvedValue(thaiQuestions)
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const data = await response.json();

      // Verify Thai content handling
      expect(data.stats.languageDistribution.th).toBe(2);
      expect(data.topQuestions[0].snippet).toContain('ผู้สูงอายุ');
      
      // CSV export should handle Thai characters
      const csvRequest = new NextRequest('http://localhost:3000/api/admin/stats?format=csv', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const csvResponse = await GET(csvRequest);
      const csvContent = await csvResponse.text();
      
      expect(csvContent).toContain('ผู้สูงอายุ');
      expect(csvResponse.headers.get('Content-Type')).toBe('text/csv');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      const logs = createMockLogs(500);
      const topQuestions = [
        { snippet: 'Common question 1', count: 25, topic: 'general' },
        { snippet: 'Common question 2', count: 20, topic: 'sleep' }
      ];

      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockResolvedValue(logs),
          getTopQuestions: vi.fn().mockResolvedValue(topQuestions)
        })
      }));

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/admin/stats', {
          headers: { 'Authorization': 'Bearer test123' }
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => GET(req)));
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust based on your performance requirements)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds for 5 concurrent requests
    });

    it('should limit conversation flows for performance', async () => {
      // Create many sessions
      const manySessionLogs: AnalyticsLog[] = [];
      for (let i = 0; i < 100; i++) {
        manySessionLogs.push({
          id: i + 1,
          session_id: `session_${i}`,
          timestamp: new Date(),
          text_snippet: `Question from session ${i}`,
          topic: 'general',
          language: 'th',
          line_clicked: false,
          routed: 'primary'
        });
      }

      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockResolvedValue(manySessionLogs),
          getTopQuestions: vi.fn().mockResolvedValue([])
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const data = await response.json();

      // Should limit conversation flows to 20 for performance
      expect(data.conversationFlows).toHaveLength(20);
      expect(data.stats.uniqueSessions).toBe(100); // But stats should be accurate
    });
  });

  describe('Data Export Functionality', () => {
    it('should generate comprehensive CSV export', async () => {
      const exportLogs: AnalyticsLog[] = [
        {
          id: 1,
          session_id: 'export_session_1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          text_snippet: 'Question with "quotes" and, commas',
          topic: 'sleep',
          language: 'th',
          line_clicked: true,
          routed: 'primary'
        },
        {
          id: 2,
          session_id: 'export_session_2',
          timestamp: new Date('2024-01-15T14:30:00Z'),
          text_snippet: 'Simple question',
          topic: 'diet',
          language: 'en',
          line_clicked: false,
          routed: 'fallback'
        }
      ];

      const exportQuestions = [
        { snippet: 'Question with quotes', count: 1, topic: 'sleep' }
      ];

      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockResolvedValue(exportLogs),
          getTopQuestions: vi.fn().mockResolvedValue(exportQuestions)
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/stats?format=csv&period=7d', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      
      const csvContent = await response.text();
      
      // Verify CSV structure
      expect(csvContent).toContain('Date,Session ID,Text Snippet,Topic,Language,LINE Clicked,Routed');
      expect(csvContent).toContain('export_session_1');
      expect(csvContent).toContain('export_session_2');
      expect(csvContent).toContain('""quotes""'); // Properly escaped quotes
      expect(csvContent).toContain('SUMMARY STATISTICS');
      expect(csvContent).toContain('Total Questions,2');
      expect(csvContent).toContain('TOP TOPICS');
      
      // Verify filename in Content-Disposition
      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('jirung-analytics-7d-');
      expect(disposition).toContain('.csv');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial data gracefully', async () => {
      // Simulate scenario where logs are available but top questions fail
      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockResolvedValue(createMockLogs(10)),
          getTopQuestions: vi.fn().mockRejectedValue(new Error('Top questions query failed'))
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(500); // Should fail gracefully
      
      const data = await response.json();
      expect(data.error).toBe('Internal Server Error');
    });

    it('should validate date ranges correctly', async () => {
      const logs = createMockLogs(50);
      
      vi.doMock('../../../../services/databaseService', () => ({
        getDatabase: vi.fn().mockResolvedValue({
          getAnalyticsLogs: vi.fn().mockImplementation((limit, offset, filters) => {
            // Verify that date filters are applied
            expect(filters?.dateFrom).toBeInstanceOf(Date);
            expect(filters?.dateTo).toBeInstanceOf(Date);
            expect(filters.dateFrom.getTime()).toBeLessThan(filters.dateTo.getTime());
            return Promise.resolve(logs);
          }),
          getTopQuestions: vi.fn().mockResolvedValue([])
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/stats?period=30d', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});