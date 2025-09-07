/**
 * Admin Stats API Route Tests
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getDatabase } from '../../../../../services/databaseService';
import { AnalyticsLog } from '../../../../../types';
import { vi } from 'vitest';

// Mock the database service
vi.mock('../../../../../services/databaseService');
const mockGetDatabase = getDatabase as ReturnType<typeof vi.mocked>;

// Mock environment variables
const originalEnv = process.env;

describe('/api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockLogs: AnalyticsLog[] = [
    {
      id: 1,
      session_id: 'session1',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      text_snippet: 'How to care for elderly with diabetes?',
      topic: 'diabetes',
      language: 'en',
      line_clicked: false,
      routed: 'primary'
    },
    {
      id: 2,
      session_id: 'session1',
      timestamp: new Date('2024-01-15T10:05:00Z'),
      text_snippet: 'What foods should they avoid?',
      topic: 'diet',
      language: 'en',
      line_clicked: true,
      routed: 'primary'
    },
    {
      id: 3,
      session_id: 'session2',
      timestamp: new Date('2024-01-15T14:30:00Z'),
      text_snippet: 'ผู้สูงอายุนอนไม่หลับ ทำอย่างไร',
      topic: 'sleep',
      language: 'th',
      line_clicked: false,
      routed: 'primary'
    }
  ];

  const mockTopQuestions = [
    { snippet: 'How to care for elderly?', count: 5, topic: 'general' },
    { snippet: 'Sleep problems in elderly', count: 3, topic: 'sleep' }
  ];

  const mockDatabase = {
    getAnalyticsLogs: vi.fn().mockResolvedValue(mockLogs),
    getTopQuestions: vi.fn().mockResolvedValue(mockTopQuestions)
  };

  describe('Authentication', () => {
    it('should return 401 when no admin password is set', async () => {
      delete process.env.ADMIN_PASSWORD;

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when no authorization header is provided', async () => {
      process.env.ADMIN_PASSWORD = 'test123';

      const request = new NextRequest('http://localhost:3000/api/admin/stats');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 when invalid authorization format is provided', async () => {
      process.env.ADMIN_PASSWORD = 'test123';

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Invalid format' }
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 when wrong password is provided', async () => {
      process.env.ADMIN_PASSWORD = 'correct123';

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer wrong123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should authenticate successfully with correct password', async () => {
      process.env.ADMIN_PASSWORD = 'test123';
      mockGetDatabase.mockResolvedValue(mockDatabase as any);

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Data Retrieval', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'test123';
      mockGetDatabase.mockResolvedValue(mockDatabase as any);
    });

    it('should return analytics data with default 7d period', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('7d');
      expect(data.stats).toBeDefined();
      expect(data.topQuestions).toEqual(mockTopQuestions);
      expect(data.conversationFlows).toBeDefined();
      expect(data.commonPatterns).toBeDefined();
      expect(data.hourlyDistribution).toBeDefined();
      expect(data.dailyTrends).toBeDefined();
      expect(data.sessionAnalytics).toBeDefined();
    });

    it('should handle different time periods', async () => {
      const periods = ['1d', '7d', '30d', '90d'];

      for (const period of periods) {
        const request = new NextRequest(`http://localhost:3000/api/admin/stats?period=${period}`, {
          headers: { 'Authorization': 'Bearer test123' }
        });

        const response = await GET(request);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.period).toBe(period);
      }
    });

    it('should calculate correct usage statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.stats.totalQuestions).toBe(3);
      expect(data.stats.uniqueSessions).toBe(2);
      expect(data.stats.lineClickRate).toBeCloseTo(33.33, 1); // 1 out of 3 clicked
      expect(data.stats.topTopics).toHaveLength(3);
    });

    it('should calculate session analytics correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.sessionAnalytics.averageQuestionsPerSession).toBe(1.5); // 3 questions / 2 sessions
      expect(data.sessionAnalytics.conversionRate).toBe(50); // 1 session with LINE click out of 2
      expect(data.sessionAnalytics.abandonmentRate).toBe(50); // 1 single-question session out of 2
    });

    it('should calculate hourly distribution', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.hourlyDistribution).toBeDefined();
      expect(data.hourlyDistribution['10']).toBe(2); // Two questions at 10:00
      expect(data.hourlyDistribution['14']).toBe(1); // One question at 14:30
    });

    it('should calculate daily trends', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.dailyTrends).toBeDefined();
      expect(Array.isArray(data.dailyTrends)).toBe(true);
      
      const jan15Data = data.dailyTrends.find((day: any) => day.date === '2024-01-15');
      expect(jan15Data).toBeDefined();
      expect(jan15Data.questions).toBe(3);
      expect(jan15Data.uniqueSessions).toBe(2);
      expect(jan15Data.lineClicks).toBe(1);
    });
  });

  describe('CSV Export', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'test123';
      mockGetDatabase.mockResolvedValue(mockDatabase as any);
    });

    it('should return CSV format when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats?format=csv', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');

      const csvContent = await response.text();
      expect(csvContent).toContain('Date,Session ID,Text Snippet,Topic,Language,LINE Clicked,Routed');
      expect(csvContent).toContain('diabetes');
      expect(csvContent).toContain('sleep');
      expect(csvContent).toContain('SUMMARY STATISTICS');
    });

    it('should include proper CSV escaping for quotes', async () => {
      const logsWithQuotes: AnalyticsLog[] = [
        {
          id: 1,
          session_id: 'session1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          text_snippet: 'Question with "quotes" in it',
          topic: 'general',
          language: 'en',
          line_clicked: false,
          routed: 'primary'
        }
      ];

      mockDatabase.getAnalyticsLogs.mockResolvedValue(logsWithQuotes);

      const request = new NextRequest('http://localhost:3000/api/admin/stats?format=csv', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      const csvContent = await response.text();
      
      expect(csvContent).toContain('""quotes""'); // Properly escaped quotes
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'test123';
    });

    it('should handle database connection errors', async () => {
      mockGetDatabase.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Internal Server Error');
      expect(data.details).toContain('Database connection failed');
    });

    it('should handle database query errors', async () => {
      const errorDatabase = {
        getAnalyticsLogs: jest.fn().mockRejectedValue(new Error('Query failed')),
        getTopQuestions: jest.fn().mockResolvedValue([])
      };

      mockGetDatabase.mockResolvedValue(errorDatabase as any);

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(500);
    });

    it('should handle empty data gracefully', async () => {
      const emptyDatabase = {
        getAnalyticsLogs: jest.fn().mockResolvedValue([]),
        getTopQuestions: jest.fn().mockResolvedValue([])
      };

      mockGetDatabase.mockResolvedValue(emptyDatabase as any);

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats.totalQuestions).toBe(0);
      expect(data.stats.uniqueSessions).toBe(0);
      expect(data.topQuestions).toEqual([]);
    });
  });

  describe('Data Validation', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'test123';
      mockGetDatabase.mockResolvedValue(mockDatabase as any);
    });

    it('should handle invalid period parameter gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats?period=invalid', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('invalid'); // Should still work, defaults to 7d logic
    });

    it('should validate date ranges correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats?period=30d', {
        headers: { 'Authorization': 'Bearer test123' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      // Verify that getAnalyticsLogs was called with correct date range
      expect(mockDatabase.getAnalyticsLogs).toHaveBeenCalledWith(
        1000,
        0,
        expect.objectContaining({
          dateFrom: expect.any(Date),
          dateTo: expect.any(Date)
        })
      );
    });
  });
});