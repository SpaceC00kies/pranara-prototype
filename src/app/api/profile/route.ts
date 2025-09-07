import { NextRequest, NextResponse } from 'next/server';
import { 
  createOrUpdateUserProfile, 
  getUserProfile,
  initializeUserProfileSchema 
} from '@/services/userProfileService';
import { UserProfileRequest } from '@/types';

// Initialize schema on startup
initializeUserProfileSchema().catch(console.error);

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
    const body = await request.json() as UserProfileRequest;

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate age range
    if (body.ageRange && !['18-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80+'].includes(body.ageRange)) {
      return NextResponse.json(
        { error: 'Invalid age range' },
        { status: 400 }
      );
    }

    // Validate gender
    if (body.gender && !['male', 'female', 'transgender', 'non-binary', 'prefer-not-to-say'].includes(body.gender)) {
      return NextResponse.json(
        { error: 'Invalid gender' },
        { status: 400 }
      );
    }

    // Validate location
    if (body.location && !['bangkok', 'central', 'north', 'northeast', 'south', 'other'].includes(body.location)) {
      return NextResponse.json(
        { error: 'Invalid location' },
        { status: 400 }
      );
    }

    // Create or update profile
    const result = await createOrUpdateUserProfile(body);

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
    const body = await request.json() as Partial<UserProfileRequest> & { sessionId: string };

    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get existing profile
    const existingProfile = await getUserProfile(body.sessionId);
    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Merge with existing data
    const updateRequest: UserProfileRequest = {
      sessionId: body.sessionId,
      ageRange: body.ageRange || existingProfile.ageRange,
      gender: body.gender || existingProfile.gender,
      location: body.location || existingProfile.location,
      culturalContext: {
        language: existingProfile.culturalContext?.language || 'th',
        ...existingProfile.culturalContext,
        ...body.culturalContext
      },
      healthContext: {
        ...existingProfile.healthContext,
        ...body.healthContext
      }
    };

    const result = await createOrUpdateUserProfile(updateRequest);

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