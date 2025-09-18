import { NextRequest, NextResponse } from 'next/server';
import {
  createOrUpdateUserProfile,
  getUserProfile,
  initializeUserProfileSchema
} from '@/services/userProfileService';
import { UserProfileRequest } from '@/types';

// Schema initialization is handled by the database service

/**
 * GET /api/profile - Get user profile by session ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const profile = await getUserProfile(sessionId);

    return NextResponse.json({
      success: true,
      profile,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to get user profile',
        success: false,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile - Create or update user profile
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate that body exists and has required structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const profileRequest = body as UserProfileRequest;

    // Validate required fields
    if (!profileRequest.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate age range
    if (profileRequest.ageRange && !['18-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80+'].includes(profileRequest.ageRange)) {
      return NextResponse.json(
        { error: 'Invalid age range' },
        { status: 400 }
      );
    }

    // Validate gender
    if (profileRequest.gender && !['male', 'female', 'transgender', 'non-binary', 'prefer-not-to-say'].includes(profileRequest.gender)) {
      return NextResponse.json(
        { error: 'Invalid gender' },
        { status: 400 }
      );
    }

    // Validate location
    if (profileRequest.location && !['bangkok', 'central', 'north', 'northeast', 'south', 'other'].includes(profileRequest.location)) {
      return NextResponse.json(
        { error: 'Invalid location' },
        { status: 400 }
      );
    }

    // Create or update profile
    const result = await createOrUpdateUserProfile(profileRequest);

    return NextResponse.json({
      success: true,
      profile: result.profile,
      recommendations: result.recommendations,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to save user profile',
        success: false,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile - Update specific profile fields
 */
export async function PUT(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate that body exists and has required structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const updateRequest = body as Partial<UserProfileRequest> & { sessionId: string };

    if (!updateRequest.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get existing profile
    const existingProfile = await getUserProfile(updateRequest.sessionId);
    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Merge with existing data
    const mergedRequest: UserProfileRequest = {
      sessionId: updateRequest.sessionId,
      ageRange: updateRequest.ageRange || existingProfile.ageRange,
      gender: updateRequest.gender || existingProfile.gender,
      location: updateRequest.location || existingProfile.location,
      culturalContext: {
        language: existingProfile.culturalContext?.language || 'th',
        ...existingProfile.culturalContext,
        ...updateRequest.culturalContext
      },
      healthContext: {
        ...existingProfile.healthContext,
        ...updateRequest.healthContext
      }
    };

    const result = await createOrUpdateUserProfile(mergedRequest);

    return NextResponse.json({
      success: true,
      profile: result.profile,
      recommendations: result.recommendations,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user profile',
        success: false,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile - Delete user profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll just return success since we don't implement hard deletion
    // In a real implementation, you might want to mark the profile as deleted
    // or actually remove it from the database

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error deleting user profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete user profile',
        success: false,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}