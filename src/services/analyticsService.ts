/**
 * Analytics Service
 * Handles PII-safe data collection, topic classification, and conversation flow tracking
 */

import { 
  AnalyticsEvent, 
  AnalyticsLog, 
  TopicCategory, 
  TopicAnalytics, 
  UsageStats,
  TopicClassificationResult,
  AgeRange,
  Gender,
  Location
} from '../types';
import { scrubPII } from '../utils/piiScrubber';
import { createSessionHash } from './sessionService';

// Topic classification keywords
const TOPIC_KEYWORDS: Record<TopicCategory, { th: string[], en: string[] }> = {
  alzheimer: {
    th: ['อัลไซเมอร์', 'ความจำ', 'ลืม', 'สับสน', 'จำไม่ได้', 'หลงลืม', 'สมองเสื่อม'],
    en: ['alzheimer', 'memory', 'forget', 'confusion', 'dementia', 'cognitive']
  },
  fall: {
    th: ['ล้ม', 'หกล้ม', 'ลื่น', 'เดิน', 'ขาอ่อน', 'เซ', 'ไม่มั่นคง', 'ดุลยภาพ'],
    en: ['fall', 'slip', 'balance', 'walking', 'unsteady', 'dizzy', 'weak legs']
  },
  sleep: {
    th: ['นอน', 'หลับ', 'นอนไม่หลับ', 'ตื่น', 'ฝันร้าย', 'กรน', 'นอนกลางวัน'],
    en: ['sleep', 'insomnia', 'wake up', 'nightmare', 'snoring', 'nap', 'rest']
  },
  diet: {
    th: ['อาหาร', 'กิน', 'น้ำ', 'หิว', 'อิ่ม', 'ลดน้ำหนัก', 'โภชนาการ', 'วิตามิน'],
    en: ['food', 'eat', 'drink', 'nutrition', 'diet', 'vitamin', 'meal', 'appetite']
  },
  night_care: {
    th: ['กลางคืน', 'ดึก', 'ตื่นกลางคืน', 'ห้องน้ำ', 'กลัวมืด', 'นอนคนเดียว'],
    en: ['night', 'midnight', 'bathroom', 'dark', 'alone', 'evening care']
  },
  post_op: {
    th: ['หลังผ่าตัด', 'แผล', 'ฟื้นตัว', 'ยา', 'เจ็บ', 'บาดแผล', 'รักษา'],
    en: ['surgery', 'wound', 'recovery', 'post-op', 'healing', 'treatment', 'operation']
  },
  diabetes: {
    th: ['เบาหวาน', 'น้ำตาล', 'อินซูลิน', 'เท้า', 'แผลไม่หาย', 'ระดับน้ำตาล'],
    en: ['diabetes', 'sugar', 'insulin', 'blood sugar', 'diabetic', 'glucose']
  },
  mood: {
    th: ['เศร้า', 'เหงา', 'โกรธ', 'หงุดหงิด', 'อารมณ์', 'ร้องไห้', 'เครียด'],
    en: ['sad', 'lonely', 'angry', 'mood', 'depression', 'emotional', 'stress']
  },
  medication: {
    th: ['ยา', 'กิน', 'ลืมกิน', 'ข้างเคียง', 'แพ้', 'ปฏิกิริยา', 'ขนาด'],
    en: ['medication', 'medicine', 'pills', 'dosage', 'side effects', 'allergic']
  },
  emergency: {
    th: ['ฉุกเฉิน', 'หมดสติ', 'หายใจไม่ออก', 'เจ็บหน้าอก', 'ชัก', 'เลือดออก', '1669'],
    en: ['emergency', 'unconscious', 'chest pain', 'bleeding', 'seizure', 'breathing']
  },
  general: {
    th: ['ดูแล', 'ช่วยเหลือ', 'คำแนะนำ', 'วิธี', 'ทำอย่างไร'],
    en: ['care', 'help', 'advice', 'how to', 'general', 'support']
  }
};

/**
 * Classify topic based on message content
 */
export function classifyTopic(message: string): TopicClassificationResult {
  const lowerMessage = message.toLowerCase();
  const scores: Record<TopicCategory, number> = {} as Record<TopicCategory, number>;
  
  // Initialize scores
  Object.keys(TOPIC_KEYWORDS).forEach(topic => {
    scores[topic as TopicCategory] = 0;
  });
  
  // Score each topic based on keyword matches
  Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
    const allKeywords = [...keywords.th, ...keywords.en];
    const matchedKeywords: string[] = [];
    
    allKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        scores[topic as TopicCategory] += 1;
        matchedKeywords.push(keyword);
      }
    });
    
    // Store matched keywords for the highest scoring topic
    if (scores[topic as TopicCategory] > 0) {
      (scores as Record<string, unknown>)[`${topic}_keywords`] = matchedKeywords;
    }
  });
  
  // Find the topic with highest score
  const topTopic = Object.entries(scores)
    .filter(([key]) => !key.includes('_keywords'))
    .reduce((max, [topic, score]) => 
      score > max.score ? { topic: topic as TopicCategory, score } : max,
      { topic: 'general' as TopicCategory, score: 0 }
    );
  
  const matchedKeywords = (scores as Record<string, unknown>)[`${topTopic.topic}_keywords`] as string[] || [];
  
  return {
    topic: topTopic.topic,
    confidence: Math.min(topTopic.score / 3, 1), // Normalize to 0-1
    keywords: matchedKeywords
  };
}

/**
 * Create analytics event with PII scrubbing and demographic context
 */
export function createAnalyticsEvent(
  sessionId: string,
  message: string,
  topic: TopicCategory,
  language: 'th' | 'en',
  lineClicked: boolean = false,
  routed: 'primary' | 'fallback' = 'primary',
  userProfile?: { ageRange?: string; gender?: string; location?: string }
): AnalyticsEvent {
  // Scrub PII from message and truncate to 160 characters
  const scrubbedResult = scrubPII(message);
  const textSnippet = scrubbedResult.scrubbedText.substring(0, 160);
  
  return {
    sessionId: createSessionHash(sessionId), // Use hashed session ID
    timestamp: new Date(),
    textSnippet,
    topic,
    language,
    lineClicked,
    routed,
    userProfile: userProfile ? {
      ageRange: userProfile.ageRange as AgeRange,
      gender: userProfile.gender as Gender,
      location: userProfile.location as Location
    } : undefined
  };
}

/**
 * Convert analytics event to database log format
 */
export function eventToLogFormat(event: AnalyticsEvent): AnalyticsLog {
  return {
    session_id: event.sessionId,
    timestamp: event.timestamp,
    text_snippet: event.textSnippet,
    topic: event.topic,
    language: event.language,
    line_clicked: event.lineClicked,
    routed: event.routed || 'primary'
  };
}

/**
 * Convert database log to analytics event format
 */
export function logToEventFormat(log: AnalyticsLog): AnalyticsEvent {
  return {
    sessionId: log.session_id,
    timestamp: log.timestamp,
    textSnippet: log.text_snippet,
    topic: log.topic as TopicCategory,
    language: log.language as 'th' | 'en',
    lineClicked: log.line_clicked,
    routed: log.routed as 'primary' | 'fallback'
  };
}

/**
 * Calculate topic analytics from logs
 */
export function calculateTopicAnalytics(logs: AnalyticsLog[]): TopicAnalytics[] {
  if (logs.length === 0) return [];
  
  const topicCounts: Record<string, { total: number; lineClicks: number }> = {};
  
  // Count occurrences and line clicks per topic
  logs.forEach(log => {
    if (!topicCounts[log.topic]) {
      topicCounts[log.topic] = { total: 0, lineClicks: 0 };
    }
    topicCounts[log.topic].total += 1;
    if (log.line_clicked) {
      topicCounts[log.topic].lineClicks += 1;
    }
  });
  
  // Convert to analytics format
  return Object.entries(topicCounts)
    .map(([topic, counts]) => ({
      topic: topic as TopicCategory,
      count: counts.total,
      percentage: (counts.total / logs.length) * 100,
      lineClickRate: counts.total > 0 ? (counts.lineClicks / counts.total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate usage statistics from logs
 */
export function calculateUsageStats(logs: AnalyticsLog[]): UsageStats {
  if (logs.length === 0) {
    return {
      totalQuestions: 0,
      uniqueSessions: 0,
      topTopics: [],
      languageDistribution: {},
      lineClickRate: 0,
      averageResponseTime: 0
    };
  }
  
  const uniqueSessions = new Set(logs.map(log => log.session_id)).size;
  const lineClicks = logs.filter(log => log.line_clicked).length;
  const languageCounts: Record<string, number> = {};
  
  // Count languages
  logs.forEach(log => {
    languageCounts[log.language] = (languageCounts[log.language] || 0) + 1;
  });
  
  return {
    totalQuestions: logs.length,
    uniqueSessions,
    topTopics: calculateTopicAnalytics(logs),
    languageDistribution: languageCounts,
    lineClickRate: (lineClicks / logs.length) * 100,
    averageResponseTime: 2.5 // Placeholder - would need response time tracking
  };
}

/**
 * Track conversation flow patterns
 */
export interface ConversationFlow {
  sessionId: string;
  steps: Array<{
    step: number;
    topic: TopicCategory;
    timestamp: Date;
    lineHandoff: boolean;
  }>;
  totalSteps: number;
  duration: number; // in minutes
  endedWithLineHandoff: boolean;
}

/**
 * Analyze conversation flows from session logs
 */
export function analyzeConversationFlow(sessionLogs: AnalyticsLog[]): ConversationFlow[] {
  const sessionGroups: Record<string, AnalyticsLog[]> = {};
  
  // Group logs by session
  sessionLogs.forEach(log => {
    if (!sessionGroups[log.session_id]) {
      sessionGroups[log.session_id] = [];
    }
    sessionGroups[log.session_id].push(log);
  });
  
  // Analyze each session
  return Object.entries(sessionGroups).map(([sessionId, logs]) => {
    const sortedLogs = logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];
    
    const steps = sortedLogs.map((log, index) => ({
      step: index + 1,
      topic: log.topic as TopicCategory,
      timestamp: log.timestamp,
      lineHandoff: log.line_clicked
    }));
    
    const duration = (lastLog.timestamp.getTime() - firstLog.timestamp.getTime()) / (1000 * 60);
    
    return {
      sessionId,
      steps,
      totalSteps: logs.length,
      duration: Math.round(duration),
      endedWithLineHandoff: lastLog.line_clicked
    };
  });
}

/**
 * Get most common conversation patterns
 */
export function getCommonPatterns(flows: ConversationFlow[]): Array<{
  pattern: TopicCategory[];
  frequency: number;
  averageDuration: number;
  lineHandoffRate: number;
}> {
  const patterns: Record<string, {
    flows: ConversationFlow[];
    lineHandoffs: number;
  }> = {};
  
  flows.forEach(flow => {
    const topicSequence = flow.steps.map(step => step.topic);
    const patternKey = topicSequence.join(' -> ');
    
    if (!patterns[patternKey]) {
      patterns[patternKey] = { flows: [], lineHandoffs: 0 };
    }
    
    patterns[patternKey].flows.push(flow);
    if (flow.endedWithLineHandoff) {
      patterns[patternKey].lineHandoffs += 1;
    }
  });
  
  return Object.entries(patterns)
    .map(([patternKey, data]) => ({
      pattern: patternKey.split(' -> ') as TopicCategory[],
      frequency: data.flows.length,
      averageDuration: data.flows.reduce((sum, flow) => sum + flow.duration, 0) / data.flows.length,
      lineHandoffRate: (data.lineHandoffs / data.flows.length) * 100
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10); // Top 10 patterns
}