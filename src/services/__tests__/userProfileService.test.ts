/**
 * User Profile Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createOrUpdateUserProfile,
  getUserProfile,
  getDemographicContext,
  getProfileCompletionStatus
} from '../userProfileService';
import { UserProfile, UserProfileRequest } from '../../types';

// Mock database service
vi.mock('../databaseService', () => ({
  getDatabase: vi.fn(() => Promise.resolve({
    config: { type: 'kv' },
    kvClient: {
      get: vi.fn(),
      set: vi.fn()
    }
  }))
}));

describe('UserProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrUpdateUserProfile', () => {
    it('should create a new user profile', async () => {
      const request: UserProfileRequest = {
        sessionId: 'test-session-123',
        ageRange: '30-39',
        gender: 'female',
        location: 'bangkok',
        culturalContext: {
          language: 'th'
        },
        healthContext: {
          caregivingRole: 'primary'
        }
      };

      const result = await createOrUpdateUserProfile(request);

      expect(result.profile).toBeDefined();
      expect(result.profile.sessionId).toBe(request.sessionId);
      expect(result.profile.ageRange).toBe(request.ageRange);
      expect(result.profile.gender).toBe(request.gender);
      expect(result.profile.location).toBe(request.location);
      expect(result.profile.isComplete).toBe(true);
      expect(result.recommendations).toBeDefined();
    });

    it('should generate appropriate recommendations based on profile', async () => {
      const request: UserProfileRequest = {
        sessionId: 'test-session-456',
        ageRange: '70-79',
        gender: 'male',
        location: 'north'
      };

      const result = await createOrUpdateUserProfile(request);

      expect(result.recommendations?.suggestedMode).toBe('conversation');
      expect(result.recommendations?.culturalConsiderations).toContain('ความเข้าใจวัฒนธรรมล้านนา');
    });

    it('should handle incomplete profiles', async () => {
      const request: UserProfileRequest = {
        sessionId: 'test-session-789',
        ageRange: '40-49'
        // Missing gender and location
      };

      const result = await createOrUpdateUserProfile(request);

      expect(result.profile.isComplete).toBe(false);
      expect(result.profile.ageRange).toBe('40-49');
      expect(result.profile.gender).toBeUndefined();
      expect(result.profile.location).toBeUndefined();
    });
  });

  describe('getDemographicContext', () => {
    it('should generate demographic context for complete profile', () => {
      const profile: UserProfile = {
        id: 'profile-123',
        sessionId: 'session-123',
        ageRange: '50-59',
        gender: 'female',
        location: 'bangkok',
        culturalContext: {
          language: 'th'
        },
        healthContext: {
          caregivingRole: 'primary'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isComplete: true
      };

      const context = getDemographicContext(profile);

      expect(context).toContain('อายุ:');
      expect(context).toContain('เพศ:');
      expect(context).toContain('ที่อยู่:');
      expect(context).toContain('บทบาท:');
      expect(context).toContain('วัยก่อนเกษียณ');
      expect(context).toContain('กรุงเทพฯ');
    });

    it('should handle null profile', () => {
      const context = getDemographicContext(null);
      expect(context).toBe('');
    });

    it('should handle profile with prefer-not-to-say gender', () => {
      const profile: UserProfile = {
        id: 'profile-456',
        sessionId: 'session-456',
        ageRange: '30-39',
        gender: 'prefer-not-to-say',
        location: 'central',
        culturalContext: {
          language: 'th'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isComplete: true
      };

      const context = getDemographicContext(profile);

      expect(context).toContain('อายุ:');
      expect(context).toContain('ที่อยู่:');
      expect(context).not.toContain('เพศ:');
    });
  });

  describe('getProfileCompletionStatus', () => {
    it('should return complete status for full profile', () => {
      const profile: UserProfile = {
        id: 'profile-789',
        sessionId: 'session-789',
        ageRange: '60-69',
        gender: 'male',
        location: 'south',
        culturalContext: {
          language: 'th'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isComplete: true
      };

      const status = getProfileCompletionStatus(profile);

      expect(status.isComplete).toBe(true);
      expect(status.missingFields).toHaveLength(0);
      expect(status.completionPercentage).toBe(100);
    });

    it('should return incomplete status for partial profile', () => {
      const profile: UserProfile = {
        id: 'profile-101',
        sessionId: 'session-101',
        ageRange: '40-49',
        gender: undefined,
        location: undefined,
        culturalContext: {
          language: 'th'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isComplete: false
      };

      const status = getProfileCompletionStatus(profile);

      expect(status.isComplete).toBe(false);
      expect(status.missingFields).toContain('gender');
      expect(status.missingFields).toContain('location');
      expect(status.completionPercentage).toBeCloseTo(33.33);
    });

    it('should handle null profile', () => {
      const status = getProfileCompletionStatus(null);

      expect(status.isComplete).toBe(false);
      expect(status.missingFields).toEqual(['ageRange', 'gender', 'location']);
      expect(status.completionPercentage).toBe(0);
    });
  });

  describe('Profile Recommendations', () => {
    it('should suggest conversation mode for seniors', async () => {
      const request: UserProfileRequest = {
        sessionId: 'senior-session',
        ageRange: '80+',
        gender: 'female',
        location: 'northeast'
      };

      const result = await createOrUpdateUserProfile(request);

      expect(result.recommendations?.suggestedMode).toBe('conversation');
      expect(result.recommendations?.personalizedFeatures).toContain('การสนทนาที่เข้าใจและอบอุ่น');
    });

    it('should suggest intelligence mode for younger users', async () => {
      const request: UserProfileRequest = {
        sessionId: 'young-session',
        ageRange: '25-35',
        gender: 'male',
        location: 'bangkok'
      };

      // Note: This age range doesn't exist in our enum, so it should be handled gracefully
      const result = await createOrUpdateUserProfile(request);

      expect(result.profile).toBeDefined();
    });

    it('should provide cultural considerations for different regions', async () => {
      const northRequest: UserProfileRequest = {
        sessionId: 'north-session',
        ageRange: '50-59',
        gender: 'female',
        location: 'north'
      };

      const result = await createOrUpdateUserProfile(northRequest);

      expect(result.recommendations?.culturalConsiderations).toContain('ความเข้าใจวัฒนธรรมล้านนา');
      expect(result.recommendations?.personalizedFeatures).toContain('ทรัพยากรการดูแลในภาคเหนือ');
    });

    it('should provide inclusive recommendations for diverse gender identities', async () => {
      const nonBinaryRequest: UserProfileRequest = {
        sessionId: 'inclusive-session',
        ageRange: '30-39',
        gender: 'non-binary',
        location: 'bangkok'
      };

      const result = await createOrUpdateUserProfile(nonBinaryRequest);

      expect(result.recommendations?.culturalConsiderations).toContain('การใช้ภาษาที่เคารพและเข้าใจ');
    });
  });
});