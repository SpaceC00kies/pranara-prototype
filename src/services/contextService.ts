/**
 * Context Service for Jirung-specific information injection
 * 
 * This service detects when users are asking about Jirung specifically
 * and injects relevant context into the AI conversation.
 */

import { JIRUNG_KNOWLEDGE, getRelevantJirungInfo, isJirungQuery } from '../data/jirungKnowledge';

export interface ContextEnhancement {
  isJirungRelated: boolean;
  additionalContext?: string;
  enhancedPrompt?: string;
}

/**
 * Analyzes user message and enhances it with Jirung-specific context if needed
 */
export function enhanceWithJirungContext(userMessage: string): ContextEnhancement {
  const isJirungRelated = isJirungQuery(userMessage);
  
  if (!isJirungRelated) {
    return { isJirungRelated: false };
  }
  
  const additionalContext = getRelevantJirungInfo(userMessage);
  
  const enhancedPrompt = `
[บริบทเพิ่มเติมเกี่ยวกับศูนย์ดูแลจีรัง]
${additionalContext}

[คำถามจากผู้ใช้]
${userMessage}

กรุณาตอบคำถามโดยใช้ข้อมูลเกี่ยวกับศูนย์ดูแลจีรังที่ให้ไว้ข้างต้น และแสดงความภาคภูมิใจในการทำงานที่จีรังค่ะ`;

  return {
    isJirungRelated: true,
    additionalContext,
    enhancedPrompt
  };
}

// Note: getJirungSystemContext() has been moved to jirungKnowledge.ts as injectJirungContextForPrompt()

/**
 * Common Jirung-related questions and suggested responses
 */
export const JIRUNG_FAQ = {
  'จีรัง เวลเนสดีไหม': 'จีรัง เวลเนสเป็นศูนย์สุขภาพและความเป็นอยู่ที่ดีที่ให้การดูแลแบบครอบคลุมและอบอุ่นค่ะ เราเน้นการดูแลที่เข้าใจวัฒนธรรมไทยและมีทีมงานมืออาชีพที่พร้อมดูแลผู้สูงอายุด้วยความรักและความเข้าใจค่ะ',
  
  'จีรัง เวลเนสมีบริการอะไรบ้าง': 'จีรัง เวลเนสมีบริการครบครันตั้งแต่การดูแลประจำวัน บริการพยาบาล กิจกรรมบำบัด การดูแลผู้ป่วยอัลไซเมอร์ และบริการปรึกษาครอบครัวค่ะ',
  
  'ติดต่อจีรัง เวลเนสได้ยังไง': `สามารถติดต่อจีรัง เวลเนสได้ที่ โทรศัพท์: ${JIRUNG_KNOWLEDGE.contact.phone} หรืออีเมล: ${JIRUNG_KNOWLEDGE.contact.email} ค่ะ`
};