/**
 * Content Safety Utilities for Jirung Senior Advisor
 * 
 * This module provides content filtering and safety checking functions
 * to ensure appropriate responses and detect when LINE handoff is needed.
 */

import { ContentFilter, SafetyCheckResult, TopicCategory } from '../types';

// ============================================================================
// MEDICAL CONTENT KEYWORDS
// ============================================================================

export const MEDICAL_KEYWORDS = {
  th: [
    // Medications and treatments
    'ยา', 'เม็ด', 'แคปซูล', 'น้ำยา', 'ครีม', 'ยาฉีด', 'วิตามิน', 'แอสไพริน',
    'พาราเซตามอล', 'ยาแก้ปวด', 'ยาลดไข้', 'ยาเบาหวาน', 'ยาความดัน',
    
    // Medical conditions and symptoms
    'โรค', 'อาการ', 'ปวด', 'เจ็บ', 'ไข้', 'เลือด', 'หายใจ', 'ชัก', 'หมดสติ',
    'ความดัน', 'เบาหวาน', 'หัวใจ', 'ปอด', 'ไต', 'ตับ', 'กระดูก', 'ข้อ',
    'มะเร็ง', 'เนื้องอก', 'ติดเชื้อ', 'อักเสบ', 'แผล', 'บวม', 'คัน',
    
    // Medical procedures
    'ผ่าตัด', 'ฉีดยา', 'ตรวจเลือด', 'เอ็กซเรย์', 'อัลตราซาวด์', 'ใส่สาย',
    'ดูดเสมหะ', 'ล้างแผล', 'เย็บแผล', 'ถอดไส้', 'ใส่ท่อ',
    
    // Medical professionals
    'หมอ', 'แพทย์', 'พยาบาล', 'เภสัชกร', 'นักกายภาพ'
  ],
  en: [
    // Medications
    'medicine', 'medication', 'pill', 'tablet', 'capsule', 'drug', 'prescription',
    'aspirin', 'paracetamol', 'insulin', 'antibiotic', 'painkiller',
    
    // Medical conditions
    'disease', 'illness', 'condition', 'syndrome', 'disorder', 'infection',
    'cancer', 'tumor', 'diabetes', 'hypertension', 'heart', 'lung', 'kidney',
    'liver', 'bone', 'joint', 'blood', 'pressure', 'fever', 'pain',
    
    // Symptoms
    'symptom', 'ache', 'hurt', 'headache', 'bleeding', 'breathing', 'seizure', 'unconscious',
    'swelling', 'inflammation', 'wound', 'rash', 'itch',
    
    // Medical procedures
    'surgery', 'operation', 'injection', 'blood test', 'x-ray', 'scan',
    'treatment', 'therapy', 'procedure'
  ]
};

// ============================================================================
// EMERGENCY KEYWORDS
// ============================================================================

export const EMERGENCY_KEYWORDS = {
  th: [
    // Life-threatening situations
    'หมดสติ', 'ไม่รู้สึกตัว', 'หายใจไม่ออก', 'หายใจลำบาก', 'เจ็บหน้าอก',
    'ปวดหน้าอก', 'ชัก', 'ชักกระตุก', 'เลือดออก',
    'เลือดออกมาก', 'อาเจียนเลือด', 'ถ่ายเลือด', 'หน้าซีด', 'หน้าเขียว',
    
    // Severe pain or distress
    'ปวดมาก', 'เจ็บมาก', 'ทนไม่ไหว', 'ปวดแปลบ', 'ปวดร้าว',
    'ไข้สูง', 'ไข้สูงมาก', 'ร้อนมาก', 'เย็นมาก', 'สั่น', 'สั่นสะเทือน',
    
    // Behavioral emergencies
    'ประสาทหลอด', 'คลั่ง', 'โมโห', 'ก้าวร้าว', 'ทำร้าย', 'ฆ่าตัวตาย',
    'อยากตาย', 'หาทางตาย', 'ไม่อยากอยู่', 'เบื่อชีวิต',
    
    // Emergency numbers/services
    '1669', 'รถพยาบาล', 'โรงพยาบาล', 'ฉุกเฉิน', 'ด่วน'
  ],
  en: [
    // Life-threatening
    'unconscious', 'not breathing', 'difficulty breathing', 'chest pain',
    'heart attack', 'stroke', 'seizure', 'convulsion', 'falling down',
    'bleeding', 'blood loss', 'vomiting blood', 'pale', 'blue',
    
    // Severe symptoms
    'severe pain', 'excruciating', 'unbearable', 'high fever', 'very hot',
    'very cold', 'shaking', 'trembling', 'can\'t breathe', 'choking',
    
    // Behavioral emergencies
    'suicide', 'kill myself', 'want to die', 'end my life', 'aggressive',
    'violent', 'hurting', 'dangerous',
    
    // Emergency services
    'ambulance', 'emergency', 'hospital', 'urgent', '911', 'emergency room'
  ]
};

// ============================================================================
// COMPLEX TOPIC KEYWORDS (suggest LINE handoff)
// ============================================================================

export const COMPLEX_TOPIC_KEYWORDS = {
  th: [
    // Legal and financial
    'มรดก', 'ทรัพย์สิน', 'เงิน', 'หนี้', 'ประกัน', 'สิทธิ', 'กฎหมาย',
    'ทนาย', 'ศาล', 'ฟ้อง', 'สัญญา', 'พินัยกรรม',
    
    // Complex medical decisions
    'ผ่าตัด', 'รักษา', 'โรงพยาบาล', 'แพทย์', 'ตัดสินใจ', 'เลือก',
    'รักษาต่อ', 'หยุดรักษา', 'ค่ารักษา', 'ค่าใช้จ่าย',
    
    // Family conflicts
    'ทะเลาะ', 'โกรธ', 'ไม่เข้าใจกัน', 'ปัญหาครอบครัว', 'แบ่งแยก',
    'ไม่ช่วย', 'ทิ้ง', 'ไม่สนใจ', 'เหนื่อย', 'เครียด', 'ท้อ',
    
    // End-of-life care
    'ใกล้ตาย', 'จะตาย', 'สุดท้าย', 'ลาโลก', 'จากไป', 'เตรียมตัว'
  ],
  en: [
    // Legal and financial
    'inheritance', 'property', 'money', 'debt', 'insurance', 'legal', 'lawyer',
    'court', 'lawsuit', 'contract', 'will', 'estate',
    
    // Complex medical
    'surgery', 'treatment', 'hospital', 'doctor', 'decision', 'choose',
    'continue treatment', 'stop treatment', 'medical cost', 'expensive',
    
    // Family issues
    'fight', 'argue', 'angry', 'family problem', 'conflict', 'don\'t help',
    'abandon', 'ignore', 'tired', 'stressed', 'overwhelmed', 'burnout',
    
    // End-of-life
    'dying', 'death', 'end of life', 'final', 'goodbye', 'prepare'
  ]
};

// ============================================================================
// CONTENT SAFETY FUNCTIONS
// ============================================================================

/**
 * Checks if text contains medical content that requires disclaimer
 * @param text - Text to analyze
 * @returns boolean indicating if medical content is detected
 */
export function checkMedicalContent(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const lowerText = text.toLowerCase();
  
  // Check Thai medical keywords - be more careful about partial matches
  const hasThai = MEDICAL_KEYWORDS.th.some(keyword => {
    // For very short keywords like "ยา", be more strict to avoid false positives
    if (keyword === 'ยา') {
      // Don't match if it's part of words like "ยาก" (difficult)
      return lowerText.includes('ยา') && !lowerText.includes('ยาก');
    }
    return lowerText.includes(keyword);
  });
  
  // Check English medical keywords with word boundaries
  const hasEnglish = MEDICAL_KEYWORDS.en.some(keyword => {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
    return regex.test(lowerText);
  });
  
  return hasThai || hasEnglish;
}

/**
 * Checks if text contains emergency keywords requiring immediate attention
 * @param text - Text to analyze
 * @returns boolean indicating if emergency content is detected
 */
export function checkEmergencyKeywords(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const lowerText = text.toLowerCase();
  
  // Check Thai emergency keywords
  const hasThai = EMERGENCY_KEYWORDS.th.some(keyword => 
    lowerText.includes(keyword)
  );
  
  // Check English emergency keywords
  const hasEnglish = EMERGENCY_KEYWORDS.en.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  return hasThai || hasEnglish;
}

/**
 * Determines if LINE handoff should be suggested based on content complexity
 * @param text - Text to analyze
 * @returns boolean indicating if LINE handoff is recommended
 */
export function suggestLineHandoff(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const lowerText = text.toLowerCase();
  
  // Always suggest handoff for emergency situations
  if (checkEmergencyKeywords(text)) {
    return true;
  }
  
  // Check for complex topics
  const hasThaiComplex = COMPLEX_TOPIC_KEYWORDS.th.some(keyword => 
    lowerText.includes(keyword)
  );
  
  const hasEnglishComplex = COMPLEX_TOPIC_KEYWORDS.en.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  // Check for multiple medical keywords (indicates complex medical situation)
  const medicalKeywordCount = [
    ...MEDICAL_KEYWORDS.th.filter(keyword => lowerText.includes(keyword)),
    ...MEDICAL_KEYWORDS.en.filter(keyword => lowerText.includes(keyword.toLowerCase()))
  ].length;
  
  return hasThaiComplex || hasEnglishComplex || medicalKeywordCount >= 3;
}

/**
 * Performs comprehensive safety check on text content
 * @param text - Text to analyze
 * @returns SafetyCheckResult with detailed analysis
 */
export function performSafetyCheck(text: string): SafetyCheckResult {
  if (!text || typeof text !== 'string') {
    return {
      isSafe: true,
      flaggedCategories: [],
      recommendLineHandoff: false,
      emergencyDetected: false,
    };
  }

  const flaggedCategories: string[] = [];
  const emergencyDetected = checkEmergencyKeywords(text);
  const medicalContent = checkMedicalContent(text);
  const complexContent = suggestLineHandoff(text);

  if (emergencyDetected) {
    flaggedCategories.push('emergency');
  }
  
  if (medicalContent) {
    flaggedCategories.push('medical');
  }
  
  if (complexContent) {
    flaggedCategories.push('complex');
  }

  // Content is considered "safe" if it doesn't contain emergency keywords
  // Medical and complex content is allowed but flagged for appropriate handling
  const isSafe = !emergencyDetected;

  return {
    isSafe,
    flaggedCategories,
    recommendLineHandoff: emergencyDetected || complexContent,
    emergencyDetected,
  };
}

/**
 * Classifies text into topic categories based on keywords
 * @param text - Text to classify
 * @returns TopicCategory classification
 */
export function classifyTopic(text: string): TopicCategory {
  if (!text || typeof text !== 'string') {
    return 'general';
  }

  const lowerText = text.toLowerCase();

  // Emergency takes highest priority
  if (checkEmergencyKeywords(text)) {
    return 'emergency';
  }

  // Topic-specific keyword matching
  const topicKeywords = {
    alzheimer: ['อัลไซเมอร์', 'ความจำ', 'ลืม', 'สับสน', 'alzheimer', 'memory', 'forget', 'confusion', 'dementia'],
    fall: ['ล้ม', 'หกล้ม', 'ตก', 'fall', 'fell', 'slip', 'trip'],
    sleep: ['นอน', 'หลับ', 'นอนไม่หลับ', 'ฝันร้าย', 'sleep', 'insomnia', 'nightmare', 'rest'],
    diet: ['อาหาร', 'กิน', 'ดื่ม', 'น้ำ', 'อิ่ม', 'หิว', 'food', 'eat', 'drink', 'nutrition', 'meal'],
    night_care: ['กลางคืน', 'ค่ำ', 'ดึก', 'night', 'evening', 'midnight', 'late'],
    post_op: ['หลังผ่าตัด', 'แผล', 'ฟื้นตัว', 'surgery', 'operation', 'wound', 'recovery'],
    diabetes: ['เบาหวาน', 'น้ำตาล', 'diabetes', 'sugar', 'glucose', 'insulin'],
    mood: ['อารมณ์', 'เศร้า', 'เครียด', 'โกรธ', 'mood', 'sad', 'angry', 'stress', 'depression'],
    medication: ['ยา', 'เม็ด', 'medicine', 'medication', 'pill', 'drug', 'prescription']
  };

  // Find the topic with the most keyword matches
  let maxMatches = 0;
  let bestTopic: TopicCategory = 'general';

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestTopic = topic as TopicCategory;
    }
  });

  return maxMatches > 0 ? bestTopic : 'general';
}

/**
 * Content filter implementation matching the interface
 */
export const contentFilter: ContentFilter = {
  checkMedicalContent,
  checkEmergencyKeywords,
  suggestLineHandoff,
};

/**
 * Validates if content is appropriate for AI response
 * @param text - Text to validate
 * @returns boolean indicating if content is appropriate for AI handling
 */
export function isContentAppropriateForAI(text: string): boolean {
  const safetyCheck = performSafetyCheck(text);
  
  // AI should not handle emergency situations
  if (safetyCheck.emergencyDetected) {
    return false;
  }
  
  // AI can handle medical content with appropriate disclaimers
  // AI can handle complex content but should suggest LINE handoff
  return true;
}

/**
 * Gets appropriate response template based on content analysis
 * @param text - Text to analyze
 * @returns Response template type
 */
export function getResponseTemplate(text: string): 'emergency' | 'medical' | 'complex' | 'standard' {
  const safetyCheck = performSafetyCheck(text);
  
  if (safetyCheck.emergencyDetected) {
    return 'emergency';
  }
  
  if (safetyCheck.flaggedCategories.includes('medical')) {
    return 'medical';
  }
  
  if (safetyCheck.recommendLineHandoff) {
    return 'complex';
  }
  
  return 'standard';
}