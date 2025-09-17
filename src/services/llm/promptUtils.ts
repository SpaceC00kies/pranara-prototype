/**
 * Prompt Utilities for Jirung Senior Advisor
 * SIMPLIFIED - Let Gemini handle natural conversation
 */

import { TopicCategory, UserProfile, AppMode } from '../../types';
import { isJirungQuery, getRelevantJirungInfo } from '../../data/jirungKnowledge';

/**
 * Builds a simple user prompt with minimal interference
 * Let Gemini's intelligence handle the conversation naturally
 */
export function buildUserPrompt(
  userMessage: string,
  topic: TopicCategory = 'general',
  language: 'th' | 'en' = 'th',
  userProfile?: UserProfile,
  mode: AppMode = 'conversation',
  conversationContext?: {
    recentMessages?: Array<{ text: string, sender: 'user' | 'assistant' }>;
    recentResponsePatterns?: string[];
    conversationLength?: number;
    emotionalJourney?: string;
    providedConcepts?: string[];
  }
): string {
  let prompt = '';

  // Add emotional journey context for deeper conversations
  if (conversationContext?.emotionalJourney) {
    prompt += `Emotional Context: ${conversationContext.emotionalJourney}\n`;
  }

  // Add concepts already provided to prevent repetition
  if (conversationContext?.providedConcepts && conversationContext.providedConcepts.length > 0) {
    prompt += `Previous advice given: ${conversationContext.providedConcepts.slice(-5).join(', ')}. `;
    prompt += `Offer fresh, distinct perspectives or actions. Avoid repeating these concepts.\n`;
  }

  // Add conversation history if available (simple and clean)
  if (conversationContext?.recentMessages && conversationContext.recentMessages.length > 0) {
    prompt += 'Recent conversation:\n';
    conversationContext.recentMessages.forEach(msg => {
      prompt += `${msg.sender === 'user' ? 'User' : 'Pranara'}: ${msg.text}\n`;
    });
    prompt += '\n';
  }

  // Add Jirung context ONLY when user specifically asks about Jirung
  if (isJirungQuery(userMessage)) {
    const jirungInfo = getRelevantJirungInfo(userMessage);
    if (jirungInfo) {
      prompt += jirungInfo + '\n\n';
    }
  }

  // Simple user message
  prompt += `User: ${userMessage}`;

  return prompt;
}

/**
 * Gets appropriate disclaimer for response based on topic and mode
 * SIMPLIFIED - Only for serious wellness topics that need gentle guidance
 */
export function getResponseDisclaimer(
  topic: TopicCategory,
  language: 'th' | 'en' = 'th',
  mode: AppMode = 'conversation'
): string {
  // Only gentle disclaimers for mental health topics
  if (topic === 'mental_health' && language === 'th') {
    return 'นี่เป็นการสนับสนุนจากใจ หากรู้สึกกังวลมากควรปรึกษาผู้เชี่ยวชาญด้วยนะคะ';
  }

  if (topic === 'stress' && language === 'th') {
    return 'คำแนะนำเหล่านี้เป็นแนวทางทั่วไป หากเครียดมากจนส่งผลต่อชีวิตประจำวัน ควรขอความช่วยเหลือเพิ่มเติมค่ะ';
  }

  // No disclaimers for most wellness conversations
  return '';
}

/**
 * Validates and sanitizes user input before creating prompts
 */
export function validateUserInput(userMessage: string): string | null {
  if (!userMessage || typeof userMessage !== 'string') {
    return null;
  }

  const trimmed = userMessage.trim();

  // Check minimum length
  if (trimmed.length < 2) {
    return null;
  }

  // Check maximum length (prevent abuse)
  if (trimmed.length > 1000) {
    return trimmed.substring(0, 1000);
  }

  return trimmed;
}

/**
 * Formats Thai text response with proper paragraph breaks
 */
export function formatThaiTextResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let formatted = text.trim();

  // Preserve paragraph breaks (double line breaks) but clean up single line breaks
  formatted = formatted.replace(/\n{3,}/g, '\n\n'); // Multiple line breaks -> double line break
  formatted = formatted.replace(/([^\n])\n([^\n])/g, '$1 $2'); // Single line breaks -> space
  
  // Remove extra spaces but preserve paragraph structure
  formatted = formatted.replace(/[ \t]{2,}/g, ' '); // Multiple spaces -> single space
  formatted = formatted.replace(/[ \t]*\n[ \t]*/g, '\n'); // Clean spaces around line breaks

  // Remove extra spaces around Thai punctuation
  formatted = formatted.replace(/\s+([,.!?ๆฯ])/g, '$1');
  formatted = formatted.replace(/([,.!?ๆฯ])\s{2,}/g, '$1 ');

  return formatted.trim();
}