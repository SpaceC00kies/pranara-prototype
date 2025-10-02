/**
 * Individual Chat Session API
 * DELETE /api/chat/sessions/[id] - Delete specific chat session
 * PATCH /api/chat/sessions/[id] - Update specific chat session (rename)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../services/authService';
import { deleteChatSession, updateChatSession } from '../../../../../services/sessionService';

interface DeleteSessionResponse {
  success: boolean;
  message: string;
}

interface UpdateSessionRequest {
  title?: string;
}

interface UpdateSessionResponse {
  success: boolean;
  message: string;
  session?: {
    id: string;
    title: string;
    updated_at: string;
  };
}

/**
 * DELETE /api/chat/sessions/[id]
 * Delete a specific chat session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Delete the session
    const success = await deleteChatSession(sessionId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete chat session' },
        { status: 500 }
      );
    }

    const response: DeleteSessionResponse = {
      success: true,
      message: 'Chat session deleted successfully'
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Delete session API error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Chat session not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat/sessions/[id]
 * Update a specific chat session (rename)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const body: UpdateSessionRequest = await request.json();
    
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Update the session
    const updatedSession = await updateChatSession(sessionId, user.id, {
      title: body.title.trim()
    });

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Failed to update chat session' },
        { status: 500 }
      );
    }

    const response: UpdateSessionResponse = {
      success: true,
      message: 'Chat session updated successfully',
      session: {
        id: updatedSession.id,
        title: updatedSession.title,
        updated_at: updatedSession.updated_at
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Update session API error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Chat session not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update chat session' },
      { status: 500 }
    );
  }
}