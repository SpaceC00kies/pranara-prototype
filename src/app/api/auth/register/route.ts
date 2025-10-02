/**
 * User Registration API
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '../../../../services/authService';
import { supabaseAdminTyped } from '../../../../lib/supabase';

interface RegisterRequest {
  username: string;
  password: string;
  display_name?: string;
}

interface RegisterResponse {
  user: {
    id: string;
    username: string;
    display_name: string;
    created_at: string;
  };
  auth_token: string;
  chat_session: {
    id: string;
    title: string;
    created_at: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate request body
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Register user
    const { user, token } = await registerUser(
      body.username,
      body.password,
      body.display_name
    );

    // Create first chat session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdminTyped
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: 'New Chat'
      })
      .select('id, title, created_at')
      .single();

    if (sessionError) {
      console.error('Failed to create initial chat session:', sessionError);
      // Don't fail registration if session creation fails
    }

    const response: RegisterResponse = {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        created_at: user.created_at
      },
      auth_token: token,
      chat_session: sessionData ? {
        id: sessionData.id,
        title: sessionData.title,
        created_at: sessionData.created_at
      } : {
        id: '',
        title: 'New Chat',
        created_at: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

/**
 * Health check for registration endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'auth/register',
    timestamp: new Date().toISOString()
  });
}