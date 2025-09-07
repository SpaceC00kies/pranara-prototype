/**
 * Unit tests for Session Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSessionId,
  createSession,
  isValidSessionId,
  isSessionActive,
  updateSessionActivity,
  getSessionDuration,
  detectLanguage,
  createSessionHash,
  isSessionExpired,
  calculateSessionMetrics
} from '../sessionService';
import { UserSession } from '../../types';

describe('SessionService', () => {
  describe('generateSessionId', () => {
    it('should generate a valid session ID', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(64); // 32 bytes * 2 (hex)
      expect(/^[a-f0-9]+$/i.test(sessionId)).toBe(true);
    });

    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createSession', () => {
    it('should create a session with default Thai language', () => {
      const session = createSession();
      
      expect(session.id).toBeDefined();
      expect(session.language).toBe('th');
      expect(session.messageCount).toBe(0);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivity).toBeInstanceOf(Date);
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(session.lastActivity.getTime());
    });

    it('should create a session with specified language', () => {
      const session = createSession('en');
      expect(session.language).toBe('en');
    });

    it('should create sessions with unique IDs', () => {
      const session1 = createSession();
      const session2 = createSession();
      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('isValidSessionId', () => {
    it('should validate correct session IDs', () => {
      const validId = generateSessionId();
      expect(isValidSessionId(validId)).toBe(true);
    });

    it('should reject invalid session IDs', () => {
      expect(isValidSessionId('')).toBe(false);
      expect(isValidSessionId('short')).toBe(false);
      expect(isValidSessionId('invalid-characters-!')).toBe(false);
      expect(isValidSessionId('a'.repeat(63))).toBe(false); // Wrong length
      expect(isValidSessionId('g'.repeat(64))).toBe(false); // Invalid hex
    });

    it('should handle null and undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidSessionId(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidSessionId(undefined as any)).toBe(false);
    });
  });

  describe('isSessionActive', () => {
    it('should return true for recent sessions', () => {
      const session = createSession();
      expect(isSessionActive(session)).toBe(true);
    });

    it('should return false for expired sessions', () => {
      const session = createSession();
      // Set last activity to 31 minutes ago (beyond 30-minute timeout)
      session.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      expect(isSessionActive(session)).toBe(false);
    });

    it('should return true for sessions at the timeout boundary', () => {
      const session = createSession();
      // Set last activity to exactly 30 minutes ago
      session.lastActivity = new Date(Date.now() - 30 * 60 * 1000);
      expect(isSessionActive(session)).toBe(true);
    });
  });

  describe('updateSessionActivity', () => {
    it('should update last activity and increment message count', () => {
      const originalSession = createSession();
      const originalTime = originalSession.lastActivity.getTime();
      const originalCount = originalSession.messageCount;

      // Wait a bit to ensure timestamp difference
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      const updatedSession = updateSessionActivity(originalSession);

      expect(updatedSession.lastActivity.getTime()).toBeGreaterThan(originalTime);
      expect(updatedSession.messageCount).toBe(originalCount + 1);
      expect(updatedSession.id).toBe(originalSession.id);
      expect(updatedSession.createdAt).toBe(originalSession.createdAt);

      vi.useRealTimers();
    });

    it('should not mutate the original session', () => {
      const originalSession = createSession();
      const originalCount = originalSession.messageCount;
      
      updateSessionActivity(originalSession);
      
      expect(originalSession.messageCount).toBe(originalCount);
    });
  });

  describe('getSessionDuration', () => {
    it('should calculate duration correctly', () => {
      const session = createSession();
      session.createdAt = new Date('2024-01-01T10:00:00Z');
      session.lastActivity = new Date('2024-01-01T10:15:00Z');

      const duration = getSessionDuration(session);
      expect(duration).toBe(15); // 15 minutes
    });

    it('should handle zero duration', () => {
      const session = createSession();
      const duration = getSessionDuration(session);
      expect(duration).toBe(0);
    });

    it('should round to nearest minute', () => {
      const session = createSession();
      session.createdAt = new Date('2024-01-01T10:00:00Z');
      session.lastActivity = new Date('2024-01-01T10:02:30Z'); // 2.5 minutes

      const duration = getSessionDuration(session);
      expect(duration).toBe(3); // Rounded up
    });
  });

  describe('detectLanguage', () => {
    it('should detect Thai language', () => {
      expect(detectLanguage('สวัสดี')).toBe('th');
      expect(detectLanguage('ผู้สูงอายุ')).toBe('th');
      expect(detectLanguage('Hello สวัสดี')).toBe('th'); // Mixed content
    });

    it('should detect English language', () => {
      expect(detectLanguage('Hello')).toBe('en');
      expect(detectLanguage('How are you?')).toBe('en');
      expect(detectLanguage('123 numbers')).toBe('en');
    });

    it('should handle empty strings', () => {
      expect(detectLanguage('')).toBe('en'); // Default to English
    });
  });

  describe('createSessionHash', () => {
    it('should create hash from valid session ID', () => {
      const sessionId = generateSessionId();
      const hash = createSessionHash(sessionId);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(8);
      expect(hash).toBe(sessionId.substring(0, 8));
    });

    it('should throw error for invalid session ID', () => {
      expect(() => createSessionHash('invalid')).toThrow('Invalid session ID provided');
    });
  });

  describe('isSessionExpired', () => {
    it('should return true for expired sessions', () => {
      const session = createSession();
      session.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      expect(isSessionExpired(session)).toBe(true);
    });

    it('should return false for active sessions', () => {
      const session = createSession();
      expect(isSessionExpired(session)).toBe(false);
    });
  });

  describe('calculateSessionMetrics', () => {
    let sessions: UserSession[];

    beforeEach(() => {
      const now = new Date();
      sessions = [
        {
          id: 'session1',
          createdAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
          lastActivity: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago (active)
          messageCount: 5,
          language: 'th'
        },
        {
          id: 'session2',
          createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          lastActivity: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago (active)
          messageCount: 3,
          language: 'en'
        },
        {
          id: 'session3',
          createdAt: new Date(now.getTime() - 60 * 60 * 1000), // 60 minutes ago
          lastActivity: new Date(now.getTime() - 31 * 60 * 1000), // 31 minutes ago (expired)
          messageCount: 2,
          language: 'th'
        }
      ];
    });

    it('should calculate metrics correctly', () => {
      const metrics = calculateSessionMetrics(sessions);

      expect(metrics.totalSessions).toBe(3);
      expect(metrics.activeSessions).toBe(2); // Only first two are active
      expect(metrics.averageSessionLength).toBe((10 + 20 + 29) / 3); // Average duration
      expect(metrics.topLanguages).toEqual({ th: 2, en: 1 });
    });

    it('should handle empty session array', () => {
      const metrics = calculateSessionMetrics([]);

      expect(metrics.totalSessions).toBe(0);
      expect(metrics.activeSessions).toBe(0);
      expect(metrics.averageSessionLength).toBe(0);
      expect(metrics.topLanguages).toEqual({});
    });

    it('should handle single session', () => {
      const singleSession = [sessions[0]];
      const metrics = calculateSessionMetrics(singleSession);

      expect(metrics.totalSessions).toBe(1);
      expect(metrics.activeSessions).toBe(1);
      expect(metrics.averageSessionLength).toBe(10);
      expect(metrics.topLanguages).toEqual({ th: 1 });
    });
  });
});