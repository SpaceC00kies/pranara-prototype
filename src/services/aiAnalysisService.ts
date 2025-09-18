/**
 * AI Analysis Service
 * Provides intelligent analysis of user feedback using Gemini AI
 */

import { supabaseAdminTyped } from '../lib/supabase';
import { FeedbackData } from '../types';

export interface SmartFeedback extends FeedbackData {
  aiCategory: 'tone' | 'accuracy' | 'helpfulness' | 'cultural' | 'length';
  confidenceScore: number;
  sentimentScore: number;
  suggestedAction: string;
  successPatterns: string[];
}

export interface AIAnalysisResult {
  category: 'tone' | 'accuracy' | 'helpfulness' | 'cultural' | 'length';
  confidence: number;
  sentiment: number;
  suggestedAction: string;
  successPatterns: string[];
  reasoning: string;
}

export class AIAnalysisService {
  /**
   * Analyze feedback using AI to categorize and extract insights
   */
  static async analyzeFeedback(feedback: {
    id: number;
    feedbackType: string;
    userComment?: string;
    selectedText?: string;
    emotionalTone?: string;
    responseLength?: string;
    culturalSensitivity?: string;
    positiveAspects?: string[];
  }): Promise<AIAnalysisResult> {
    try {
      // Create analysis prompt
      const analysisPrompt = this.createAnalysisPrompt(feedback);
      
      // Call Gemini API for analysis
      const aiResponse = await this.callGeminiForAnalysis(analysisPrompt);
      
      // Parse AI response
      const analysis = this.parseAIResponse(aiResponse);
      
      // Store AI analysis results in Supabase
      await this.storeAIAnalysis(feedback.id, analysis);
      
      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing feedback:', error);
      
      // Return fallback analysis
      return this.createFallbackAnalysis(feedback);
    }
  }

  /**
   * Batch analyze multiple feedback items
   */
  static async batchAnalyzeFeedback(feedbackIds: number[]): Promise<{
    processed: number;
    failed: number;
    results: AIAnalysisResult[];
  }> {
    const results: AIAnalysisResult[] = [];
    let processed = 0;
    let failed = 0;

    // Get feedback data from Supabase
    const { data: feedbackData, error } = await supabaseAdminTyped
      .from('user_feedback')
      .select('*')
      .in('id', feedbackIds)
      .is('ai_processed_at', null); // Only process unanalyzed feedback

    if (error) {
      console.error('❌ Error fetching feedback for batch analysis:', error);
      return { processed: 0, failed: feedbackIds.length, results: [] };
    }

    // Process each feedback item
    for (const feedback of feedbackData || []) {
      try {
        const analysis = await this.analyzeFeedback(feedback);
        results.push(analysis);
        processed++;
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to analyze feedback ${feedback.id}:`, error);
        failed++;
      }
    }

    console.log(`✅ Batch analysis complete: ${processed} processed, ${failed} failed`);
    return { processed, failed, results };
  }

  /**
   * Get AI analysis insights for admin dashboard
   */
  static async getAIInsights(): Promise<{
    totalAnalyzed: number;
    categoryDistribution: Record<string, number>;
    averageConfidence: number;
    averageSentiment: number;
    topSuggestedActions: Array<{ action: string; count: number }>;
    successPatternFrequency: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabaseAdminTyped
        .from('user_feedback')
        .select('ai_category, confidence_score, sentiment_score, suggested_action, success_patterns')
        .not('ai_processed_at', 'is', null);

      if (error) {
        throw error;
      }

      const analyzedFeedback = data || [];
      const totalAnalyzed = analyzedFeedback.length;

      if (totalAnalyzed === 0) {
        return {
          totalAnalyzed: 0,
          categoryDistribution: {},
          averageConfidence: 0,
          averageSentiment: 0,
          topSuggestedActions: [],
          successPatternFrequency: {}
        };
      }

      // Calculate category distribution
      const categoryDistribution: Record<string, number> = {};
      let totalConfidence = 0;
      let totalSentiment = 0;
      const actionCounts: Record<string, number> = {};
      const patternCounts: Record<string, number> = {};

      analyzedFeedback.forEach(item => {
        // Category distribution
        if (item.ai_category) {
          categoryDistribution[item.ai_category] = (categoryDistribution[item.ai_category] || 0) + 1;
        }

        // Confidence and sentiment
        if (item.confidence_score) totalConfidence += item.confidence_score;
        if (item.sentiment_score) totalSentiment += item.sentiment_score;

        // Suggested actions
        if (item.suggested_action) {
          actionCounts[item.suggested_action] = (actionCounts[item.suggested_action] || 0) + 1;
        }

        // Success patterns
        if (item.success_patterns) {
          item.success_patterns.forEach((pattern: string) => {
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
          });
        }
      });

      // Top suggested actions
      const topSuggestedActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      return {
        totalAnalyzed,
        categoryDistribution,
        averageConfidence: totalConfidence / totalAnalyzed,
        averageSentiment: totalSentiment / totalAnalyzed,
        topSuggestedActions,
        successPatternFrequency: patternCounts
      };
    } catch (error) {
      console.error('❌ Error getting AI insights:', error);
      throw new Error('Failed to get AI insights');
    }
  }

  /**
   * Create analysis prompt for Gemini
   */
  private static createAnalysisPrompt(feedback: any): string {
    return `
Analyze this user feedback for a Thai therapeutic AI assistant called Pranara:

Feedback Type: ${feedback.feedbackType}
User Comment: "${feedback.userComment || 'No comment'}"
Selected Text: "${feedback.selectedText || 'None'}"
Emotional Tone Rating: ${feedback.emotionalTone || 'Not specified'}
Response Length Rating: ${feedback.responseLength || 'Not specified'}
Cultural Sensitivity Rating: ${feedback.culturalSensitivity || 'Not specified'}
Positive Aspects: ${feedback.positiveAspects?.join(', ') || 'None'}

Please provide analysis in this exact JSON format:
{
  "category": "tone|accuracy|helpfulness|cultural|length",
  "confidence": 0.85,
  "sentiment": 0.7,
  "suggestedAction": "Brief action to improve based on this feedback",
  "successPatterns": ["pattern1", "pattern2"],
  "reasoning": "Brief explanation of the analysis"
}

Focus on:
- Category: What aspect of the response this feedback addresses most
- Confidence: How confident you are in this categorization (0-1)
- Sentiment: Overall sentiment of the feedback (0=very negative, 1=very positive)
- Suggested Action: Specific improvement recommendation
- Success Patterns: If positive feedback, what patterns made it successful
`;
  }

  /**
   * Call Gemini API for feedback analysis
   */
  private static async callGeminiForAnalysis(prompt: string): Promise<string> {
    try {
      // Use existing Gemini configuration
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent analysis
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse AI response into structured analysis
   */
  private static parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category || 'helpfulness',
          confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
          sentiment: Math.min(Math.max(parsed.sentiment || 0.5, 0), 1),
          suggestedAction: parsed.suggestedAction || 'No specific action recommended',
          successPatterns: Array.isArray(parsed.successPatterns) ? parsed.successPatterns : [],
          reasoning: parsed.reasoning || 'AI analysis completed'
        };
      }
    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
    }

    // Fallback parsing
    return {
      category: 'helpfulness',
      confidence: 0.5,
      sentiment: 0.5,
      suggestedAction: 'Review feedback manually',
      successPatterns: [],
      reasoning: 'Failed to parse AI response'
    };
  }

  /**
   * Store AI analysis results in Supabase
   */
  private static async storeAIAnalysis(feedbackId: number, analysis: AIAnalysisResult): Promise<void> {
    const { error } = await supabaseAdminTyped
      .from('user_feedback')
      .update({
        ai_category: analysis.category,
        confidence_score: analysis.confidence,
        sentiment_score: analysis.sentiment,
        suggested_action: analysis.suggestedAction,
        success_patterns: analysis.successPatterns,
        ai_processed_at: new Date().toISOString()
      })
      .eq('id', feedbackId);

    if (error) {
      console.error('❌ Error storing AI analysis:', error);
      throw new Error(`Failed to store AI analysis: ${error.message}`);
    }

    console.log('✅ AI analysis stored for feedback:', feedbackId);
  }

  /**
   * Create fallback analysis when AI fails
   */
  private static createFallbackAnalysis(feedback: any): AIAnalysisResult {
    // Simple rule-based fallback
    let category: AIAnalysisResult['category'] = 'helpfulness';
    let sentiment = 0.5;

    if (feedback.emotionalTone) {
      category = 'tone';
      sentiment = feedback.emotionalTone === 'just-right' ? 0.8 : 0.3;
    } else if (feedback.responseLength) {
      category = 'length';
      sentiment = feedback.responseLength === 'just-right' ? 0.8 : 0.3;
    } else if (feedback.culturalSensitivity) {
      category = 'cultural';
      sentiment = feedback.culturalSensitivity === 'appropriate' ? 0.8 : 0.2;
    }

    if (feedback.feedbackType === 'helpful') {
      sentiment = Math.max(sentiment, 0.7);
    } else if (feedback.feedbackType === 'unhelpful') {
      sentiment = Math.min(sentiment, 0.3);
    }

    return {
      category,
      confidence: 0.6, // Medium confidence for rule-based analysis
      sentiment,
      suggestedAction: feedback.feedbackType === 'helpful' ? 
        'Analyze success patterns for replication' : 
        'Review and improve response quality',
      successPatterns: feedback.positiveAspects || [],
      reasoning: 'Rule-based fallback analysis'
    };
  }

  /**
   * Analyze prompt version performance using AI insights
   */
  static async analyzePromptVersionPerformance(): Promise<Array<{
    version: string;
    totalResponses: number;
    averageRating: number;
    averageConfidence: number;
    averageSentiment: number;
    categoryBreakdown: Record<string, number>;
    topSuccessPatterns: string[];
    improvementSuggestions: string[];
  }>> {
    try {
      const { data, error } = await supabaseAdminTyped
        .from('user_feedback')
        .select('prompt_version, feedback_type, confidence_score, sentiment_score, ai_category, success_patterns, suggested_action')
        .not('ai_processed_at', 'is', null);

      if (error) {
        throw error;
      }

      // Group by prompt version
      const versionGroups: Record<string, any[]> = {};
      (data || []).forEach(item => {
        const version = item.prompt_version || 'unknown';
        if (!versionGroups[version]) {
          versionGroups[version] = [];
        }
        versionGroups[version].push(item);
      });

      return Object.entries(versionGroups).map(([version, items]) => {
        const totalResponses = items.length;
        const helpfulCount = items.filter(item => item.feedback_type === 'helpful').length;
        const averageRating = totalResponses > 0 ? (helpfulCount / totalResponses) * 5 : 0;
        
        const confidenceScores = items.filter(item => item.confidence_score).map(item => item.confidence_score);
        const sentimentScores = items.filter(item => item.sentiment_score).map(item => item.sentiment_score);
        
        const averageConfidence = confidenceScores.length > 0 ? 
          confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length : 0;
        const averageSentiment = sentimentScores.length > 0 ? 
          sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length : 0;

        // Category breakdown
        const categoryBreakdown: Record<string, number> = {};
        items.forEach(item => {
          if (item.ai_category) {
            categoryBreakdown[item.ai_category] = (categoryBreakdown[item.ai_category] || 0) + 1;
          }
        });

        // Success patterns
        const patternCounts: Record<string, number> = {};
        items.forEach(item => {
          if (item.success_patterns) {
            item.success_patterns.forEach((pattern: string) => {
              patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
            });
          }
        });

        const topSuccessPatterns = Object.entries(patternCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([pattern]) => pattern);

        // Improvement suggestions
        const suggestionCounts: Record<string, number> = {};
        items.filter(item => item.feedback_type !== 'helpful').forEach(item => {
          if (item.suggested_action) {
            suggestionCounts[item.suggested_action] = (suggestionCounts[item.suggested_action] || 0) + 1;
          }
        });

        const improvementSuggestions = Object.entries(suggestionCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([suggestion]) => suggestion);

        return {
          version,
          totalResponses,
          averageRating,
          averageConfidence,
          averageSentiment,
          categoryBreakdown,
          topSuccessPatterns,
          improvementSuggestions
        };
      });
    } catch (error) {
      console.error('❌ Error analyzing prompt version performance:', error);
      throw new Error('Failed to analyze prompt version performance');
    }
  }

  /**
   * Identify gold standard responses based on AI analysis
   */
  static async identifyGoldStandardResponses(minSentiment: number = 0.8, minConfidence: number = 0.7): Promise<Array<{
    feedbackId: number;
    messageId: string;
    sentimentScore: number;
    confidenceScore: number;
    successPatterns: string[];
    positiveAspects: string[];
    promptVersion: string;
    userComment: string;
  }>> {
    try {
      const { data, error } = await supabaseAdminTyped
        .from('user_feedback')
        .select('id, message_id, sentiment_score, confidence_score, success_patterns, positive_aspects, prompt_version, user_comment')
        .eq('feedback_type', 'helpful')
        .gte('sentiment_score', minSentiment)
        .gte('confidence_score', minConfidence)
        .not('success_patterns', 'is', null)
        .order('sentiment_score', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return (data || []).map(item => ({
        feedbackId: item.id,
        messageId: item.message_id,
        sentimentScore: item.sentiment_score,
        confidenceScore: item.confidence_score,
        successPatterns: item.success_patterns || [],
        positiveAspects: item.positive_aspects || [],
        promptVersion: item.prompt_version || 'unknown',
        userComment: item.user_comment || ''
      }));
    } catch (error) {
      console.error('❌ Error identifying gold standard responses:', error);
      throw new Error('Failed to identify gold standard responses');
    }
  }

  /**
   * Generate prompt improvement suggestions based on AI analysis
   */
  static async generatePromptImprovements(): Promise<{
    currentVersion: string;
    overallSentiment: number;
    keyIssues: Array<{ category: string; frequency: number; suggestion: string }>;
    successPatterns: Array<{ pattern: string; frequency: number; impact: number }>;
    recommendedChanges: string[];
  }> {
    try {
      // Get recent feedback with AI analysis
      const { data, error } = await supabaseAdminTyped
        .from('user_feedback')
        .select('*')
        .not('ai_processed_at', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const recentFeedback = data || [];
      const currentVersion = process.env.PROMPT_VERSION || 'v1.0.0';

      if (recentFeedback.length === 0) {
        return {
          currentVersion,
          overallSentiment: 0.5,
          keyIssues: [],
          successPatterns: [],
          recommendedChanges: ['Collect more feedback data for analysis']
        };
      }

      // Calculate overall sentiment
      const sentimentScores = recentFeedback.filter(f => f.sentiment_score).map(f => f.sentiment_score);
      const overallSentiment = sentimentScores.length > 0 ? 
        sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length : 0.5;

      // Identify key issues
      const issueCounts: Record<string, { count: number; suggestions: string[] }> = {};
      recentFeedback.filter(f => f.sentiment_score < 0.5).forEach(feedback => {
        const category = feedback.ai_category || 'general';
        if (!issueCounts[category]) {
          issueCounts[category] = { count: 0, suggestions: [] };
        }
        issueCounts[category].count++;
        if (feedback.suggested_action) {
          issueCounts[category].suggestions.push(feedback.suggested_action);
        }
      });

      const keyIssues = Object.entries(issueCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([category, data]) => ({
          category,
          frequency: data.count,
          suggestion: data.suggestions[0] || 'Review and improve'
        }));

      // Identify success patterns
      const patternCounts: Record<string, number> = {};
      const patternImpacts: Record<string, number[]> = {};
      
      recentFeedback.filter(f => f.sentiment_score >= 0.7).forEach(feedback => {
        if (feedback.success_patterns) {
          feedback.success_patterns.forEach((pattern: string) => {
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
            if (!patternImpacts[pattern]) patternImpacts[pattern] = [];
            patternImpacts[pattern].push(feedback.sentiment_score);
          });
        }
      });

      const successPatterns = Object.entries(patternCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([pattern, frequency]) => ({
          pattern,
          frequency,
          impact: patternImpacts[pattern] ? 
            patternImpacts[pattern].reduce((sum, score) => sum + score, 0) / patternImpacts[pattern].length : 0
        }));

      // Generate recommended changes
      const recommendedChanges = [
        ...keyIssues.slice(0, 3).map(issue => `Address ${issue.category} issues: ${issue.suggestion}`),
        ...successPatterns.slice(0, 2).map(pattern => `Reinforce successful pattern: ${pattern.pattern}`)
      ];

      return {
        currentVersion,
        overallSentiment,
        keyIssues,
        successPatterns,
        recommendedChanges
      };
    } catch (error) {
      console.error('❌ Error generating prompt improvements:', error);
      throw new Error('Failed to generate prompt improvements');
    }
  }
}