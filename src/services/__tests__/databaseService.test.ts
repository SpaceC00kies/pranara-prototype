/**
 * Unit tests for Database Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService, createDatabaseService } from '../databaseService';
import { AnalyticsEvent } from '../../types';

// Mock environment variables
const mockEnv = {
  KV_URL: 'mock-kv-url',
  DATABASE_URL: 'mock-postgres-url'
};

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (dbService) {
      await dbService.disconnect();
    }
  });

  describe('KV Database', () => {
    beforeEach(() => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: mockEnv.KV_URL
      });
    });

    it('should initialize KV database service', async () => {
      await dbService.connect();
      expect(await dbService.isHealthy()).toBe(true);
    });

    it('should store analytics event in KV', async () => {
      await dbService.connect();
      
      const event: AnalyticsEvent = {
        sessionId: 'session123',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        textSnippet: 'test message',
        topic: 'sleep',
        language: 'th',
        lineClicked: false,
        routed: 'primary'
      };

      // Should not throw
      await expect(dbService.storeAnalyticsEvent(event)).resolves.not.toThrow();
    });

    it('should retrieve analytics logs from KV', async () => {
      await dbService.connect();
      
      const logs = await dbService.getAnalyticsLogs(10, 0);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should get usage stats from KV', async () => {
      await dbService.connect();
      
      const stats = await dbService.getUsageStats();
      expect(stats).toBeDefined();
      expect(stats.totalQuestions).toBe(0); // Mock returns empty
      expect(stats.uniqueSessions).toBe(0);
    });

    it('should get top questions from KV', async () => {
      await dbService.connect();
      
      const topQuestions = await dbService.getTopQuestions(5);
      expect(Array.isArray(topQuestions)).toBe(true);
    });
  });

  describe('Postgres Database', () => {
    beforeEach(() => {
      dbService = new DatabaseService({
        type: 'postgres',
        postgresUrl: mockEnv.DATABASE_URL
      });
    });

    it('should initialize Postgres database service', async () => {
      await dbService.connect();
      expect(await dbService.isHealthy()).toBe(true);
    });

    it('should initialize schema for Postgres', async () => {
      await dbService.connect();
      
      // Should not throw
      await expect(dbService.initializeSchema()).resolves.not.toThrow();
    });

    it('should store analytics event in Postgres', async () => {
      await dbService.connect();
      
      const event: AnalyticsEvent = {
        sessionId: 'session123',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        textSnippet: 'test message',
        topic: 'sleep',
        language: 'th',
        lineClicked: false,
        routed: 'primary'
      };

      // Should not throw
      await expect(dbService.storeAnalyticsEvent(event)).resolves.not.toThrow();
    });

    it('should retrieve analytics logs from Postgres with filters', async () => {
      await dbService.connect();
      
      const filters = {
        topic: 'sleep',
        language: 'th',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-02')
      };
      
      const logs = await dbService.getAnalyticsLogs(10, 0, filters);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('Database Factory', () => {
    it('should create KV service when KV_URL is available', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, KV_URL: 'test-kv-url' };
      
      const service = createDatabaseService();
      expect(service).toBeInstanceOf(DatabaseService);
      
      process.env = originalEnv;
    });

    it('should create Postgres service when DATABASE_URL is available', () => {
      const originalEnv = process.env;
      process.env = { 
        ...originalEnv, 
        DATABASE_URL: 'test-postgres-url',
        KV_URL: undefined 
      };
      
      const service = createDatabaseService();
      expect(service).toBeInstanceOf(DatabaseService);
      
      process.env = originalEnv;
    });

    it('should default to KV when no URLs are provided', () => {
      const originalEnv = process.env;
      process.env = { 
        ...originalEnv, 
        KV_URL: undefined,
        DATABASE_URL: undefined 
      };
      
      const service = createDatabaseService();
      expect(service).toBeInstanceOf(DatabaseService);
      
      process.env = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should throw error when storing without connection', async () => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: mockEnv.KV_URL
      });
      
      const event: AnalyticsEvent = {
        sessionId: 'session123',
        timestamp: new Date(),
        textSnippet: 'test',
        topic: 'general',
        language: 'th',
        lineClicked: false,
        routed: 'primary'
      };

      await expect(dbService.storeAnalyticsEvent(event)).rejects.toThrow('Database not connected');
    });

    it('should throw error when retrieving without connection', async () => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: mockEnv.KV_URL
      });

      await expect(dbService.getAnalyticsLogs()).rejects.toThrow('Database not connected');
    });

    it('should handle connection failures gracefully', async () => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: '' // Invalid URL
      });

      await expect(dbService.connect()).rejects.toThrow();
    });

    it('should return false for health check when disconnected', async () => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: mockEnv.KV_URL
      });

      expect(await dbService.isHealthy()).toBe(false);
    });
  });

  describe('Data Conversion', () => {
    beforeEach(async () => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: mockEnv.KV_URL
      });
      await dbService.connect();
    });

    it('should handle date filtering correctly', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-02');
      
      const logs = await dbService.getAnalyticsLogs(10, 0, { dateFrom, dateTo });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const page1 = await dbService.getAnalyticsLogs(5, 0);
      const page2 = await dbService.getAnalyticsLogs(5, 5);
      
      expect(Array.isArray(page1)).toBe(true);
      expect(Array.isArray(page2)).toBe(true);
    });
  });

  describe('Analytics Aggregation', () => {
    beforeEach(async () => {
      dbService = new DatabaseService({
        type: 'postgres',
        postgresUrl: mockEnv.DATABASE_URL
      });
      await dbService.connect();
    });

    it('should calculate usage stats with date range', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      
      const stats = await dbService.getUsageStats(dateFrom, dateTo);
      expect(stats).toBeDefined();
      expect(stats.totalQuestions).toBeGreaterThanOrEqual(0);
      expect(stats.uniqueSessions).toBeGreaterThanOrEqual(0);
    });

    it('should get top questions with correct format', async () => {
      const topQuestions = await dbService.getTopQuestions(5);
      
      expect(Array.isArray(topQuestions)).toBe(true);
      topQuestions.forEach(question => {
        expect(question).toHaveProperty('snippet');
        expect(question).toHaveProperty('count');
        expect(question).toHaveProperty('topic');
        expect(typeof question.snippet).toBe('string');
        expect(typeof question.count).toBe('number');
        expect(typeof question.topic).toBe('string');
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple connect calls gracefully', async () => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: mockEnv.KV_URL
      });

      await dbService.connect();
      await dbService.connect(); // Second call should not throw
      
      expect(await dbService.isHealthy()).toBe(true);
    });

    it('should handle disconnect properly', async () => {
      dbService = new DatabaseService({
        type: 'postgres',
        postgresUrl: mockEnv.DATABASE_URL
      });

      await dbService.connect();
      expect(await dbService.isHealthy()).toBe(true);
      
      await dbService.disconnect();
      expect(await dbService.isHealthy()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      dbService = new DatabaseService({
        type: 'kv',
        kvUrl: mockEnv.KV_URL
      });

      // Should not throw
      await expect(dbService.disconnect()).resolves.not.toThrow();
    });
  });
});