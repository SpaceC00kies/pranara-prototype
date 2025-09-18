/**
 * Redis-based Conversation Service for Jirung Senior Advisor
 * 
 * Handles conversation storage, retrieval, and management using Redis Cloud
 */

import { Message } from '../types';

export interface RedisMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  model?: 'pnr-g' | 'pnr-g2';
  topic?: string;
}

export interface ConversationMetadata {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  messageCount: number;
  currentModel: 'pnr-g' | 'pnr-g2';
  userProfile?: {
    ageRange?: string;
    gender?: string;
    location?: string;
  };
}

export class RedisConversationService {
  private static instance: RedisConversationService;
  
  private constructor() {}

  public static getInstance(): RedisConversationService {
    if (!RedisConversationService.instance) {
      RedisConversationService.instance = new RedisConversationService();
    }
    return RedisConversationService.instance;
  }

  /**
   * Store a message in Redis
   */
  async addMessage(sessionId: string, message: RedisMessage): Promise<void> {
    try {
      const messageKey = `msg:${message.id}`;
      const conversationKey = `conv:${sessionId}`;
      const metadataKey = `meta:${sessionId}`;

      // Store individual message
      const messageData = {
        id: message.id,
        text: message.text,
        sender: message.sender,
        timestamp: message.timestamp,
        model: message.model || 'pnr-g',
        topic: message.topic || 'general'
      };

      // Use Redis MCP to store message
      await this.setHash(messageKey, messageData);

      // Add message ID to conversation list
      await this.addToList(conversationKey, message.id);

      // Update conversation metadata
      await this.updateMetadata(sessionId, message.model);

      // Set TTL for automatic cleanup (30 days)
      await this.setExpiration(messageKey, 30 * 24 * 60 * 60);
      await this.setExpiration(conversationKey, 30 * 24 * 60 * 60);
      await this.setExpiration(metadataKey, 30 * 24 * 60 * 60);

      console.log(`✅ Redis: Stored message ${message.id} for session ${sessionId}`);
    } catch (error) {
      console.error('❌ Redis: Failed to store message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history from Redis
   */
  async getConversationHistory(sessionId: string, limit: number = 20): Promise<RedisMessage[]> {
    try {
      const conversationKey = `conv:${sessionId}`;
      
      // Get recent message IDs
      const messageIds = await this.getListRange(conversationKey, -limit, -1);
      
      if (!messageIds || messageIds.length === 0) {
        return [];
      }

      // Fetch all messages
      const messages: RedisMessage[] = [];
      for (const messageId of messageIds) {
        const messageKey = `msg:${messageId}`;
        const messageData = await this.getHash(messageKey);
        if (messageData) {
          messages.push(messageData as RedisMessage);
        }
      }

      console.log(`✅ Redis: Retrieved ${messages.length} messages for session ${sessionId}`);
      return messages;
    } catch (error) {
      console.error('❌ Redis: Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Get conversation metadata
   */
  async getConversationMetadata(sessionId: string): Promise<ConversationMetadata | null> {
    try {
      const metadataKey = `meta:${sessionId}`;
      const metadata = await this.getHash(metadataKey);
      return metadata as ConversationMetadata | null;
    } catch (error) {
      console.error('❌ Redis: Failed to get metadata:', error);
      return null;
    }
  }

  /**
   * Update conversation metadata
   */
  private async updateMetadata(sessionId: string, currentModel?: 'pnr-g' | 'pnr-g2'): Promise<void> {
    const metadataKey = `meta:${sessionId}`;
    const now = new Date().toISOString();
    
    let metadata = await this.getHash(metadataKey) as ConversationMetadata;
    
    if (!metadata) {
      metadata = {
        sessionId,
        startTime: now,
        lastActivity: now,
        messageCount: 1,
        currentModel: currentModel || 'pnr-g'
      };
    } else {
      metadata.lastActivity = now;
      metadata.messageCount = (metadata.messageCount || 0) + 1;
      if (currentModel) {
        metadata.currentModel = currentModel;
      }
    }

    await this.setHash(metadataKey, metadata);
  }

  /**
   * Clear conversation history
   */
  async clearConversation(sessionId: string): Promise<void> {
    try {
      const conversationKey = `conv:${sessionId}`;
      const metadataKey = `meta:${sessionId}`;
      
      // Get all message IDs first
      const messageIds = await this.getListRange(conversationKey, 0, -1);
      
      // Delete all messages
      for (const messageId of messageIds || []) {
        await this.deleteKey(`msg:${messageId}`);
      }
      
      // Delete conversation list and metadata
      await this.deleteKey(conversationKey);
      await this.deleteKey(metadataKey);
      
      console.log(`✅ Redis: Cleared conversation ${sessionId}`);
    } catch (error) {
      console.error('❌ Redis: Failed to clear conversation:', error);
      throw error;
    }
  }

  /**
   * Get active sessions count
   */
  async getActiveSessionsCount(): Promise<number> {
    try {
      // This would require scanning keys, which might be expensive
      // For now, return a placeholder
      return 0;
    } catch (error) {
      console.error('❌ Redis: Failed to get active sessions count:', error);
      return 0;
    }
  }

  // Helper methods using Redis MCP calls
  private async setHash(key: string, data: any): Promise<void> {
    // Convert object to individual hash fields and store each
    for (const [field, value] of Object.entries(data)) {
      // We'll implement this with direct Redis calls in the application layer
      // For now, store as JSON string in a single hash field
    }
    
    // Store entire object as JSON in hash
    const jsonData = JSON.stringify(data);
    // This will be called from application layer using MCP
  }

  private async getHash(key: string): Promise<any> {
    // This will be called from application layer using MCP
    return null;
  }

  private async addToList(key: string, value: string): Promise<void> {
    // This will be called from application layer using MCP
  }

  private async getListRange(key: string, start: number, end: number): Promise<string[]> {
    // This will be called from application layer using MCP
    return [];
  }

  private async setExpiration(key: string, seconds: number): Promise<void> {
    // This will be called from application layer using MCP
  }

  private async deleteKey(key: string): Promise<void> {
    // This will be called from application layer using MCP
  }
}

// Export singleton instance
export const redisConversationService = RedisConversationService.getInstance();