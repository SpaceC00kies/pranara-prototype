/**
 * Database Service
 * Handles database operations using Supabase
 */

import { AnalyticsLog, AnalyticsEvent, UsageStats } from '../types';
import { eventToLogFormat, calculateUsageStats } from './analyticsService';
import { supabaseAdminTyped } from '../lib/supabase';
import type { Database } from '../lib/supabase';

/**
 * Database service class using Supabase
 */
export class DatabaseService {
  private isConnected = false;

  constructor() {
    // Supabase client is initialized in lib/supabase.ts
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      // Test Supabase connection
      const { error } = await supabaseAdminTyped
        .from('question_logs')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      this.isConnected = true;
      console.log('✅ Supabase database connected successfully');
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
      throw new Error('Failed to connect to Supabase database');
    }
  }

  /**
   * Check if database is connected
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const { error } = await supabaseAdminTyped
        .from('question_logs')
        .select('count', { count: 'exact', head: true });
      
      return !error;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Store analytics event using Supabase
   */
  async storeAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const log = eventToLogFormat(event);
    
    const { error } = await supabaseAdminTyped
      .from('question_logs')
      .insert({
        session_id: log.session_id,
        text_snippet: log.text_snippet,
        topic: log.topic,
        language: log.language,
        line_clicked: log.line_clicked,
        routed: log.routed
      });

    if (error) {
      console.error('❌ Error storing analytics event:', error);
      throw new Error(`Failed to store analytics event: ${error.message}`);
    }

    console.log('✅ Analytics event stored successfully');
  }

  /**
   * Retrieve analytics logs using Supabase
   */
  async getAnalyticsLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      topic?: string;
      language?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<AnalyticsLog[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    let query = supabaseAdminTyped
      .from('question_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters
    if (filters?.topic) {
      query = query.eq('topic', filters.topic);
    }

    if (filters?.language) {
      query = query.eq('language', filters.language);
    }

    if (filters?.dateFrom) {
      query = query.gte('timestamp', filters.dateFrom.toISOString());
    }

    if (filters?.dateTo) {
      query = query.lte('timestamp', filters.dateTo.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching analytics logs:', error);
      throw new Error(`Failed to fetch analytics logs: ${error.message}`);
    }

    return (data || []).map((row) => ({
      session_id: row.session_id,
      timestamp: new Date(row.timestamp),
      text_snippet: row.text_snippet,
      topic: row.topic,
      language: row.language,
      line_clicked: row.line_clicked,
      routed: row.routed
    }));
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<UsageStats> {
    const logs = await this.getAnalyticsLogs(1000, 0, { dateFrom, dateTo });
    return calculateUsageStats(logs);
  }

  /**
   * Get top questions by topic
   */
  async getTopQuestions(limit: number = 10): Promise<Array<{
    snippet: string;
    count: number;
    topic: string;
  }>> {
    const logs = await this.getAnalyticsLogs(1000);
    
    // Group by text snippet
    const snippetCounts: Record<string, { count: number; topic: string }> = {};
    
    logs.forEach(log => {
      if (!snippetCounts[log.text_snippet]) {
        snippetCounts[log.text_snippet] = { count: 0, topic: log.topic };
      }
      snippetCounts[log.text_snippet].count++;
    });

    return Object.entries(snippetCounts)
      .map(([snippet, data]) => ({
        snippet,
        count: data.count,
        topic: data.topic
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Store user feedback using Supabase
   */
  async storeFeedback(feedback: {
    messageId: string;
    sessionId: string;
    questionLogId?: number;
    feedbackType: string;
    selectedText?: string;
    userComment?: string;
    emotionalTone?: string;
    responseLength?: string;
    culturalSensitivity?: string;
    positiveAspects?: string[];
    negativeAspects?: string[];
    promptVersion?: string;
  }): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const { error } = await supabaseAdminTyped
      .from('user_feedback')
      .insert({
        message_id: feedback.messageId,
        session_id: feedback.sessionId,
        question_log_id: feedback.questionLogId || null,
        feedback_type: feedback.feedbackType,
        selected_text: feedback.selectedText || null,
        user_comment: feedback.userComment || null,
        emotional_tone: feedback.emotionalTone || null,
        response_length: feedback.responseLength || null,
        cultural_sensitivity: feedback.culturalSensitivity || null,
        positive_aspects: feedback.positiveAspects || null,
        negative_aspects: feedback.negativeAspects || null,
        prompt_version: feedback.promptVersion || null
      });

    if (error) {
      console.error('❌ Error storing feedback:', error);
      throw new Error(`Failed to store feedback: ${error.message}`);
    }

    console.log('✅ Feedback stored successfully');
  }

  /**
   * Get feedback data with optional filters using Supabase
   */
  async getFeedback(filters?: {
    feedbackType?: string;
    promptVersion?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    id: number;
    messageId: string;
    sessionId: string;
    feedbackType: string;
    selectedText?: string;
    userComment?: string;
    emotionalTone?: string;
    responseLength?: string;
    culturalSensitivity?: string;
    positiveAspects?: string[];
    negativeAspects?: string[];
    promptVersion?: string;
    createdAt: Date;
    isReviewed: boolean;
    adminNotes?: string;
  }>> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    let query = supabaseAdminTyped
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    // Add filters
    if (filters?.feedbackType) {
      query = query.eq('feedback_type', filters.feedbackType);
    }

    if (filters?.promptVersion) {
      query = query.eq('prompt_version', filters.promptVersion);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching feedback:', error);
      throw new Error(`Failed to fetch feedback: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      messageId: row.message_id,
      sessionId: row.session_id,
      feedbackType: row.feedback_type,
      selectedText: row.selected_text,
      userComment: row.user_comment,
      emotionalTone: row.emotional_tone,
      responseLength: row.response_length,
      culturalSensitivity: row.cultural_sensitivity,
      positiveAspects: row.positive_aspects,
      negativeAspects: row.negative_aspects,
      promptVersion: row.prompt_version,
      createdAt: new Date(row.created_at),
      isReviewed: row.is_reviewed,
      adminNotes: row.admin_notes
    }));
  }

  /**
   * Get feedback analytics using Supabase
   */
  async getFeedbackAnalytics(): Promise<{
    totalFeedback: number;
    satisfactionRate: number;
    feedbackByType: Record<string, number>;
    feedbackByPromptVersion: Record<string, number>;
    averageRating: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    // Get all feedback data for analytics
    const { data, error } = await supabaseAdminTyped
      .from('user_feedback')
      .select('feedback_type, prompt_version');

    if (error) {
      console.error('❌ Error fetching feedback analytics:', error);
      throw new Error(`Failed to fetch feedback analytics: ${error.message}`);
    }

    const rows = data || [];
    const totalFeedback = rows.length;
    const positiveFeedback = rows.filter(row => row.feedback_type === 'helpful').length;

    const feedbackByType: Record<string, number> = {};
    const feedbackByPromptVersion: Record<string, number> = {};

    rows.forEach((row) => {
      // Count by feedback type
      feedbackByType[row.feedback_type] = (feedbackByType[row.feedback_type] || 0) + 1;
      
      // Count by prompt version
      if (row.prompt_version) {
        feedbackByPromptVersion[row.prompt_version] = (feedbackByPromptVersion[row.prompt_version] || 0) + 1;
      }
    });

    return {
      totalFeedback,
      satisfactionRate: totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0,
      feedbackByType,
      feedbackByPromptVersion,
      averageRating: totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 5 : 0 // Convert to 5-star scale
    };
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    // Supabase handles connection pooling automatically
    this.isConnected = false;
    console.log('✅ Database disconnected');
  }
}

/**
 * Create database service instance
 */
export function createDatabaseService(): DatabaseService {
  console.log('🚀 Using Supabase database');
  return new DatabaseService();
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

/**
 * Get database service singleton
 */
export async function getDatabase(): Promise<DatabaseService> {
  if (!dbInstance) {
    dbInstance = createDatabaseService();
    await dbInstance.connect();
  }
  return dbInstance;
}