/**
 * Feedback Service
 * Handles user feedback collection, analysis, and prompt version tracking
 */

import { 
  FeedbackData, 
  FeedbackAnalytics, 
  GoldStandardResponse,
  PromptVersionAnalytics 
} from '../types';
import { getDatabase } from './databaseService';
// Keeping feedback simple
import { createSessionHash } from './sessionService';
import { supabaseAdminTyped } from '../lib/supabase';

export class FeedbackService {
  /**
   * Submit user feedback with session hashing
   */
  static async submitFeedback(feedback: FeedbackData): Promise<void> {
    try {
      // Simple feedback storage

      // Get current prompt version
      const promptVersion = await this.getCurrentPromptVersion();

      // Use existing database service
      const db = await getDatabase();
      await db.storeFeedback({
        messageId: feedback.messageId,
        sessionId: createSessionHash(feedback.sessionId), // Use existing session hashing
        questionLogId: feedback.questionLogId,
        feedbackType: feedback.feedbackType,
        selectedText: feedback.selectedText,
        userComment: feedback.userComment,
        emotionalTone: feedback.emotionalTone,
        responseLength: feedback.responseLength,
        culturalSensitivity: feedback.culturalSensitivity,
        positiveAspects: feedback.positiveAspects,
        negativeAspects: feedback.negativeAspects,
        promptVersion
      });

      console.log('✅ Feedback submitted successfully:', {
        messageId: feedback.messageId,
        feedbackType: feedback.feedbackType,
        promptVersion
      });
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  /**
   * Get comprehensive feedback analytics
   */
  static async getFeedbackAnalytics(): Promise<FeedbackAnalytics> {
    try {
      const db = await getDatabase();
      const basicAnalytics = await db.getFeedbackAnalytics();
      
      // Get additional analytics data
      const recentFeedback = await db.getFeedback({ 
        limit: 1000,
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      });

      // Calculate common issues
      const commonIssues = this.calculateCommonIssues(recentFeedback);
      
      // Calculate trend data
      const trendData = this.calculateTrendData(recentFeedback);

      // Calculate response quality by topic (placeholder - would need topic correlation)
      const responseQualityByTopic = new Map();

      return {
        ...basicAnalytics,
        commonIssues,
        trendData,
        responseQualityByTopic
      };
    } catch (error) {
      console.error('❌ Error getting feedback analytics:', error);
      throw new Error('Failed to get feedback analytics');
    }
  }

  /**
   * Analyze positive feedback patterns to identify gold standard responses
   */
  static async analyzePositiveFeedback(): Promise<GoldStandardResponse[]> {
    try {
      const db = await getDatabase();
      const positiveFeedback = await db.getFeedback({ 
        feedbackType: 'helpful',
        limit: 100
      });

      // Filter for high-quality responses (those with positive aspects)
      const goldStandardCandidates = positiveFeedback.filter(
        feedback => feedback.positiveAspects && feedback.positiveAspects.length > 0
      );

      return goldStandardCandidates.map(feedback => ({
        messageId: feedback.messageId,
        responseText: '', // Would need to fetch from message history
        positiveScore: this.calculatePositiveScore(feedback),
        successPatterns: this.extractSuccessPatterns(feedback),
        promptVersion: feedback.promptVersion || 'unknown',
        topicCategory: 'general' as any, // Would need topic correlation
        extractedElements: {
          empathyMarkers: this.extractEmpathyMarkers(feedback),
          helpfulSuggestions: this.extractHelpfulSuggestions(feedback),
          culturalSensitivity: this.extractCulturalSensitivity(feedback),
          tonalElements: this.extractTonalElements(feedback)
        }
      }));
    } catch (error) {
      console.error('❌ Error analyzing positive feedback:', error);
      throw new Error('Failed to analyze positive feedback');
    }
  }

  /**
   * Analyze prompt version performance
   */
  static async analyzePromptVersionPerformance(): Promise<PromptVersionAnalytics[]> {
    try {
      const db = await getDatabase();
      const allFeedback = await db.getFeedback({ limit: 1000 });

      // Group feedback by prompt version
      const versionGroups: Record<string, any[]> = {};
      allFeedback.forEach(feedback => {
        const version = feedback.promptVersion || 'unknown';
        if (!versionGroups[version]) {
          versionGroups[version] = [];
        }
        versionGroups[version].push(feedback);
      });

      return Object.entries(versionGroups).map(([version, logs]) => ({
        version,
        totalResponses: logs.length,
        averageRating: this.calculateAverageRating(logs),
        positiveAspectCounts: this.countPositiveAspects(logs),
        commonSuccessPatterns: this.extractCommonSuccessPatterns(logs),
        improvementAreas: this.identifyImprovementAreas(logs)
      }));
    } catch (error) {
      console.error('❌ Error analyzing prompt version performance:', error);
      throw new Error('Failed to analyze prompt version performance');
    }
  }

  /**
   * Get current prompt version from environment or config
   */
  private static async getCurrentPromptVersion(): Promise<string> {
    // This would integrate with existing prompt versioning system
    // For now, use environment variable or default
    return process.env.PROMPT_VERSION || 'v1.0.0';
  }

  /**
   * Calculate common issues from feedback data
   */
  private static calculateCommonIssues(feedback: any[]): Array<{
    category: string;
    count: number;
    examples: string[];
  }> {
    const issueCategories: Record<string, { count: number; examples: string[] }> = {};

    feedback.forEach(fb => {
      if (fb.feedbackType === 'unhelpful' || fb.feedbackType === 'inappropriate') {
        const category = fb.emotionalTone || fb.culturalSensitivity || 'general';
        if (!issueCategories[category]) {
          issueCategories[category] = { count: 0, examples: [] };
        }
        issueCategories[category].count++;
        if (fb.userComment && issueCategories[category].examples.length < 3) {
          issueCategories[category].examples.push(fb.userComment);
        }
      }
    });

    return Object.entries(issueCategories)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate trend data for the last 30 days
   */
  private static calculateTrendData(feedback: any[]): Array<{
    date: string;
    positive: number;
    negative: number;
  }> {
    const dailyData: Record<string, { positive: number; negative: number }> = {};

    feedback.forEach(fb => {
      const date = fb.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { positive: 0, negative: 0 };
      }

      if (fb.feedbackType === 'helpful') {
        dailyData[date].positive++;
      } else if (fb.feedbackType === 'unhelpful' || fb.feedbackType === 'inappropriate') {
        dailyData[date].negative++;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate positive score for a feedback entry
   */
  private static calculatePositiveScore(feedback: any): number {
    let score = 0;
    if (feedback.feedbackType === 'helpful') score += 3;
    if (feedback.positiveAspects) score += feedback.positiveAspects.length;
    if (feedback.emotionalTone === 'just-right') score += 1;
    if (feedback.responseLength === 'just-right') score += 1;
    if (feedback.culturalSensitivity === 'appropriate') score += 2;
    return Math.min(score, 5); // Cap at 5
  }

  /**
   * Extract success patterns from feedback
   */
  private static extractSuccessPatterns(feedback: any): string[] {
    const patterns: string[] = [];
    if (feedback.positiveAspects) {
      patterns.push(...feedback.positiveAspects);
    }
    if (feedback.emotionalTone === 'just-right') {
      patterns.push('appropriate-tone');
    }
    if (feedback.culturalSensitivity === 'appropriate') {
      patterns.push('culturally-sensitive');
    }
    return patterns;
  }

  /**
   * Extract empathy markers from feedback
   */
  private static extractEmpathyMarkers(feedback: any): string[] {
    const markers: string[] = [];
    if (feedback.positiveAspects?.includes('empathetic-tone')) {
      markers.push('empathetic-tone');
    }
    return markers;
  }

  /**
   * Extract helpful suggestions from feedback
   */
  private static extractHelpfulSuggestions(feedback: any): string[] {
    const suggestions: string[] = [];
    if (feedback.positiveAspects?.includes('helpful-suggestion')) {
      suggestions.push('helpful-suggestion');
    }
    return suggestions;
  }

  /**
   * Extract cultural sensitivity markers from feedback
   */
  private static extractCulturalSensitivity(feedback: any): string[] {
    const markers: string[] = [];
    if (feedback.culturalSensitivity === 'appropriate') {
      markers.push('culturally-appropriate');
    }
    return markers;
  }

  /**
   * Extract tonal elements from feedback
   */
  private static extractTonalElements(feedback: any): string[] {
    const elements: string[] = [];
    if (feedback.emotionalTone === 'just-right') {
      elements.push('appropriate-tone');
    }
    return elements;
  }

  /**
   * Calculate average rating for a group of feedback
   */
  private static calculateAverageRating(logs: any[]): number {
    if (logs.length === 0) return 0;
    const totalScore = logs.reduce((sum, log) => sum + this.calculatePositiveScore(log), 0);
    return totalScore / logs.length;
  }

  /**
   * Count positive aspects across feedback logs
   */
  private static countPositiveAspects(logs: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.positiveAspects) {
        log.positiveAspects.forEach((aspect: string) => {
          counts[aspect] = (counts[aspect] || 0) + 1;
        });
      }
    });
    return counts;
  }

  /**
   * Extract common success patterns across logs
   */
  private static extractCommonSuccessPatterns(logs: any[]): string[] {
    const patternCounts: Record<string, number> = {};
    logs.forEach(log => {
      const patterns = this.extractSuccessPatterns(log);
      patterns.forEach(pattern => {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      });
    });

    return Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  /**
   * Identify improvement areas from negative feedback
   */
  private static identifyImprovementAreas(logs: any[]): string[] {
    const areas: Record<string, number> = {};
    logs.forEach(log => {
      if (log.feedbackType === 'unhelpful' || log.feedbackType === 'inappropriate') {
        if (log.emotionalTone && log.emotionalTone !== 'just-right') {
          areas[`tone-${log.emotionalTone}`] = (areas[`tone-${log.emotionalTone}`] || 0) + 1;
        }
        if (log.responseLength && log.responseLength !== 'just-right') {
          areas[`length-${log.responseLength}`] = (areas[`length-${log.responseLength}`] || 0) + 1;
        }
        if (log.culturalSensitivity === 'inappropriate') {
          areas['cultural-sensitivity'] = (areas['cultural-sensitivity'] || 0) + 1;
        }
      }
    });

    return Object.entries(areas)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);
  }

  /**
   * Get paginated feedback list for admin interface
   */
  static async getFeedbackList(options: {
    limit?: number;
    offset?: number;
    feedbackType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<{
    feedback: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const db = await getDatabase();
      const feedback = await db.getFeedback({
        limit: options.limit || 50,
        offset: options.offset || 0,
        feedbackType: options.feedbackType,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      });

      // Get total count for pagination
      const totalQuery = await db.getFeedback({
        feedbackType: options.feedbackType,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      });

      return {
        feedback,
        total: totalQuery.length,
        hasMore: feedback.length === (options.limit || 50)
      };
    } catch (error) {
      console.error('❌ Error getting feedback list:', error);
      throw new Error('Failed to get feedback list');
    }
  }

  /**
   * Export feedback data as CSV
   */
  static async exportFeedback(options: {
    dateFrom?: Date;
    dateTo?: Date;
    feedbackType?: string;
  } = {}): Promise<{
    csv: string;
    filename: string;
    count: number;
  }> {
    try {
      const db = await getDatabase();
      const feedback = await db.getFeedback({
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        feedbackType: options.feedbackType
      });

      // Convert to CSV
      const headers = [
        'ID', 'Message ID', 'Session ID', 'Feedback Type', 'User Comment',
        'Emotional Tone', 'Response Length', 'Cultural Sensitivity',
        'Positive Aspects', 'Prompt Version', 'Created At', 'Is Reviewed'
      ];

      const csvRows = [
        headers.join(','),
        ...feedback.map(f => [
          f.id,
          f.messageId,
          f.sessionId.substring(0, 8) + '...', // Partial session ID for privacy
          f.feedbackType,
          `"${(f.userComment || '').replace(/"/g, '""')}"`, // Escape quotes
          f.emotionalTone || '',
          f.responseLength || '',
          f.culturalSensitivity || '',
          `"${(f.positiveAspects || []).join(', ')}"`,
          f.promptVersion || '',
          f.createdAt.toISOString(),
          f.isReviewed ? 'Yes' : 'No'
        ].join(','))
      ];

      const csv = csvRows.join('\n');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `feedback-export-${dateStr}.csv`;

      return {
        csv,
        filename,
        count: feedback.length
      };
    } catch (error) {
      console.error('❌ Error exporting feedback:', error);
      throw new Error('Failed to export feedback');
    }
  }

  /**
   * Update feedback (mark as reviewed, add admin notes)
   */
  static async updateFeedback(feedbackId: number, updates: {
    isReviewed?: boolean;
    adminNotes?: string;
  }): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Use Supabase directly for updates
      const { error } = await supabaseAdminTyped
        .from('user_feedback')
        .update({
          is_reviewed: updates.isReviewed,
          admin_notes: updates.adminNotes
        })
        .eq('id', feedbackId);

      if (error) {
        console.error('❌ Error updating feedback:', error);
        throw new Error(`Failed to update feedback: ${error.message}`);
      }

      console.log('✅ Feedback updated successfully:', feedbackId);
    } catch (error) {
      console.error('❌ Error updating feedback:', error);
      throw new Error('Failed to update feedback');
    }
  }

  /**
   * Delete feedback (admin only)
   */
  static async deleteFeedback(feedbackId: number): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Use Supabase directly for deletion
      const { error } = await supabaseAdminTyped
        .from('user_feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) {
        console.error('❌ Error deleting feedback:', error);
        throw new Error(`Failed to delete feedback: ${error.message}`);
      }

      console.log('✅ Feedback deleted successfully:', feedbackId);
    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      throw new Error('Failed to delete feedback');
    }
  }
}