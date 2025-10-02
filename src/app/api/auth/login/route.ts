/**
 * User Login API
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '../../../../services/authService';
import { supabaseAdminTyped } from '../../../../lib/supabase';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    username: string;
    display_name: string;
    last_active: string;
  };
  auth_token: string;
  chat_sessions: Array<{
    id: string;
    title: string;
    updated_at: string;
    message_count: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // Validate request body
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Login user
    const { user, token } = await loginUser(body.username, body.password);

    // Get user's chat sessions
    const { data: sessionsData, error: sessionsError } = await supabaseAdminTyped
      .from('chat_sessions')
      .select(`
        id,
        title,
        updated_at,
        chat_messages(count)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(3); // Max 3 sessions

    let chatSessions = [];
    if (!sessionsError && sessionsData) {
      chatSessions = sessionsData.map(session => ({
        id: session.id,
        title: session.title,
        updated_at: session.updated_at,
        message_count: Array.isArray(session.chat_messages) ? session.chat_messages.length : 0
      }));
    }

    const response: LoginResponse = {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        last_active: user.last_active
      },
      auth_token: token,
      chat_sessions: chatSessions
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

/**
 * Health check for login endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'auth/login',
    timestamp: new Date().toISOString()
  });
}