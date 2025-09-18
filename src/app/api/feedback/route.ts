/**
 * Feedback API Endpoint
 * Handles feedback submission and retrieval following existing API patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeedbackData, ApiResponse, ErrorResponse, ErrorCode } from '../../../types';
import { FeedbackService } from '../../../services/feedbackService';
import { isValidSessionId } from '../../../services/sessionService';
import { retryApiCall } from '../../../services/retryService';

/**
 * POST /api/feedback - Submit user feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.messageId || !body.sessionId || !body.feedbackType) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Missing required fields',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Please provide messageId, sessionId, and feedbackType',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

    // Validate session ID format (use existing validation)
    if (!isValidSessionId(body.sessionId)) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Invalid session ID format',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Session ID must be a valid format',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

    // Validate feedback type
    const validFeedbackTypes = ['helpful', 'unhelpful', 'inappropriate', 'suggestion', 'error'];
    if (!validFeedbackTypes.includes(body.feedbackType)) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Invalid feedback type',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Feedback type must be one of: ' + validFeedbackTypes.join(', '),
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

    // Create feedback data object
    const feedbackData: FeedbackData = {
      messageId: body.messageId,
      sessionId: body.sessionId,
      questionLogId: body.questionLogId,
      feedbackType: body.feedbackType,
      selectedText: body.selectedText,
      userComment: body.userComment,
      emotionalTone: body.emotionalTone,
      responseLength: body.responseLength,
      culturalSensitivity: body.culturalSensitivity,
      positiveAspects: body.positiveAspects,
      promptVersion: body.promptVersion,
      timestamp: new Date()
    };

    // Submit feedback with retry logic (following existing patterns)
    await retryApiCall(
      () => FeedbackService.submitFeedback(feedbackData),
      'feedback-submission'
    );

    console.log('✅ Feedback submitted successfully:', {
      messageId: body.messageId,
      feedbackType: body.feedbackType,
      sessionId: body.sessionId.substring(0, 8) + '...' // Log partial session ID for debugging
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Feedback submitted successfully',
        feedbackId: body.messageId // Return message ID as feedback reference
      },
      timestamp: new Date()
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Feedback submission error:', error);

    // Determine error type and response
    let errorCode: ErrorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'Failed to submit feedback';

    if (error instanceof Error) {
      if (error.message.includes('Database')) {
        errorCode = 'DATABASE_ERROR';
        errorMessage = 'Database connection failed';
      } else if (error.message.includes('validation')) {
        errorCode = 'INVALID_INPUT';
        errorMessage = 'Invalid input data';
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        error: errorMessage,
        code: errorCode,
        fallbackMessage: 'Unable to submit feedback at this time. Please try again later.',
        showLineOption: false,
        timestamp: new Date()
      } as ErrorResponse,
      timestamp: new Date()
    } as ApiResponse, { status: 500 });
  }
}

/**
 * GET /api/feedback - Get feedback data and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (type === 'analytics') {
      // Get comprehensive feedback analytics
      const analytics = await retryApiCall(
        () => FeedbackService.getFeedbackAnalytics(),
        'feedback-analytics'
      );

      return NextResponse.json({
        success: true,
        data: analytics,
        timestamp: new Date()
      } as ApiResponse);

    } else if (type === 'list') {
      // Get paginated feedback list (for admin)
      const feedbackList = await retryApiCall(
        () => FeedbackService.getFeedbackList({ limit, offset }),
        'feedback-list'
      );

      return NextResponse.json({
        success: true,
        data: feedbackList,
        timestamp: new Date()
      } as ApiResponse);

    } else if (type === 'export') {
      // Export feedback data as CSV
      const dateFrom = url.searchParams.get('dateFrom') ? new Date(url.searchParams.get('dateFrom')!) : undefined;
      const dateTo = url.searchParams.get('dateTo') ? new Date(url.searchParams.get('dateTo')!) : undefined;
      
      const exportData = await retryApiCall(
        () => FeedbackService.exportFeedback({ dateFrom, dateTo }),
        'feedback-export'
      );

      return NextResponse.json({
        success: true,
        data: exportData,
        timestamp: new Date()
      } as ApiResponse);

    } else if (type === 'positive') {
      // Get positive feedback analysis
      const positiveAnalysis = await retryApiCall(
        () => FeedbackService.analyzePositiveFeedback(),
        'positive-feedback-analysis'
      );

      return NextResponse.json({
        success: true,
        data: positiveAnalysis,
        timestamp: new Date()
      } as ApiResponse);

    } else if (type === 'prompt-versions') {
      // Get prompt version performance analysis
      const promptAnalysis = await retryApiCall(
        () => FeedbackService.analyzePromptVersionPerformance(),
        'prompt-version-analysis'
      );

      return NextResponse.json({
        success: true,
        data: promptAnalysis,
        timestamp: new Date()
      } as ApiResponse);

    } else {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Invalid query type',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Valid types: analytics, list, export, positive, prompt-versions',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Feedback GET error:', error);

    return NextResponse.json({
      success: false,
      error: {
        error: 'Failed to get feedback data',
        code: 'DATABASE_ERROR' as ErrorCode,
        fallbackMessage: 'Unable to retrieve feedback data at this time',
        showLineOption: false,
        timestamp: new Date()
      } as ErrorResponse,
      timestamp: new Date()
    } as ApiResponse, { status: 500 });
  }
}

/**
 * DELETE /api/feedback - Delete feedback item (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const feedbackId = url.searchParams.get('id');
    
    // Validate admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Authentication required',
          code: 'AUTHENTICATION_ERROR' as ErrorCode,
          fallbackMessage: 'Admin authentication required',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 401 });
    }

    const password = authHeader.substring(7);
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Invalid admin password',
          code: 'AUTHENTICATION_ERROR' as ErrorCode,
          fallbackMessage: 'Invalid admin credentials',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 401 });
    }
    
    if (!feedbackId) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Missing feedback ID',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Please provide feedback ID',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

    // Delete feedback
    await retryApiCall(
      () => FeedbackService.deleteFeedback(parseInt(feedbackId)),
      'feedback-delete'
    );

    console.log('✅ Feedback deleted successfully:', { id: feedbackId });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Feedback deleted successfully',
        feedbackId: feedbackId
      },
      timestamp: new Date()
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Feedback delete error:', error);

    return NextResponse.json({
      success: false,
      error: {
        error: 'Failed to delete feedback',
        code: 'DATABASE_ERROR' as ErrorCode,
        fallbackMessage: 'Unable to delete feedback at this time',
        showLineOption: false,
        timestamp: new Date()
      } as ErrorResponse,
      timestamp: new Date()
    } as ApiResponse, { status: 500 });
  }
}

/**
 * PUT /api/feedback - Update feedback (mark as reviewed, add admin notes)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'Missing feedback ID',
          code: 'INVALID_INPUT' as ErrorCode,
          fallbackMessage: 'Please provide feedback ID',
          showLineOption: false,
          timestamp: new Date()
        } as ErrorResponse,
        timestamp: new Date()
      } as ApiResponse, { status: 400 });
    }

    // Update feedback with admin actions
    await retryApiCall(
      () => FeedbackService.updateFeedback(body.id, {
        isReviewed: body.isReviewed,
        adminNotes: body.adminNotes
      }),
      'feedback-update'
    );

    console.log('✅ Feedback updated successfully:', {
      id: body.id,
      isReviewed: body.isReviewed
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Feedback updated successfully',
        feedbackId: body.id
      },
      timestamp: new Date()
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Feedback update error:', error);

    return NextResponse.json({
      success: false,
      error: {
        error: 'Failed to update feedback',
        code: 'DATABASE_ERROR' as ErrorCode,
        fallbackMessage: 'Unable to update feedback at this time',
        showLineOption: false,
        timestamp: new Date()
      } as ErrorResponse,
      timestamp: new Date()
    } as ApiResponse, { status: 500 });
  }
}