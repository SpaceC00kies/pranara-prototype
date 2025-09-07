/**
 * Fallback Response Service
 * Provides pre-written responses when AI service is unavailable
 */

import { TopicCategory, FallbackResponse } from '@/types';

/**
 * Pre-written fallback responses for common elder care topics
 */
const FALLBACK_RESPONSES: Record<TopicCategory, FallbackResponse> = {
  general: {
    topic: 'general',
    responses: {
      th: [
        'ขออภัยค่ะ ระบบมีปัญหาชั่วคราว แต่ดิฉันยังพร้อมช่วยเหลือคุณค่ะ\n\nสำหรับคำถามทั่วไปเกี่ยวกับการดูแลผู้สูงอายุ แนะนำให้:\n• สังเกตอาการและพฤติกรรมเปลี่ยนแปลง\n• รักษาสภาพแวดล้อมที่ปลอดภัย\n• ให้กำลังใจและความอบอุ่น\n\nหากต้องการคำแนะนำเฉพาะเจาะจง กรุณาคุยกับทีม Jirung ทาง LINE ค่ะ',
        
        'แม้ระบบจะมีปัญหา แต่ดิฉันขอแบ่งปันคำแนะนำพื้นฐานค่ะ\n\nการดูแลผู้สูงอายุที่ดี:\n• ให้ความรักและความเข้าใจ\n• ดูแลสุขภาพกายและใจ\n• สร้างกิจกรรมที่เหมาะสม\n• รักษาความปลอดภัย\n\nสำหรับคำแนะนำเฉพาะ กรุณาติดต่อทีม Jirung ทาง LINE ค่ะ'
      ],
      en: [
        'I apologize for the temporary system issue, but I\'m still here to help.\n\nFor general elder care questions, I recommend:\n• Monitor changes in behavior and symptoms\n• Maintain a safe environment\n• Provide emotional support and warmth\n\nFor specific guidance, please contact the Jirung team via LINE.',
        
        'Despite the system issue, let me share some basic guidance.\n\nGood elder care includes:\n• Love and understanding\n• Physical and mental health care\n• Appropriate activities\n• Safety maintenance\n\nFor specific advice, please contact the Jirung team via LINE.'
      ]
    }
  },

  alzheimer: {
    topic: 'alzheimer',
    responses: {
      th: [
        'สำหรับการดูแลผู้ป่วยอัลไซเมอร์ (แม้ระบบมีปัญหา):\n\n• สร้างกิจวัตรประจำวันที่ชัดเจน\n• ใช้คำพูดง่าย ๆ และชัดเจน\n• รักษาสภาพแวดล้อมที่คุ้นเคย\n• อดทนและให้กำลังใจ\n\n⚠️ หากมีอาการรุนแรง กรุณาติดต่อแพทย์\nสำหรับคำแนะนำเฉพาะ คุยกับทีม Jirung ทาง LINE ค่ะ'
      ],
      en: [
        'For Alzheimer\'s care (despite system issues):\n\n• Create clear daily routines\n• Use simple, clear language\n• Maintain familiar environment\n• Be patient and encouraging\n\n⚠️ Contact doctor for severe symptoms\nFor specific advice, contact Jirung team via LINE.'
      ]
    }
  },

  fall: {
    topic: 'fall',
    responses: {
      th: [
        'การป้องกันการล้มของผู้สูงอายุ:\n\n• ติดราวจับในห้องน้ำและบันได\n• เก็บของกีดขวางออกจากทางเดิน\n• ใช้รองเท้าที่มีพื้นกันลื่น\n• ติดไฟส่องสว่างเพียงพอ\n\n🚨 หากล้มแล้ว: ตรวจสอบการบาดเจ็บ หากมีอาการผิดปกติ โทร 1669\nคุยกับทีม Jirung ทาง LINE สำหรับคำแนะนำเพิ่มเติมค่ะ'
      ],
      en: [
        'Fall prevention for elderly:\n\n• Install grab bars in bathroom and stairs\n• Remove obstacles from walkways\n• Use non-slip shoes\n• Ensure adequate lighting\n\n🚨 If fallen: Check for injuries, call 1669 if abnormal symptoms\nContact Jirung team via LINE for additional guidance.'
      ]
    }
  },

  sleep: {
    topic: 'sleep',
    responses: {
      th: [
        'การปรับปรุงการนอนหลับของผู้สูงอายุ:\n\n• ตื่นนอนเวลาเดิมทุกวัน\n• หลีกเลี่ยงคาเฟอีนหลัง 14:00\n• ออกกำลังกายเบา ๆ ในตอนเช้า\n• สร้างบรรยากาศห้องนอนที่เงียบและมืด\n\n💤 หากนอนไม่หลับเรื้อรัง ควรปรึกษาแพทย์\nคุยกับทีม Jirung ทาง LINE สำหรับคำแนะนำเฉพาะค่ะ'
      ],
      en: [
        'Improving elderly sleep:\n\n• Wake up at the same time daily\n• Avoid caffeine after 2 PM\n• Light exercise in the morning\n• Create quiet, dark bedroom environment\n\n💤 Consult doctor for chronic insomnia\nContact Jirung team via LINE for specific advice.'
      ]
    }
  },

  diet: {
    topic: 'diet',
    responses: {
      th: [
        'คำแนะนำอาหารสำหรับผู้สูงอายุ:\n\n• ดื่มน้ำเพียงพอ 6-8 แก้วต่อวัน\n• รับประทานผลไม้และผักหลากสี\n• เลือกโปรตีนคุณภาพดี เช่น ปลา ไข่\n• หลีกเลี่ยงอาหารเค็ม หวาน มัน จัด\n\n🍎 หากมีโรคประจำตัว ควรปรึกษาแพทย์หรือนักโภชนาการ\nคุยกับทีม Jirung ทาง LINE สำหรับแผนอาหารเฉพาะค่ะ'
      ],
      en: [
        'Nutrition advice for elderly:\n\n• Drink adequate water 6-8 glasses daily\n• Eat colorful fruits and vegetables\n• Choose quality protein like fish, eggs\n• Avoid excessive salt, sugar, fat\n\n🍎 Consult doctor/nutritionist for chronic conditions\nContact Jirung team via LINE for specific meal plans.'
      ]
    }
  },

  night_care: {
    topic: 'night_care',
    responses: {
      th: [
        'การดูแลผู้สูงอายุในเวลากลางคืน:\n\n• ติดไฟกลางคืนในทางเดินและห้องน้ำ\n• เตรียมอุปกรณ์ฉุกเฉินไว้ใกล้เตียง\n• ตรวจเช็คทุก 2-3 ชั่วโมงหากจำเป็น\n• รักษาอุณหภูมิห้องให้เหมาะสม\n\n🌙 หากมีอาการผิดปกติกลางคืน โทร 1669\nคุยกับทีม Jirung ทาง LINE สำหรับแผนดูแลกลางคืนค่ะ'
      ],
      en: [
        'Nighttime elderly care:\n\n• Install night lights in hallways and bathroom\n• Keep emergency supplies near bed\n• Check every 2-3 hours if necessary\n• Maintain comfortable room temperature\n\n🌙 Call 1669 for abnormal nighttime symptoms\nContact Jirung team via LINE for nighttime care plans.'
      ]
    }
  },

  post_op: {
    topic: 'post_op',
    responses: {
      th: [
        'การดูแลหลังผ่าตัด (คำแนะนำทั่วไป):\n\n• ทำความสะอาดแผลตามคำแนะนำแพทย์\n• รับประทานยาตรงเวลา\n• พักผ่อนเพียงพอ หลีกเลี่ยงกิจกรรมหนัก\n• สังเกตอาการแผลติดเชื้อ\n\n⚠️ ต้องปฏิบัติตามคำแนะนำแพทย์เป็นหลัก\nคุยกับทีม Jirung ทาง LINE สำหรับการดูแลเฉพาะค่ะ'
      ],
      en: [
        'Post-operative care (general advice):\n\n• Clean wound as per doctor\'s instructions\n• Take medication on time\n• Get adequate rest, avoid heavy activities\n• Watch for signs of infection\n\n⚠️ Follow doctor\'s instructions primarily\nContact Jirung team via LINE for specific care.'
      ]
    }
  },

  diabetes: {
    topic: 'diabetes',
    responses: {
      th: [
        'การดูแลผู้สูงอายุเบาหวาน (คำแนะนำทั่วไป):\n\n• ตรวจน้ำตาลตามที่แพทย์กำหนด\n• รับประทานอาหารตรงเวลา\n• ออกกำลังกายเบา ๆ สม่ำเสมอ\n• ดูแลเท้าให้สะอาดและแห้ง\n\n⚠️ ต้องปฏิบัติตามคำแนะนำแพทย์เป็นหลัก\nคุยกับทีม Jirung ทาง LINE สำหรับแผนดูแลเฉพาะค่ะ'
      ],
      en: [
        'Elderly diabetes care (general advice):\n\n• Check blood sugar as prescribed\n• Eat meals on time\n• Regular light exercise\n• Keep feet clean and dry\n\n⚠️ Follow doctor\'s instructions primarily\nContact Jirung team via LINE for specific care plans.'
      ]
    }
  },

  mood: {
    topic: 'mood',
    responses: {
      th: [
        'การดูแลสุขภาพจิตผู้สูงอายุ:\n\n• ให้เวลาและความสนใจ\n• สนทนาและฟังอย่างตั้งใจ\n• สร้างกิจกรรมที่สนุกสนาน\n• รักษาการติดต่อกับเพื่อนฝูง\n\n💚 หากมีอาการซึมเศร้าหรือวิตกกังวลมาก ควรปรึกษาแพทย์\nคุยกับทีม Jirung ทาง LINE สำหรับคำแนะนำเฉพาะค่ะ'
      ],
      en: [
        'Elderly mental health care:\n\n• Give time and attention\n• Listen and talk attentively\n• Create enjoyable activities\n• Maintain social connections\n\n💚 Consult doctor for severe depression or anxiety\nContact Jirung team via LINE for specific guidance.'
      ]
    }
  },

  medication: {
    topic: 'medication',
    responses: {
      th: [
        'การจัดการยาสำหรับผู้สูงอายุ:\n\n• ใช้กล่องยาแบ่งตามวันและเวลา\n• ตั้งเตือนเวลารับประทานยา\n• เก็บยาในที่แห้งและเย็น\n• ตรวจสอบวันหมดอายุสม่ำเสมอ\n\n⚠️ ห้ามเปลี่ยนแปลงยาโดยไม่ปรึกษาแพทย์\nคุยกับทีม Jirung ทาง LINE สำหรับระบบจัดการยาค่ะ'
      ],
      en: [
        'Medication management for elderly:\n\n• Use pill organizer by day and time\n• Set medication reminders\n• Store in cool, dry place\n• Check expiration dates regularly\n\n⚠️ Never change medication without consulting doctor\nContact Jirung team via LINE for medication management systems.'
      ]
    }
  },

  emergency: {
    topic: 'emergency',
    responses: {
      th: [
        '🚨 สถานการณ์ฉุกเฉิน:\n\nโทรเลย: 1669 (ฉุกเฉิน) หรือ 1646 (สายด่วนผู้สูงอายุ)\n\nขณะรอความช่วยเหลือ:\n• รักษาความสงบ\n• ตรวจสอบการหายใจและชีพจร\n• ไม่เคลื่อนย้ายผู้ป่วยหากสงสัยกระดูกหัก\n• บันทึกอาการและเวลา\n\nคุยกับทีม Jirung ทาง LINE หลังสถานการณ์คลี่คลายค่ะ'
      ],
      en: [
        '🚨 Emergency situation:\n\nCall immediately: 1669 (Emergency) or 1646 (Elderly hotline)\n\nWhile waiting for help:\n• Stay calm\n• Check breathing and pulse\n• Don\'t move patient if fracture suspected\n• Record symptoms and time\n\nContact Jirung team via LINE after situation resolves.'
      ]
    }
  }
};

/**
 * Get fallback response for a specific topic
 */
export function getFallbackResponse(
  topic: TopicCategory, 
  language: 'th' | 'en' = 'th'
): string {
  const fallback = FALLBACK_RESPONSES[topic] || FALLBACK_RESPONSES.general;
  const responses = fallback.responses[language];
  
  // Return random response from available options
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

/**
 * Get all available fallback topics
 */
export function getAvailableFallbackTopics(): TopicCategory[] {
  return Object.keys(FALLBACK_RESPONSES) as TopicCategory[];
}

/**
 * Check if fallback is available for a topic
 */
export function hasFallbackForTopic(topic: TopicCategory): boolean {
  return topic in FALLBACK_RESPONSES;
}

/**
 * Get emergency fallback response
 */
export function getEmergencyFallback(language: 'th' | 'en' = 'th'): string {
  return getFallbackResponse('emergency', language);
}

/**
 * Determine if a topic should trigger emergency fallback
 */
export function shouldUseEmergencyFallback(message: string): boolean {
  const emergencyKeywords = {
    th: [
      'หมดสติ', 'หายใจไม่ออก', 'เจ็บหน้าอก', 'ชัก', 'ล้ม', 'เลือดออก',
      'ไข้สูง', 'ปวดหัวรุนแรง', 'อาเจียนเลือด', 'ท้องเสีย', 'หน้าเบี้ยว',
      'พูดไม่ได้', 'เดินไม่ได้', 'ปวดท้องรุนแรง', 'หายใจหอบ'
    ],
    en: [
      'unconscious', 'can\'t breathe', 'chest pain', 'seizure', 'fell', 'bleeding',
      'high fever', 'severe headache', 'vomiting blood', 'diarrhea', 'face drooping',
      'can\'t speak', 'can\'t walk', 'severe abdominal pain', 'difficulty breathing'
    ]
  };

  const lowerMessage = message.toLowerCase();
  
  return [...emergencyKeywords.th, ...emergencyKeywords.en].some(keyword =>
    lowerMessage.includes(keyword.toLowerCase())
  );
}

/**
 * Enhanced fallback service with context awareness
 */
export class FallbackService {
  private static instance: FallbackService;
  private fallbackUsageCount: Map<TopicCategory, number> = new Map();

  static getInstance(): FallbackService {
    if (!FallbackService.instance) {
      FallbackService.instance = new FallbackService();
    }
    return FallbackService.instance;
  }

  /**
   * Get contextual fallback response
   */
  getContextualFallback(
    topic: TopicCategory,
    language: 'th' | 'en' = 'th',
    conversationLength: number = 1,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _previousTopics: TopicCategory[] = []
  ): string {
    // Track usage
    const currentCount = this.fallbackUsageCount.get(topic) || 0;
    this.fallbackUsageCount.set(topic, currentCount + 1);

    // Check for emergency
    if (topic === 'emergency') {
      return getEmergencyFallback(language);
    }

    // Get base fallback
    let response = getFallbackResponse(topic, language);

    // Add contextual information for longer conversations
    if (conversationLength > 3) {
      const contextualNote = language === 'th' 
        ? '\n\nเนื่องจากเราได้คุยกันมาสักพักแล้ว หากต้องการคำแนะนำเฉพาะเจาะจงมากขึ้น แนะนำให้คุยกับทีม Jirung ทาง LINE ค่ะ'
        : '\n\nSince we\'ve been chatting for a while, for more specific advice, I recommend contacting the Jirung team via LINE.';
      
      response += contextualNote;
    }

    // Add variety for repeated topics
    if (currentCount > 1) {
      const varietyNote = language === 'th'
        ? '\n\nหากคำแนะนำนี้ไม่ตรงกับสถานการณ์ของคุณ กรุณาอธิบายรายละเอียดเพิ่มเติมหรือติดต่อทีม Jirung ทาง LINE ค่ะ'
        : '\n\nIf this advice doesn\'t match your situation, please provide more details or contact the Jirung team via LINE.';
      
      response += varietyNote;
    }

    return response;
  }

  /**
   * Get fallback usage statistics
   */
  getUsageStats(): Record<TopicCategory, number> {
    const stats: Record<string, number> = {};
    this.fallbackUsageCount.forEach((count, topic) => {
      stats[topic] = count;
    });
    return stats as Record<TopicCategory, number>;
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.fallbackUsageCount.clear();
  }
}

export default FallbackService;