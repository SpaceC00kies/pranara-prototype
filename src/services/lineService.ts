/**
 * LINE Integration Service
 * Handles LINE URL configuration, handoff logic, and click tracking
 */

import { TopicCategory } from '../types';

// LINE URL configuration
export interface LineConfig {
  url: string;
  isEnabled: boolean;
}

/**
 * Get LINE configuration from environment variables
 */
export function getLineConfig(): LineConfig {
  const lineUrl = process.env.LINE_URL || process.env.NEXT_PUBLIC_LINE_URL;
  
  return {
    url: lineUrl || '',
    isEnabled: Boolean(lineUrl && lineUrl.trim() !== '')
  };
}

/**
 * Validate LINE URL format
 */
export function validateLineUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check for valid LINE URL patterns
  const lineUrlPatterns = [
    /^https:\/\/line\.me\/ti\/p\/[a-zA-Z0-9@._-]+$/,  // LINE official account
    /^https:\/\/line\.me\/R\/ti\/p\/[a-zA-Z0-9@._-]+$/, // LINE QR code
    /^https:\/\/liff\.line\.me\/[0-9]+-[a-zA-Z0-9]+$/, // LINE Front-end Framework
    /^https:\/\/lin\.ee\/[a-zA-Z0-9]+$/ // LINE short URL
  ];

  return lineUrlPatterns.some(pattern => pattern.test(url));
}

/**
 * Topics that should trigger LINE handoff recommendations
 */
const LINE_HANDOFF_TOPICS: TopicCategory[] = [
  'emergency',
  'medication',
  'post_op',
  'diabetes'
];

/**
 * Keywords that suggest complex situations requiring human assistance
 */
const COMPLEX_SITUATION_KEYWORDS = {
  th: [
    'ไม่รู้จะทำยังไง',
    'ช่วยไม่ได้',
    'หมดหนทาง',
    'ซับซ้อน',
    'ยุ่งยาก',
    'ไม่เข้าใจ',
    'งงมาก',
    'ปัญหาใหญ่',
    'เครียดมาก',
    'ต้องการคนช่วย'
  ],
  en: [
    'don\'t know what to do',
    'can\'t help',
    'complex',
    'complicated',
    'confused',
    'need help',
    'stressed',
    'overwhelmed',
    'urgent'
  ]
};

/**
 * Emergency keywords that require immediate LINE handoff
 */
const EMERGENCY_KEYWORDS = {
  th: [
    'ฉุกเฉิน',
    'หมดสติ',
    'หายใจไม่ออก',
    'เจ็บหน้าอก',
    'ชัก',
    'เลือดออก',
    'ล้มหนัก',
    'ไม่รู้สึกตัว',
    'ปวดหน้าอกรุนแรง',
    'หายใจลำบาก'
  ],
  en: [
    'emergency',
    'unconscious',
    'can\'t breathe',
    'chest pain',
    'seizure',
    'bleeding',
    'severe pain',
    'breathing difficulty'
  ]
};

/**
 * Determine if LINE handoff should be recommended based on message content
 */
export function shouldRecommendLineHandoff(
  message: string,
  topic: TopicCategory,
  conversationLength: number = 1
): {
  shouldRecommend: boolean;
  reason: 'emergency' | 'complex_topic' | 'complex_language' | 'long_conversation' | 'none';
  urgency: 'high' | 'medium' | 'low';
} {
  const lowerMessage = message.toLowerCase();

  // Check for emergency keywords (highest priority)
  const hasEmergencyKeywords = [
    ...EMERGENCY_KEYWORDS.th,
    ...EMERGENCY_KEYWORDS.en
  ].some(keyword => lowerMessage.includes(keyword.toLowerCase()));

  if (hasEmergencyKeywords) {
    return {
      shouldRecommend: true,
      reason: 'emergency',
      urgency: 'high'
    };
  }

  // Check for topics that typically require human assistance
  if (LINE_HANDOFF_TOPICS.includes(topic)) {
    return {
      shouldRecommend: true,
      reason: 'complex_topic',
      urgency: 'medium'
    };
  }

  // Check for complex situation keywords
  const hasComplexKeywords = [
    ...COMPLEX_SITUATION_KEYWORDS.th,
    ...COMPLEX_SITUATION_KEYWORDS.en
  ].some(keyword => lowerMessage.includes(keyword.toLowerCase()));

  if (hasComplexKeywords) {
    return {
      shouldRecommend: true,
      reason: 'complex_language',
      urgency: 'medium'
    };
  }

  // Recommend LINE handoff for long conversations (5+ messages)
  if (conversationLength >= 5) {
    return {
      shouldRecommend: true,
      reason: 'long_conversation',
      urgency: 'low'
    };
  }

  return {
    shouldRecommend: false,
    reason: 'none',
    urgency: 'low'
  };
}

/**
 * Generate contextual LINE handoff message based on situation
 */
export function generateLineHandoffMessage(
  reason: 'emergency' | 'complex_topic' | 'complex_language' | 'long_conversation' | 'none',
  urgency: 'high' | 'medium' | 'low',
  language: 'th' | 'en' = 'th'
): string {
  const messages = {
    th: {
      emergency: 'สถานการณ์นี้อาจต้องการความช่วยเหลือเร่งด่วน กรุณาติดต่อทีม Jirung ทาง LINE ทันที หรือโทร 1669 หากเป็นเหตุฉุกเฉิน',
      complex_topic: 'เรื่องนี้ค่อนข้างซับซ้อน ทีม Jirung สามารถให้คำแนะนำเฉพาะเจาะจงมากขึ้น',
      complex_language: 'ดูเหมือนว่าคุณกำลังเผชิญกับสถานการณ์ที่ยุ่งยาก ทีม Jirung พร้อมช่วยเหลือคุณ',
      long_conversation: 'คุณได้สอบถามหลายเรื่องแล้ว ทีม Jirung สามารถให้คำปรึกษาแบบเจาะลึกมากขึ้น',
      none: 'หากต้องการความช่วยเหลือเพิ่มเติม คุยกับทีม Jirung ทาง LINE'
    },
    en: {
      emergency: 'This situation may require urgent assistance. Please contact the Jirung team via LINE immediately or call 1669 for emergencies.',
      complex_topic: 'This topic is quite complex. The Jirung team can provide more specific guidance.',
      complex_language: 'It seems you\'re facing a challenging situation. The Jirung team is ready to help you.',
      long_conversation: 'You\'ve asked several questions. The Jirung team can provide more in-depth consultation.',
      none: 'If you need additional assistance, chat with the Jirung team via LINE'
    }
  };

  return messages[language][reason] || messages[language].none;
}

/**
 * Build LINE URL with tracking parameters
 */
export function buildLineUrlWithTracking(
  baseUrl: string,
  sessionId: string,
  topic: TopicCategory,
  reason: string
): string {
  if (!baseUrl) {
    return '';
  }

  try {
    const url = new URL(baseUrl);
    
    // Add tracking parameters (if the LINE URL supports them)
    // Note: Most LINE URLs don't support query parameters, but we can try
    const trackingParams = {
      source: 'jirung_ai',
      session: sessionId.substring(0, 8), // First 8 chars for privacy
      topic: topic,
      reason: reason
    };

    // Only add parameters if it's a LIFF URL (which supports them)
    if (url.hostname === 'liff.line.me') {
      Object.entries(trackingParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  } catch (error) {
    console.error('Error building LINE URL with tracking:', error);
    return baseUrl; // Return original URL if there's an error
  }
}

/**
 * Client-side LINE URL configuration
 */
export function getClientLineConfig(): LineConfig {
  // In client-side, we use NEXT_PUBLIC_ prefixed environment variables
  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL;
  
  return {
    url: lineUrl || '',
    isEnabled: Boolean(lineUrl && lineUrl.trim() !== '')
  };
}

/**
 * Open LINE URL with proper tracking
 */
export function openLineUrl(
  sessionId: string,
  topic: TopicCategory,
  reason: string,
  onTrackingComplete?: () => void
): void {
  const config = getClientLineConfig();
  
  if (!config.isEnabled) {
    console.error('LINE integration is not configured');
    return;
  }

  const trackingUrl = buildLineUrlWithTracking(
    config.url,
    sessionId,
    topic,
    reason
  );

  // Track the click before opening
  if (onTrackingComplete) {
    onTrackingComplete();
  }

  // Open LINE URL
  window.open(trackingUrl, '_blank', 'noopener,noreferrer');
}