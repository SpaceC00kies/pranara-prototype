/**
 * Chat Sessions API
 * GET /api/chat/sessions - List user's chat sessions
 * POST /api/chat/sessions - Create new chat session
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../services/authService';
import { 
  getUserChatSessions, 
  createChatSession,
  ChatSession 
} from '../../../../services/sessionService';

interface SessionsResponse {
  sessions: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    is_active: boolean;
  }>;
}

interface CreateSessionRequest {
  title?: string;
}

interface CreateSessionResponse {
  session: {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
  };
}

/**
 * GET /api/chat/sessions
 * List all chat sessions for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request.headers);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's chat sessions
    const sessions = await getUserChatSessions(user.id);

    const response: SessionsResponse = {
      sessions: sessions.map(session => ({
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: session.message_count || 0,
        is_active: true
      }))
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/sessions
 * Create a new chat session for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request.headers);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateSessionRequest = await request.json();

    // Create new chat session
    const session = await createChatSession(
      user.id,
      body.title || 'New Chat'
    );

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create chat session' },
        { status: 500 }
      );
    }

    const response: CreateSessionResponse = {
      session: {
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: 0
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Create session API error:', error);

    if (error instanceof Error && error.message.includes('Maximum')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}