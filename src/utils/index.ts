/**
 * Utility Functions Index for Jirung Senior Advisor
 * 
 * Exports all utility functions for PII scrubbing, content safety,
 * and text sanitization.
 */

// PII Scrubbing utilities
export {
  PII_PATTERNS,
  REPLACEMENT_TOKENS,
  scrubPII,
  createSafeSnippet,
  isTextSafeForLogging,
  sanitizeForAnalytics,
  detectPIIPatterns,
} from './piiScrubber';

// Content Safety utilities
export {
  MEDICAL_KEYWORDS,
  EMERGENCY_KEYWORDS,
  COMPLEX_TOPIC_KEYWORDS,
  checkMedicalContent,
  checkEmergencyKeywords,
  suggestLineHandoff,
  performSafetyCheck,
  classifyTopic,
  contentFilter,
  isContentAppropriateForAI,
  getResponseTemplate,
} from './contentSafety';

// Combined Text Sanitization utilities
export {
  processTextForAnalytics,
  createAnalyticsLogEntry,
  validateTextForAIProcessing,
  batchProcessTextsForAnalytics,
  getProcessingStatistics,
} from './textSanitization';

// Re-export types for convenience
export type {
  TextProcessingResult,
} from './textSanitization';

export type {
  PIIScrubbingResult,
  SafetyCheckResult,
} from '../types';