/**
 * User Profile Service
 * Handles user profile creation, management, and demographic-aware analysis
 */

import { 
  UserProfile, 
  UserProfileRequest, 
  UserProfileResponse,
  AgeRange,
  Gender,
  Location
} from '../types';
import { getDatabase } from './databaseService';

/**
 * Create or update user profile
 */
export async function createOrUpdateUserProfile(
  request: UserProfileRequest
): Promise<UserProfileResponse> {
  const db = await getDatabase();
  
  // Check if profile exists
  const existingProfile = await getUserProfile(request.sessionId);
  
  const now = new Date();
  const profile: UserProfile = {
    id: existingProfile?.id || crypto.randomUUID(),
    sessionId: request.sessionId,
    ageRange: request.ageRange || existingProfile?.ageRange,
    gender: request.gender || existingProfile?.gender,
    location: request.location || existingProfile?.location,
    culturalContext: {
      language: 'th' as const,
      ...existingProfile?.culturalContext,
      ...request.culturalContext
    },
    healthContext: {
      ...existingProfile?.healthContext,
      ...request.healthContext
    },
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now,
    isComplete: !!(request.ageRange && request.gender && request.location)
  };

  // Store profile in database
  await storeUserProfile(profile);

  // Generate recommendations based on profile
  const recommendations = generateProfileRecommendations(profile);

  return {
    profile,
    recommendations
  };
}

/**
 * Get user profile by session ID
 */
export async function getUserProfile(sessionId: string): Promise<UserProfile | null> {
  try {
    const db = await getDatabase();
    
    if (db['config'].type === 'kv' && db['kvClient']) {
      const profileData = await db['kvClient'].get(`profile:${sessionId}`);
      if (profileData) {
        const parsed = JSON.parse(profileData);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt)
        };
      }
    } else if (db['config'].type === 'postgres' && db['pgClient']) {
      const result = await db['pgClient'].query(
        'SELECT * FROM user_profiles WHERE session_id = $1',
        [sessionId]
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0] as Record<string, unknown>;
        return {
          id: row.id as string,
          sessionId: row.session_id as string,
          ageRange: row.age_range as AgeRange,
          gender: row.gender as Gender,
          location: row.location as Location,
          culturalContext: row.cultural_context as UserProfile['culturalContext'],
          healthContext: row.health_context as UserProfile['healthContext'],
          createdAt: row.created_at as Date,
          updatedAt: row.updated_at as Date,
          isComplete: row.is_complete as boolean
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Store user profile in database
 */
async function storeUserProfile(profile: UserProfile): Promise<void> {
  const db = await getDatabase();
  
  if (db['config'].type === 'kv' && db['kvClient']) {
    const profileData = JSON.stringify({
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    });
    
    await db['kvClient'].set(`profile:${profile.sessionId}`, profileData);
    
    // Also store by profile ID for direct access
    await db['kvClient'].set(`profile_by_id:${profile.id}`, profileData);
    
  } else if (db['config'].type === 'postgres' && db['pgClient']) {
    const query = `
      INSERT INTO user_profiles 
      (id, session_id, age_range, gender, location, cultural_context, health_context, created_at, updated_at, is_complete)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (session_id) 
      DO UPDATE SET 
        age_range = EXCLUDED.age_range,
        gender = EXCLUDED.gender,
        location = EXCLUDED.location,
        cultural_context = EXCLUDED.cultural_context,
        health_context = EXCLUDED.health_context,
        updated_at = EXCLUDED.updated_at,
        is_complete = EXCLUDED.is_complete
    `;
    
    await db['pgClient'].query(query, [
      profile.id,
      profile.sessionId,
      profile.ageRange,
      profile.gender,
      profile.location,
      JSON.stringify(profile.culturalContext),
      JSON.stringify(profile.healthContext),
      profile.createdAt,
      profile.updatedAt,
      profile.isComplete
    ]);
  }
}

/**
 * Generate personalized recommendations based on profile
 */
function generateProfileRecommendations(profile: UserProfile): UserProfileResponse['recommendations'] {
  const recommendations: UserProfileResponse['recommendations'] = {
    personalizedFeatures: [],
    culturalConsiderations: [],
  };

  // Age-specific recommendations
  if (profile.ageRange) {
    switch (profile.ageRange) {
      case '18-29':
      case '30-39':
        recommendations.suggestedMode = 'intelligence';
        recommendations.personalizedFeatures?.push('การวิจัยข้อมูลสุขภาพขั้นสูง');
        recommendations.personalizedFeatures?.push('การวางแผนการดูแลระยะยาว');
        break;
      case '40-49':
      case '50-59':
        recommendations.personalizedFeatures?.push('การเตรียมตัวสำหรับการดูแลผู้สูงอายุ');
        recommendations.personalizedFeatures?.push('ข้อมูลเกี่ยวกับโรคเรื้อรัง');
        break;
      case '60-69':
      case '70-79':
      case '80+':
        recommendations.suggestedMode = 'conversation';
        recommendations.personalizedFeatures?.push('การสนทนาที่เข้าใจและอบอุ่น');
        recommendations.personalizedFeatures?.push('คำแนะนำที่เหมาะกับวัย');
        break;
    }
  }

  // Gender-specific considerations
  if (profile.gender) {
    switch (profile.gender) {
      case 'female':
        recommendations.culturalConsiderations?.push('ความเข้าใจในบทบาทการดูแลของผู้หญิงในสังคมไทย');
        recommendations.culturalConsiderations?.push('การสนับสนุนทางอารมณ์สำหรับผู้ดูแลหญิง');
        break;
      case 'male':
        recommendations.culturalConsiderations?.push('การสนับสนุนผู้ชายในบทบาทการดูแล');
        recommendations.culturalConsiderations?.push('การปรับตัวกับความรับผิดชอบใหม่');
        break;
      case 'transgender':
      case 'non-binary':
        recommendations.culturalConsiderations?.push('การใช้ภาษาที่เคารพและเข้าใจ');
        recommendations.culturalConsiderations?.push('การสนับสนุนที่ไม่มีอคติ');
        break;
    }
  }

  // Location-specific considerations
  if (profile.location) {
    switch (profile.location) {
      case 'bangkok':
        recommendations.personalizedFeatures?.push('ข้อมูลโรงพยาบาลและสถานพยาบาลในกรุงเทพฯ');
        recommendations.personalizedFeatures?.push('บริการดูแลผู้สูงอายุในเขตเมือง');
        break;
      case 'central':
        recommendations.personalizedFeatures?.push('ทรัพยากรการดูแลในภาคกลาง');
        break;
      case 'north':
        recommendations.culturalConsiderations?.push('ความเข้าใจวัฒนธรรมล้านนา');
        recommendations.personalizedFeatures?.push('ทรัพยากรการดูแลในภาคเหนือ');
        break;
      case 'northeast':
        recommendations.culturalConsiderations?.push('ความเข้าใจวัฒนธรรมอีสาน');
        recommendations.personalizedFeatures?.push('ทรัพยากรการดูแลในภาคตะวันออกเฉียงเหนือ');
        break;
      case 'south':
        recommendations.culturalConsiderations?.push('ความเข้าใจวัฒนธรรมใต้');
        recommendations.personalizedFeatures?.push('ทรัพยากรการดูแลในภาคใต้');
        break;
    }
  }

  return recommendations;
}

/**
 * Get demographic-aware context for MCP analysis
 */
export function getDemographicContext(profile: UserProfile | null): string {
  if (!profile) return '';

  const contextParts: string[] = [];

  if (profile.ageRange) {
    const ageContexts = {
      '18-29': 'ผู้ใช้วัยหนุ่มสาว อาจเป็นลูกที่เริ่มดูแลผู้ปกครอง',
      '30-39': 'ผู้ใช้วัยทำงาน อาจมีภาระดูแลทั้งลูกและผู้สูงอายุ',
      '40-49': 'ผู้ใช้วัยกลางคน เริ่มเตรียมตัวสำหรับการดูแลผู้สูงอายุ',
      '50-59': 'ผู้ใช้วัยก่อนเกษียณ อาจเป็นผู้ดูแลหลักของผู้สูงอายุ',
      '60-69': 'ผู้ใช้วัยผู้สูงอายุตอนต้น อาจต้องการคำแนะนำสำหรับตนเองและคู่ครอง',
      '70-79': 'ผู้ใช้วัยผู้สูงอายุ ต้องการคำแนะนำที่เข้าใจง่ายและปฏิบัติได้',
      '80+': 'ผู้ใช้วัยสูงอายุมาก ต้องการการดูแลเป็นพิเศษและคำแนะนำที่อ่อนโยน'
    };
    contextParts.push(`อายุ: ${ageContexts[profile.ageRange]}`);
  }

  if (profile.gender && profile.gender !== 'prefer-not-to-say') {
    const genderContexts = {
      'male': 'เพศชาย - ใช้ภาษาที่เหมาะสมและเข้าใจบทบาทการดูแลของผู้ชาย',
      'female': 'เพศหญิง - เข้าใจภาระการดูแลที่ผู้หญิงมักรับผิดชอบในสังคมไทย',
      'transgender': 'เพศทรานส์เจนเดอร์ - ใช้ภาษาที่เคารพและไม่มีอคติ',
      'non-binary': 'เพศที่สาม - ใช้ภาษาที่เป็นกลางและเคารพความหลากหลาย'
    };
    contextParts.push(`เพศ: ${genderContexts[profile.gender]}`);
  }

  if (profile.location) {
    const locationContexts = {
      'bangkok': 'กรุงเทพฯ - มีทรัพยากรการดูแลมาก แต่อาจมีปัญหาค่าใช้จ่ายสูง',
      'central': 'ภาคกลาง - มีทรัพยากรปานกลาง เข้าถึงบริการได้ไม่ยาก',
      'north': 'ภาคเหนือ - วัฒนธรรมล้านนา ครอบครัวใหญ่ ทรัพยากรจำกัด',
      'northeast': 'ภาคอีสาน - วัฒนธรรมอีสาน ครอบครัวใหญ่ ทรัพยากรจำกัด',
      'south': 'ภาคใต้ - วัฒนธรรมใต้ อาจมีภาษาถิ่น ทรัพยากรปานกลาง',
      'other': 'พื้นที่อื่น - ต้องการข้อมูลทั่วไปที่ปรับใช้ได้หลากหลาย'
    };
    contextParts.push(`ที่อยู่: ${locationContexts[profile.location]}`);
  }

  if (profile.healthContext?.caregivingRole) {
    const roleContexts = {
      'primary': 'ผู้ดูแลหลัก - รับผิดชอบการดูแลเป็นหลัก ต้องการข้อมูลครบถ้วน',
      'secondary': 'ผู้ดูแลรอง - ช่วยเหลือเป็นครั้งคราว ต้องการข้อมูลเฉพาะเรื่อง',
      'family-member': 'สมาชิกครอบครัว - ต้องการเข้าใจสถานการณ์และวิธีช่วยเหลือ',
      'professional': 'ผู้เชี่ยวชาญ - ต้องการข้อมูลเชิงลึกและหลักฐานทางวิทยาศาสตร์'
    };
    contextParts.push(`บทบาท: ${roleContexts[profile.healthContext.caregivingRole]}`);
  }

  return contextParts.join('\n');
}

/**
 * Initialize database schema for user profiles (Postgres)
 */
export async function initializeUserProfileSchema(): Promise<void> {
  const db = await getDatabase();
  
  if (db['config'].type !== 'postgres' || !db['pgClient']) {
    return; // KV doesn't need schema initialization
  }

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS user_profiles (
      id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(64) UNIQUE NOT NULL,
      age_range VARCHAR(10),
      gender VARCHAR(20),
      location VARCHAR(20),
      cultural_context JSONB,
      health_context JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      is_complete BOOLEAN DEFAULT FALSE
    );

    CREATE INDEX IF NOT EXISTS idx_user_profiles_session_id ON user_profiles(session_id);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_age_range ON user_profiles(age_range);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON user_profiles(gender);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
  `;

  await db['pgClient'].query(createTableQuery);
}

/**
 * Get profile completion status
 */
export function getProfileCompletionStatus(profile: UserProfile | null): {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
} {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: ['ageRange', 'gender', 'location'],
      completionPercentage: 0
    };
  }

  const requiredFields = ['ageRange', 'gender', 'location'];
  const missingFields = requiredFields.filter(field => !profile[field as keyof UserProfile]);
  const completionPercentage = ((requiredFields.length - missingFields.length) / requiredFields.length) * 100;

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage
  };
}