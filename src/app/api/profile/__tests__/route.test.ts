/**
 * Profile API Route Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';

// Mock the user profile service
vi.mock('../../../../services/userProfileService', () => ({
  getUserProfile: vi.fn(),
  createOrUpdateUserProfile: vi.fn(),
  initializeUserProfileSchema: vi.fn(() => Promise.resolve())
}));

import { getUserProfile, createOrUpdateUserProfile } from '../../../../services/userProfileService';

describe('/api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('should return user profile when sessionId is provided', async () => {
      const mockProfile = {
        id: 'profile-123',
        sessionId: 'session-123',
        ageRange: '30-39',
        gender: 'female',
        location: 'bangkok',
        isComplete: true
      };

      (getUserProfile as any).mockResolvedValue(mockProfile);

      const request = new NextRequest('http://localhost/api/profile?sessionId=session-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile).toEqual(mockProfile);
    });

    it('should return 400 when sessionId is missing', async () => {
      const request = new NextRequest('http://localhost/api/profile');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
    });

    it('should return null profile when not found', async () => {
      (getUserProfile as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/profile?sessionId=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile).toBeNull();
    });
  });

  describe('POST /api/profile', () => {
    it('should create new profile with valid data', async () => {
      const mockResult = {
        profile: {
          id: 'profile-456',
          sessionId: 'session-456',
          ageRange: '50-59',
          gender: 'male',
          location: 'north',
          isComplete: true
        },
        recommendations: {
          suggestedMode: 'conversation',
          personalizedFeatures: ['feature1'],
          culturalConsiderations: ['consideration1']
        }
      };

      (createOrUpdateUserProfile as any).mockResolvedValue(mockResult);

      const requestBody = {
        sessionId: 'session-456',
        ageRange: '50-59',
        gender: 'male',
        location: 'north'
      };

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile).toEqual(mockResult.profile);
      expect(data.recommendations).toEqual(mockResult.recommendations);
    });

    it('should return 400 when sessionId is missing', async () => {
      const requestBody = {
        ageRange: '30-39',
        gender: 'female'
      };

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
    });

    it('should return 400 for invalid age range', async () => {
      const requestBody = {
        sessionId: 'session-789',
        ageRange: 'invalid-age',
        gender: 'female',
        location: 'bangkok'
      };

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid age range');
    });

    it('should return 400 for invalid gender', async () => {
      const requestBody = {
        sessionId: 'session-101',
        ageRange: '30-39',
        gender: 'invalid-gender',
        location: 'bangkok'
      };

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid gender');
    });

    it('should return 400 for invalid location', async () => {
      const requestBody = {
        sessionId: 'session-202',
        ageRange: '30-39',
        gender: 'female',
        location: 'invalid-location'
      };

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid location');
    });
  });

  describe('PUT /api/profile', () => {
    it('should update existing profile', async () => {
      const existingProfile = {
        id: 'profile-303',
        sessionId: 'session-303',
        ageRange: '40-49',
        gender: 'female',
        location: 'central',
        isComplete: true
      };

      const updatedResult = {
        profile: {
          ...existingProfile,
          ageRange: '50-59'
        },
        recommendations: {}
      };

      (getUserProfile as any).mockResolvedValue(existingProfile);
      (createOrUpdateUserProfile as any).mockResolvedValue(updatedResult);

      const requestBody = {
        sessionId: 'session-303',
        ageRange: '50-59'
      };

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile.ageRange).toBe('50-59');
    });

    it('should return 404 when profile not found', async () => {
      (getUserProfile as any).mockResolvedValue(null);

      const requestBody = {
        sessionId: 'nonexistent-session',
        ageRange: '30-39'
      };

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Profile not found');
    });
  });

  describe('DELETE /api/profile', () => {
    it('should delete profile successfully', async () => {
      const request = new NextRequest('http://localhost/api/profile?sessionId=session-404');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Profile deleted successfully');
    });

    it('should return 400 when sessionId is missing', async () => {
      const request = new NextRequest('http://localhost/api/profile');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (getUserProfile as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/profile?sessionId=session-error');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get user profile');
    });

    it('should handle invalid JSON in POST request', async () => {
      const request = new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });
});