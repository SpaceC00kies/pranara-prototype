/**
 * PII Scrubbing Utilities for Jirung Senior Advisor
 * 
 * This module provides functions to detect and mask personally identifiable information (PII)
 * from user input before logging for analytics. Includes Thai-specific patterns.
 */

import { PIIPatterns, PIIReplacementTokens, PIIScrubbingResult } from '../types';

// ============================================================================
// PII PATTERNS - Thai-specific and international
// ============================================================================

export const PII_PATTERNS: PIIPatterns = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Thai phone numbers (more specific patterns) - check first
  thaiPhone: /\b0[0-9]{8,9}\b/g,
  
  // General phone numbers (6+ digits) - but exclude Thai ID numbers
  phone: /\b(?!0[0-9]{8,9}\b)\d{6,12}\b/g,
  
  // URLs (http/https)
  url: /https?:\/\/[^\s]+/g,
  
  // Thai ID numbers (13 digits) - more specific pattern
  thaiId: /\b\d{1}-\d{4}-\d{5}-\d{2}-\d{1}\b|\b\d{13}\b/g,
  
  // LINE IDs (starting with @)
  lineId: /@[a-zA-Z0-9._-]+/g,
};

export const REPLACEMENT_TOKENS: PIIReplacementTokens = {
  email: '[EMAIL]',
  phone: '[PHONE]',
  thaiPhone: '[PHONE]',
  url: '[URL]',
  thaiId: '[ID]',
  lineId: '[LINE_ID]',
};

// ============================================================================
// ADDITIONAL THAI-SPECIFIC PII PATTERNS
// ============================================================================

// Thai name patterns (common titles and patterns)
const THAI_NAME_PATTERNS = [
  /(คุณ|นาย|นาง|นางสาว|ดร\.|ศ\.|รศ\.|ผศ\.)\s*[ก-๙]+/g,
  /[ก-๙]{2,}\s+(นะครับ|ครับ|ค่ะ|คะ)/g,
];

// Thai address patterns
const THAI_ADDRESS_PATTERNS = [
  /\d+\/\d+\s*หมู่\s*\d+/g, // House number/sub-number Moo X
  /ซอย\s*[ก-๙a-zA-Z0-9\s]+/g, // Soi (lane) names
  /ถนน\s*[ก-๙a-zA-Z0-9\s]+/g, // Road names
  /ตำบล\s*[ก-๙]+/g, // Sub-district
  /อำเภอ\s*[ก-๙]+/g, // District
  /จังหวัด\s*[ก-๙]+/g, // Province
];

// ============================================================================
// CORE PII SCRUBBING FUNCTIONS
// ============================================================================

/**
 * Scrubs PII from text using predefined patterns
 * @param text - Input text to scrub
 * @returns PIIScrubbingResult with scrubbed text and metadata
 */
export function scrubPII(text: string): PIIScrubbingResult {
  if (!text || typeof text !== 'string') {
    return {
      scrubbedText: '',
      foundPatterns: [],
      isClean: true,
    };
  }

  let scrubbedText = text;
  const foundPatterns: string[] = [];

  // Apply standard PII patterns
  Object.entries(PII_PATTERNS).forEach(([patternName, pattern]) => {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      foundPatterns.push(patternName);
      const token = REPLACEMENT_TOKENS[patternName as keyof PIIReplacementTokens];
      scrubbedText = scrubbedText.replace(pattern, token);
    }
  });

  // Apply Thai-specific name patterns
  THAI_NAME_PATTERNS.forEach((pattern, index) => {
    const matches = scrubbedText.match(pattern);
    if (matches && matches.length > 0) {
      foundPatterns.push(`thai_name_${index}`);
      scrubbedText = scrubbedText.replace(pattern, '[NAME]');
    }
  });

  // Apply Thai address patterns
  THAI_ADDRESS_PATTERNS.forEach((pattern, index) => {
    const matches = scrubbedText.match(pattern);
    if (matches && matches.length > 0) {
      foundPatterns.push(`thai_address_${index}`);
      scrubbedText = scrubbedText.replace(pattern, '[ADDRESS]');
    }
  });

  return {
    scrubbedText: scrubbedText.trim(),
    foundPatterns: [...new Set(foundPatterns)], // Remove duplicates
    isClean: foundPatterns.length === 0,
  };
}

/**
 * Creates a safe text snippet for analytics logging
 * Limits length and ensures no PII leakage
 * @param text - Original text
 * @param maxLength - Maximum length for snippet (default: 160)
 * @returns Safe text snippet
 */
export function createSafeSnippet(text: string, maxLength: number = 160): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // First scrub PII
  const { scrubbedText } = scrubPII(text);
  
  // Truncate to safe length
  if (scrubbedText.length <= maxLength) {
    return scrubbedText;
  }

  // Find a good breaking point (word boundary)
  const truncated = scrubbedText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Validates if text is safe for logging (no PII detected)
 * @param text - Text to validate
 * @returns boolean indicating if text is safe
 */
export function isTextSafeForLogging(text: string): boolean {
  const { isClean } = scrubPII(text);
  return isClean;
}

/**
 * Sanitizes text for analytics while preserving meaning
 * More aggressive than scrubPII for sensitive contexts
 * @param text - Text to sanitize
 * @returns Sanitized text safe for analytics
 */
export function sanitizeForAnalytics(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;

  // First apply standard PII scrubbing
  const { scrubbedText } = scrubPII(text);
  sanitized = scrubbedText;

  // Additional sanitization for analytics
  // Remove potential personal references (Thai doesn't use word boundaries like English)
  sanitized = sanitized.replace(/(ฉัน|กู|เรา|ผม|ดิฉัน|หนู)/g, '[PERSON]');
  sanitized = sanitized.replace(/\b(I|me|my|we|us|our)\b/gi, '[PERSON]');
  
  // Remove specific ages that might be identifying (do this before family terms)
  sanitized = sanitized.replace(/(อายุ\s*\d{1,3}\s*ปี|\d{1,3}\s*years?\s*old)/gi, '[AGE]');
  
  // Remove family relationship terms that might be identifying
  sanitized = sanitized.replace(/(แม่|พ่อ|ลูก|หลาน|ปู่|ย่า|ตา|ยาย|น้า|ป้า|อา|น้อง|พี่)/g, '[FAMILY]');
  sanitized = sanitized.replace(/\b(mother|father|mom|dad|son|daughter|grandpa|grandma|uncle|aunt|brother|sister)\b/gi, '[FAMILY]');

  return sanitized.trim();
}

/**
 * Checks if text contains potential PII patterns
 * Useful for validation before processing
 * @param text - Text to check
 * @returns Array of detected PII pattern types
 */
export function detectPIIPatterns(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detectedPatterns: string[] = [];

  Object.entries(PII_PATTERNS).forEach(([patternName, pattern]) => {
    if (pattern.test(text)) {
      detectedPatterns.push(patternName);
    }
  });

  // Check Thai-specific patterns
  THAI_NAME_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(text)) {
      detectedPatterns.push(`thai_name_${index}`);
    }
  });

  THAI_ADDRESS_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(text)) {
      detectedPatterns.push(`thai_address_${index}`);
    }
  });

  return [...new Set(detectedPatterns)];
}