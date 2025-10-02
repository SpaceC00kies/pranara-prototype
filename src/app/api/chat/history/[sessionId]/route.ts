/**
 * Chat History API
 * GET /api/chat/history/[sessionId] - Get chat messages for a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../services/authService';
import { getChatMessages } from '../../../../../services/sessionService';

interface ChatHistoryResponse {
  messages: Array<{
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: string;
    topic?: string;
  }>;
  session_id: string;
  total_count: number;
}

/**
 * GET /api/chat/history/[sessionId]
 * Get chat messages for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request.headers);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get chat messages
    const messages = await getChatMessages(sessionId, user.id, limit);

    const response: ChatHistoryResponse = {
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        topic: msg.topic
      })),
      session_id: sessionId,
      total_count: messages.length
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get chat history API error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Chat session not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}