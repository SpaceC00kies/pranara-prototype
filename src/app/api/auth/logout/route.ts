/**
 * User Logout API
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../services/authService';

interface LogoutResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authenticateRequest(request.headers);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // For JWT tokens, logout is handled client-side by removing the token
    // In the future, we could add token blacklisting here if needed
    
    const response: LogoutResponse = {
      success: true,
      message: 'Logged out successfully'
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Logout API error:', error);

    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

/**
 * Health check for logout endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'auth/logout',
    timestamp: new Date().toISOString()
  });
}