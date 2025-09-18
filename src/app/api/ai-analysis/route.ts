/**
 * AI Analysis API
 * Provides endpoints for AI-powered feedback analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '../../../services/aiAnalysisService';
import { retryApiCall } from '../../../services/retryService';
import { ApiResponse, ErrorResponse, ErrorCode } from '../../../types';

/**
 * POST /api/ai-analysis - Trigger AI analysis for feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedbackIds, action } = body;

    if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Invalid feedback IDs',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Please provide valid feedback IDs',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

    let result;

    if (action === 'batch-analyze') {
      // Batch analyze multiple feedback items
      result = await retryApiCall(
        () => AIAnalysisService.batchAnalyzeFeedback(feedbackIds),
        'ai-batch-analysis'
      );
    } else {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Invalid action',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Valid actions: batch-analyze',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

    console.log('✅ AI analysis completed:', {
      action,
      processed: result.processed,
      failed: result.failed
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'AI analysis completed',
        processed: result.processed,
        failed: result.failed,
        results: result.results
      },
      timestamp: new Date()
    } as ApiResponse);

  } catch (error) {
    console.error('❌ AI analysis error:', error);

    return NextResponse.json({
      success: false,
      error: {
        error: 'AI analysis failed',
        code: 'AI_ERROR' as ErrorCode,
        fallbackMessage: 'Unable to analyze feedback at this time',
        showLineOption: false,
        timestamp: new Date()
      } as ErrorResponse,
      timestamp: new Date()
    } as ApiResponse, { status: 500 });
  }
}

/**
 * GET /api/ai-analysis - Get AI analysis insights and results
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'insights') {
      // Get AI analysis insights
      const insights = await retryApiCall(
        () => AIAnalysisService.getAIInsights(),
        'ai-insights'
      );

      return NextResponse.json({
        success: true,
        data: insights,
        timestamp: new Date()
      } as ApiResponse);

    } else if (type === 'prompt-analysis') {
      // Get prompt version performance analysis
      const promptAnalysis = await retryApiCall(
        () => AIAnalysisService.analyzePromptVersionPerformance(),
        'prompt-analysis'
      );

      return NextResponse.json({
        success: true,
        data: promptAnalysis,
        timestamp: new Date()
      } as ApiResponse);

    } else if (type === 'gold-standard') {
      // Get gold standard responses
      const minSentiment = parseFloat(url.searchParams.get('minSentiment') || '0.8');
      const minConfidence = parseFloat(url.searchParams.get('minConfidence') || '0.7');
      
      const goldStandard = await retryApiCall(
        () => AIAnalysisService.identifyGoldStandardResponses(minSentiment, minConfidence),
        'gold-standard'
      );

      return NextResponse.json({
        success: true,
        data: goldStandard,
        timestamp: new Date()
      } as ApiResponse);

    } else if (type === 'prompt-improvements') {
      // Get prompt improvement suggestions
      const improvements = await retryApiCall(
        () => AIAnalysisService.generatePromptImprovements(),
        'prompt-improvements'
      );

      return NextResponse.json({
        success: true,
        data: improvements,
        timestamp: new Date()
      } as ApiResponse);

    } else {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Invalid query type',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Valid types: insights, prompt-analysis, gold-standard, prompt-improvements',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

  } catch (error) {
    console.error('❌ AI analysis GET error:', error);

    return NextResponse.json({
      success: false,
      error: {
        error: 'Failed to get AI analysis data',
        code: 'AI_ERROR' as ErrorCode,
        fallbackMessage: 'Unable to retrieve AI analysis at this time',
        showLineOption: false,
        timestamp: new Date()
      } as ErrorResponse,
      timestamp: new Date()
    } as ApiResponse, { status: 500 });
  }
}