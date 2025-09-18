/**
 * Utility Functions Index for Jirung Senior Advisor
 * 
 * Exports all utility functions for content safety,
 * and text sanitization.
 */

// PII scrubbing removed - keeping system simple

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

// Text sanitization removed - keeping system simple

export type {
  SafetyCheckResult,
} from '../types';