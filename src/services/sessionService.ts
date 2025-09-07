/**
 * Session Management Service
 * Handles session ID generation, validation, and lifecycle management
 */

import { UserSession, SessionMetrics } from '../types';
import { randomBytes } from 'crypto';

// Session configuration
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_ID_LENGTH = 32;

/**
 * Generate a cryptographically secure session ID
 */
export function generateSessionId(): string {
  return randomBytes(SESSION_ID_LENGTH).toString('hex');
}

/**
 * Create a new user session
 */
export function createSession(language: 'th' | 'en' = 'th'): UserSession {
  const now = new Date();
  
  return {
    id: generateSessionId(),
    createdAt: now,
    lastActivity: now,
    messageCount: 0,
    language
  };
}

/**
 * Validate session ID format
 */
export function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Check if it's a valid hex string of correct length
  const hexPattern = /^[a-f0-9]+$/i;
  return sessionId.length === SESSION_ID_LENGTH * 2 && hexPattern.test(sessionId);
}

/**
 * Check if a session is still active (not expired)
 */
export function isSessionActive(session: UserSession): boolean {
  const now = new Date();
  const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
  return timeSinceLastActivity <= SESSION_TIMEOUT_MS;
}

/**
 * Update session activity timestamp
 */
export function updateSessionActivity(session: UserSession): UserSession {
  return {
    ...session,
    lastActivity: new Date(),
    messageCount: session.messageCount + 1
  };
}

/**
 * Calculate session duration in minutes
 */
export function getSessionDuration(session: UserSession): number {
  const durationMs = session.lastActivity.getTime() - session.createdAt.getTime();
  return Math.round(durationMs / (1000 * 60));
}

/**
 * Extract language from user input (simple heuristic)
 */
export function detectLanguage(text: string): 'th' | 'en' {
  // Simple Thai character detection
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text) ? 'th' : 'en';
}

/**
 * Create session hash for privacy-safe storage
 * Uses first 8 characters of session ID for analytics
 */
export function createSessionHash(sessionId: string): string {
  if (!isValidSessionId(sessionId)) {
    throw new Error('Invalid session ID provided');
  }
  
  return sessionId.substring(0, 8);
}

/**
 * Session cleanup utility - identify expired sessions
 */
export function isSessionExpired(session: UserSession): boolean {
  return !isSessionActive(session);
}

/**
 * Calculate basic session metrics from session array
 */
export function calculateSessionMetrics(sessions: UserSession[]): SessionMetrics {
  const activeSessions = sessions.filter(isSessionActive);
  const totalDuration = sessions.reduce((sum, session) => sum + getSessionDuration(session), 0);
  
  // Count languages
  const languageCounts = sessions.reduce((counts, session) => {
    counts[session.language] = (counts[session.language] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  return {
    totalSessions: sessions.length,
    activeSessions: activeSessions.length,
    averageSessionLength: sessions.length > 0 ? totalDuration / sessions.length : 0,
    topLanguages: languageCounts
  };
}