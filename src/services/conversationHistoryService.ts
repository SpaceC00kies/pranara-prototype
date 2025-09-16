/**
 * Conversation History Service
 * Manages conversation history to enable context-aware responses
 */

import { ChatMessage, TopicCategory } from '../types';

export interface EmotionalContext {
  currentMood: 'anxious' | 'sad' | 'worried' | 'calm' | 'seeking' | 'neutral';
  intensityLevel: number; // 1-5
  topicProgression: string[]; // Track how topics evolve
  emotionalJourney: Array<{
    timestamp: Date;
    mood: string;
    trigger?: string;
  }>;
}

export interface ConversationHistory {
  sessionId: string;
  messages: ChatMessage[];
  lastActivity: Date;
  messageCount: number;
  emotionalContext?: EmotionalContext;
}

export interface ResponsePattern {
  openingPhrase: string;  // First 20-30 characters
  structure: string;       // The sentence structure pattern
  emotionalTone: string;   // How the response "feels"
  usedAt: Date;
}

export interface ConversationContext {
  recentMessages: ChatMessage[];
  recentResponsePatterns: string[];
  conversationLength: number;
  lastTopic?: TopicCategory;
  emotionalContext?: EmotionalContext;
}

/**
 * In-memory conversation history storage with emotional intelligence
 * In production, this should be moved to a database
 */
class ConversationHistoryService {
  private conversations: Map<string, ConversationHistory> = new Map();
  private emotionalContexts: Map<string, EmotionalContext> = new Map();
  private responsePatterns: Map<string, ResponsePattern[]> = new Map();
  private readonly MAX_HISTORY_LENGTH = 10; // Keep last 10 messages
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CONVERSATION_AGE = 2 * 60 * 60 * 1000; // 2 hours

  constructor() {
    // Cleanup old conversations periodically
    setInterval(() => this.cleanupOldConversations(), this.CLEANUP_INTERVAL);
  }

  /**
   * Add a message to conversation history
   */
  addMessage(sessionId: string, message: ChatMessage): void {
    let conversation = this.conversations.get(sessionId);
    
    if (!conversation) {
      conversation = {
        sessionId,
        messages: [],
        lastActivity: new Date(),
        messageCount: 0
      };
      this.conversations.set(sessionId, conversation);
    }

    // Add the message
    conversation.messages.push(message);
    conversation.lastActivity = new Date();
    conversation.messageCount++;

    // Update emotional context if it's a user message
    this.updateEmotionalContext(sessionId, message);

    // Keep only recent messages
    if (conversation.messages.length > this.MAX_HISTORY_LENGTH) {
      conversation.messages = conversation.messages.slice(-this.MAX_HISTORY_LENGTH);
    }
  }

  /**
   * Get conversation context for generating responses
   */
  getConversationContext(sessionId: string): ConversationContext {
    const conversation = this.conversations.get(sessionId);
    
    if (!conversation || conversation.messages.length === 0) {
      return {
        recentMessages: [],
        recentResponsePatterns: [],
        conversationLength: 0
      };
    }

    // Get last 5 assistant responses for better pattern detection
    const recentAssistantMessages = conversation.messages
      .filter(msg => msg.sender === 'assistant')
      .slice(-5);

    // Extract multiple pattern levels
    const recentResponsePatterns = recentAssistantMessages.map(msg => {
      const text = msg.text.trim();
      // Extract different pattern lengths for Thai
      const patterns = [
        text.substring(0, 30),  // First 30 chars (catches "ฟังแล้วรู้สึกได้เลยค่ะว่า")
        text.substring(0, 20),  // First 20 chars
        text.split('...')[0],   // Everything before first pause
        text.split(' ')[0] + ' ' + (text.split(' ')[1] || ''), // First two words
      ];

      // Also extract structural pattern
      const structuralPattern = this.extractStructuralPattern(text);
      return patterns.concat([structuralPattern]);
    }).flat();

    // Remove duplicates and keep unique patterns
    const uniquePatterns = [...new Set(recentResponsePatterns)].filter(p => p && p.length > 5);

    // Get last topic
    const lastTopic = conversation.messages
      .slice()
      .reverse()
      .find(msg => msg.topic)?.topic;

    return {
      recentMessages: conversation.messages.slice(-5), // Last 5 messages for context
      recentResponsePatterns: uniquePatterns,
      conversationLength: conversation.messageCount,
      lastTopic,
      emotionalContext: this.getEmotionalContext(sessionId)
    };
  }

  /**
   * Extract structural pattern from response text
   */
  private extractStructuralPattern(text: string): string {
    // Identify the emotional/structural pattern
    const patterns = {
      'acknowledge_worry': ['ฟังแล้ว', 'ห่วง', 'กังวล'],
      'understand_feeling': ['เข้าใจ', 'รู้สึก', 'ความรู้สึก'],
      'see_situation': ['เห็น', 'ภาพ', 'ชัดเจน'],
      'heavy_heart': ['หนักใจ', 'ลำบาก', 'ไม่ง่าย'],
      'together': ['อยู่ตรงนี้', 'ด้วยกัน', 'เคียงข้าง']
    };

    for (const [pattern, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return pattern;
      }
    }
    return 'general';
  }

  /**
   * Check if a response would be repetitive
   */
  isRepetitiveResponse(sessionId: string, proposedResponse: string): boolean {
    const context = this.getConversationContext(sessionId);
    
    // Check against all recent patterns
    for (const pattern of context.recentResponsePatterns) {
      if (pattern.length > 10) {  // Only check substantial patterns
        // Check if proposed response starts with or contains the pattern
        if (proposedResponse.includes(pattern) || pattern.includes(proposedResponse.substring(0, 20))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get recent assistant response patterns for avoiding repetition
   */
  getRecentResponsePatterns(sessionId: string): string[] {
    const context = this.getConversationContext(sessionId);
    return context.recentResponsePatterns;
  }

  /**
   * Check if a response pattern was recently used
   */
  wasPatternRecentlyUsed(sessionId: string, pattern: string): boolean {
    const recentPatterns = this.getRecentResponsePatterns(sessionId);
    return recentPatterns.some(recentPattern => 
      recentPattern.includes(pattern) || pattern.includes(recentPattern)
    );
  }

  /**
   * Get conversation length for handoff decisions
   */
  getConversationLength(sessionId: string): number {
    const conversation = this.conversations.get(sessionId);
    return conversation?.messageCount || 0;
  }

  /**
   * Clear conversation history for a session
   */
  clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  /**
   * Clean up old conversations
   */
  private cleanupOldConversations(): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];

    for (const [sessionId, conversation] of this.conversations.entries()) {
      const age = now - conversation.lastActivity.getTime();
      if (age > this.MAX_CONVERSATION_AGE) {
        sessionsToDelete.push(sessionId);
      }
    }

    sessionsToDelete.forEach(sessionId => {
      this.conversations.delete(sessionId);
    });

    if (sessionsToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${sessionsToDelete.length} old conversations`);
    }
  }

  /**
   * Get emotional context for a session
   */
  getEmotionalContext(sessionId: string): EmotionalContext {
    // Track emotional progression through conversation
    const context = this.emotionalContexts.get(sessionId);
    if (!context) {
      return this.analyzeEmotionalContext(sessionId);
    }
    return context;
  }

  /**
   * Analyze emotional context from conversation history
   */
  private analyzeEmotionalContext(sessionId: string): EmotionalContext {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) return this.getDefaultEmotionalContext();

    // Analyze last few messages for emotional cues
    const recentMessages = conversation.messages.slice(-3);
    const userMessages = recentMessages.filter(msg => msg.sender === 'user');
    
    if (userMessages.length === 0) {
      return this.getDefaultEmotionalContext();
    }

    const lastUserMessage = userMessages[userMessages.length - 1].text;

    // Thai emotional markers
    const anxietyMarkers = ['กังวล', 'กลัว', 'ไม่แน่ใจ', 'วิตก', 'เครียด', 'ตื่นเต้น'];
    const sadnessMarkers = ['เศร้า', 'เหนื่อย', 'ท้อ', 'เบื่อ', 'หดหู่', 'ผิดหวัง'];
    const worryMarkers = ['เป็นห่วง', 'กลุ้มใจ', 'ไม่สบายใจ', 'ห่วงใย', 'กังวลใจ'];
    const calmMarkers = ['สบายใจ', 'ผ่อนคลาย', 'สงบ', 'ดีใจ', 'โล่งใจ'];
    const seekingMarkers = ['ช่วย', 'แนะนำ', 'ไม่รู้', 'ยังไง', 'อยากรู้'];

    let currentMood: EmotionalContext['currentMood'] = 'neutral';
    let intensityLevel = 1;
    let trigger: string | undefined;

    // Detect mood from text
    if (anxietyMarkers.some(marker => lastUserMessage.includes(marker))) {
      currentMood = 'anxious';
      intensityLevel = 3;
      trigger = anxietyMarkers.find(marker => lastUserMessage.includes(marker));
    } else if (sadnessMarkers.some(marker => lastUserMessage.includes(marker))) {
      currentMood = 'sad';
      intensityLevel = 3;
      trigger = sadnessMarkers.find(marker => lastUserMessage.includes(marker));
    } else if (worryMarkers.some(marker => lastUserMessage.includes(marker))) {
      currentMood = 'worried';
      intensityLevel = 2;
      trigger = worryMarkers.find(marker => lastUserMessage.includes(marker));
    } else if (calmMarkers.some(marker => lastUserMessage.includes(marker))) {
      currentMood = 'calm';
      intensityLevel = 1;
      trigger = calmMarkers.find(marker => lastUserMessage.includes(marker));
    } else if (seekingMarkers.some(marker => lastUserMessage.includes(marker))) {
      currentMood = 'seeking';
      intensityLevel = 2;
      trigger = seekingMarkers.find(marker => lastUserMessage.includes(marker));
    }

    // Increase intensity for multiple emotional markers or urgent language
    const urgentMarkers = ['ฉุกเฉิน', 'ด่วน', 'ช่วย', 'ไม่รู้จะทำยังไง', 'หมดหนทาง'];
    if (urgentMarkers.some(marker => lastUserMessage.includes(marker))) {
      intensityLevel = Math.min(5, intensityLevel + 2);
    }

    // Build topic progression
    const topicProgression = userMessages.map(msg => msg.text.substring(0, 50));

    const emotionalContext: EmotionalContext = {
      currentMood,
      intensityLevel,
      topicProgression,
      emotionalJourney: [{
        timestamp: new Date(),
        mood: currentMood,
        trigger
      }]
    };

    // Store for future reference
    this.emotionalContexts.set(sessionId, emotionalContext);
    
    // Update conversation with emotional context
    if (conversation) {
      conversation.emotionalContext = emotionalContext;
    }

    return emotionalContext;
  }

  /**
   * Update emotional context based on new message
   */
  updateEmotionalContext(sessionId: string, message: ChatMessage): void {
    if (message.sender === 'user') {
      // Re-analyze emotional context with new message
      const newContext = this.analyzeEmotionalContext(sessionId);
      
      // Add to emotional journey if mood changed
      const existingContext = this.emotionalContexts.get(sessionId);
      if (existingContext && existingContext.currentMood !== newContext.currentMood) {
        newContext.emotionalJourney = [
          ...existingContext.emotionalJourney,
          {
            timestamp: new Date(),
            mood: newContext.currentMood,
            trigger: message.text.substring(0, 50)
          }
        ];
      }

      this.emotionalContexts.set(sessionId, newContext);
    }
  }

  /**
   * Get default emotional context
   */
  private getDefaultEmotionalContext(): EmotionalContext {
    return {
      currentMood: 'neutral',
      intensityLevel: 1,
      topicProgression: [],
      emotionalJourney: [{
        timestamp: new Date(),
        mood: 'neutral'
      }]
    };
  }

  /**
   * Get statistics about active conversations
   */
  getStats(): {
    activeConversations: number;
    totalMessages: number;
    averageLength: number;
    emotionalDistribution: Record<string, number>;
  } {
    const conversations = Array.from(this.conversations.values());
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messageCount, 0);
    
    // Emotional distribution
    const emotionalDistribution: Record<string, number> = {};
    Array.from(this.emotionalContexts.values()).forEach(context => {
      emotionalDistribution[context.currentMood] = (emotionalDistribution[context.currentMood] || 0) + 1;
    });
    
    return {
      activeConversations: conversations.length,
      totalMessages,
      averageLength: conversations.length > 0 ? totalMessages / conversations.length : 0,
      emotionalDistribution
    };
  }
}

// Singleton instance
export const conversationHistoryService = new ConversationHistoryService();

/**
 * Helper function to create a chat message
 */
export function createChatMessage(
  text: string,
  sender: 'user' | 'assistant',
  topic?: TopicCategory,
  showLineOption?: boolean
): ChatMessage {
  return {
    id: generateMessageId(),
    text,
    sender,
    timestamp: new Date(),
    topic,
    showLineOption
  };
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}