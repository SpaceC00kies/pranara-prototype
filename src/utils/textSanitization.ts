/**
 * Text Sanitization Utilities for Jirung Senior Advisor
 * 
 * This module combines PII scrubbing and content safety utilities
 * to provide comprehensive text processing for analytics logging.
 */

import { scrubPII, createSafeSnippet, sanitizeForAnalytics } from './piiScrubber';
import { performSafetyCheck, classifyTopic, getResponseTemplate } from './contentSafety';
import { PIIScrubbingResult, SafetyCheckResult, TopicCategory } from '../types';

// ============================================================================
// COMBINED TEXT PROCESSING RESULT
// ============================================================================

export interface TextProcessingResult {
  // Original input
  originalText: string;
  
  // PII scrubbing results
  piiResult: PIIScrubbingResult;
  safeSnippet: string;
  analyticsText: string;
  
  // Content safety results
  safetyResult: SafetyCheckResult;
  topic: TopicCategory;
  responseTemplate: 'emergency' | 'medical' | 'complex' | 'standard';
  
  // Processing metadata
  isReadyForLogging: boolean;
  requiresHumanReview: boolean;
  processingTimestamp: Date;
}

// ============================================================================
// MAIN PROCESSING FUNCTIONS
// ============================================================================

/**
 * Processes text for analytics logging with comprehensive safety checks
 * @param text - Original user input text
 * @param maxSnippetLength - Maximum length for analytics snippet (default: 160)
 * @returns Complete text processing result
 */
export function processTextForAnalytics(
  text: string, 
  maxSnippetLength: number = 160
): TextProcessingResult {
  const processingTimestamp = new Date();
  
  // Handle empty or invalid input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      originalText: text || '',
      piiResult: {
        scrubbedText: '',
        foundPatterns: [],
        isClean: true,
      },
      safeSnippet: '',
      analyticsText: '',
      safetyResult: {
        isSafe: true,
        flaggedCategories: [],
        recommendLineHandoff: false,
        emergencyDetected: false,
      },
      topic: 'general',
      responseTemplate: 'standard',
      isReadyForLogging: false,
      requiresHumanReview: false,
      processingTimestamp,
    };
  }

  // Perform PII scrubbing
  const piiResult = scrubPII(text);
  const safeSnippet = createSafeSnippet(text, maxSnippetLength);
  const analyticsText = sanitizeForAnalytics(text);
  
  // Perform content safety analysis
  const safetyResult = performSafetyCheck(text);
  const topic = classifyTopic(text);
  const responseTemplate = getResponseTemplate(text);
  
  // Determine if text is ready for logging
  const isReadyForLogging = piiResult.isClean && safetyResult.isSafe;
  
  // Determine if human review is required
  const requiresHumanReview = 
    safetyResult.emergencyDetected || 
    safetyResult.flaggedCategories.includes('complex') ||
    piiResult.foundPatterns.length >= 2; // Multiple PII patterns detected
  
  return {
    originalText: text,
    piiResult,
    safeSnippet,
    analyticsText,
    safetyResult,
    topic,
    responseTemplate,
    isReadyForLogging,
    requiresHumanReview,
    processingTimestamp,
  };
}

/**
 * Creates a safe analytics log entry from processed text
 * @param processedText - Result from processTextForAnalytics
 * @param sessionId - User session identifier
 * @param language - Detected or specified language
 * @returns Safe analytics log object
 */
export function createAnalyticsLogEntry(
  processedText: TextProcessingResult,
  sessionId: string,
  language: 'th' | 'en' = 'th'
) {
  return {
    session_id: sessionId,
    timestamp: processedText.processingTimestamp,
    text_snippet: processedText.safeSnippet,
    topic: processedText.topic,
    language: language,
    line_clicked: false, // Will be updated when LINE is clicked
    routed: processedText.requiresHumanReview ? 'human_review' : 'primary',
    safety_flags: processedText.safetyResult.flaggedCategories.join(','),
    pii_detected: !processedText.piiResult.isClean,
    emergency_detected: processedText.safetyResult.emergencyDetected,
  };
}

/**
 * Validates text before AI processing
 * @param text - Text to validate
 * @returns Validation result with recommendations
 */
export function validateTextForAIProcessing(text: string): {
  isValid: boolean;
  shouldProcess: boolean;
  recommendLineHandoff: boolean;
  emergencyDetected: boolean;
  validationMessage?: string;
} {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      isValid: false,
      shouldProcess: false,
      recommendLineHandoff: false,
      emergencyDetected: false,
      validationMessage: 'Empty or invalid input',
    };
  }

  const processed = processTextForAnalytics(text);
  
  // Emergency content should not be processed by AI
  if (processed.safetyResult.emergencyDetected) {
    return {
      isValid: true,
      shouldProcess: false,
      recommendLineHandoff: true,
      emergencyDetected: true,
      validationMessage: 'Emergency content detected - requires immediate human attention',
    };
  }
  
  // Complex content can be processed but should suggest handoff
  if (processed.safetyResult.recommendLineHandoff) {
    return {
      isValid: true,
      shouldProcess: true,
      recommendLineHandoff: true,
      emergencyDetected: false,
      validationMessage: 'Complex content - AI can respond but suggest LINE handoff',
    };
  }
  
  // Standard content is safe for AI processing
  return {
    isValid: true,
    shouldProcess: true,
    recommendLineHandoff: false,
    emergencyDetected: false,
  };
}

/**
 * Batch processes multiple texts for analytics
 * @param texts - Array of texts to process
 * @param sessionId - Session identifier
 * @param language - Language for all texts
 * @returns Array of analytics log entries
 */
export function batchProcessTextsForAnalytics(
  texts: string[],
  sessionId: string,
  language: 'th' | 'en' = 'th'
) {
  return texts
    .filter(text => text && text.trim().length > 0)
    .map(text => {
      const processed = processTextForAnalytics(text);
      return createAnalyticsLogEntry(processed, sessionId, language);
    })
    .filter(entry => entry.text_snippet.length > 0); // Only include non-empty entries
}

/**
 * Gets processing statistics for monitoring
 * @param processedTexts - Array of processed text results
 * @returns Processing statistics
 */
export function getProcessingStatistics(processedTexts: TextProcessingResult[]) {
  const total = processedTexts.length;
  
  if (total === 0) {
    return {
      total: 0,
      piiDetected: 0,
      emergencyDetected: 0,
      humanReviewRequired: 0,
      readyForLogging: 0,
      topTopics: [],
      piiDetectionRate: 0,
      emergencyRate: 0,
      humanReviewRate: 0,
    };
  }

  const piiDetected = processedTexts.filter(p => !p.piiResult.isClean).length;
  const emergencyDetected = processedTexts.filter(p => p.safetyResult.emergencyDetected).length;
  const humanReviewRequired = processedTexts.filter(p => p.requiresHumanReview).length;
  const readyForLogging = processedTexts.filter(p => p.isReadyForLogging).length;
  
  // Count topics
  const topicCounts: Record<string, number> = {};
  processedTexts.forEach(p => {
    topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
  });
  
  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count, percentage: (count / total) * 100 }));

  return {
    total,
    piiDetected,
    emergencyDetected,
    humanReviewRequired,
    readyForLogging,
    topTopics,
    piiDetectionRate: (piiDetected / total) * 100,
    emergencyRate: (emergencyDetected / total) * 100,
    humanReviewRate: (humanReviewRequired / total) * 100,
  };
}