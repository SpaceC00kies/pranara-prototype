/**
 * Health Intelligence Service Integration Tests
 * Tests the service without relying on actual MCP tools
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { MCPAnalysisRequest, UserProfile, AppMode } from '../../types';

// Mock the MCP library to avoid import errors
vi.mock('../../lib/mcp', () => ({
  mcp_sequential_thinking_sequentialthinking: vi.fn().mockResolvedValue({
    thought: 'การวิเคราะห์เบื้องต้น: ควรพิจารณาปัจจัยต่างๆ ที่เกี่ยวข้อง',
    nextThoughtNeeded: false,
    thoughtNumber: 1,
    totalThoughts: 1
  }),
  mcp_Context7_resolve_library_id: vi.fn().mockResolvedValue('/health/general-guidelines'),
  mcp_Context7_get_library_docs: vi.fn().mockResolvedValue('ข้อมูลสุขภาพเบื้องต้น'),
  mcp_duckduckgo_search: vi.fn().mockResolvedValue([
    {
      title: 'ข้อมูลสุขภาพ',
      snippet: 'คำแนะนำการดูแลสุขภาพ',
      url: 'https://example.com'
    }
  ]),
  isMCPAvailable: vi.fn(() => true),
  getMCPStatus: vi.fn(() => Promise.resolve({
    sequentialThinking: true,
    context7: true,
    duckduckgo: true
  }))
}));

// Mock other services
vi.mock('../userProfileService', () => ({
  getDemographicContext: vi.fn((profile) => {
    if (!profile) return '';
    return `Age: ${profile.ageRange}, Gender: ${profile.gender}`;
  })
}));

vi.mock('../analyticsService', () => ({
  classifyTopic: vi.fn(() => ({ topic: 'general', confidence: 0.8 }))
}));

describe('HealthIntelligenceService Integration', () => {
  let healthIntelligenceService: any;

  beforeAll(async () => {
    // Import the service after mocks are set up
    const serviceModule = await import('../healthIntelligenceService');
    healthIntelligenceService = serviceModule.healthIntelligenceService;
  });

  const mockUserProfile: UserProfile = {
    id: 'test-profile',
    sessionId: 'test-session',
    ageRange: '60-69',
    gender: 'female',
    location: 'bangkok',
    culturalContext: {
      language: 'th',
      region: 'central',
      familyStructure: 'extended'
    },
    healthContext: {
      primaryConcerns: ['diabetes'],
      caregivingRole: 'primary',
      experienceLevel: 'intermediate'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isComplete: true
  };

  const mockAnalysisRequest: MCPAnalysisRequest = {
    message: 'แม่มีอาการปวดเข่า ควรทำอย่างไร',
    context: {
      userProfile: mockUserProfile,
      currentMode: 'intelligence' as AppMode,
      sessionMetadata: {
        sessionId: 'test-session',
        messageCount: 1,
        duration: 0,
        language: 'th'
      }
    },
    analysisType: 'health-intelligence'
  };

  describe('Basic Functionality', () => {
    it('should analyze health queries successfully', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.topic).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.mcpToolsUsed).toBeDefined();
      expect(Array.isArray(result.mcpToolsUsed)).toBe(true);
    });

    it('should provide demographic insights', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.demographicInsights).toBeDefined();
      expect(result.demographicInsights?.ageSpecificConsiderations).toBeDefined();
      expect(result.demographicInsights?.genderSpecificConsiderations).toBeDefined();
      expect(result.demographicInsights?.locationSpecificResources).toBeDefined();
    });

    it('should provide actionable recommendations', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations?.suggestedActions).toBeDefined();
      expect(result.recommendations?.followUpQuestions).toBeDefined();
      expect(Array.isArray(result.recommendations?.suggestedActions)).toBe(true);
      expect(Array.isArray(result.recommendations?.followUpQuestions)).toBe(true);
    });

    it('should handle conversation mode differently', async () => {
      const conversationRequest = {
        ...mockAnalysisRequest,
        context: {
          ...mockAnalysisRequest.context,
          currentMode: 'conversation' as AppMode
        }
      };

      const result = await healthIntelligenceService.analyzeHealthQuery(conversationRequest);

      expect(result.response).toBeDefined();
      expect(result.response).toContain('เข้าใจความกังวลของคุณค่ะ');
    });

    it('should handle intelligence mode with detailed analysis', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.response).toContain('การวิเคราะห์สุขภาพอัจฉริยะ');
      expect(result.response).toContain('การประเมินเบื้องต้น');
    });
  });

  describe('Demographic Awareness', () => {
    it('should provide age-appropriate recommendations for elderly users', async () => {
      const elderlyProfile = {
        ...mockUserProfile,
        ageRange: '70-79' as const
      };

      const elderlyRequest = {
        ...mockAnalysisRequest,
        context: {
          ...mockAnalysisRequest.context,
          userProfile: elderlyProfile
        }
      };

      const result = await healthIntelligenceService.analyzeHealthQuery(elderlyRequest);

      expect(result.demographicInsights?.ageSpecificConsiderations).toContain(
        'การจัดการกับโรคเรื้อรังหลายโรค'
      );
    });

    it('should provide gender-specific considerations', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.demographicInsights?.genderSpecificConsiderations).toContain(
        'การสนับสนุนผู้หญิงในบทบาทผู้ดูแลหลัก'
      );
    });

    it('should provide location-specific resources', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.demographicInsights?.locationSpecificResources).toContain(
        'โรงพยาบาลรามาธิบดี'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user profile gracefully', async () => {
      const requestWithoutProfile = {
        ...mockAnalysisRequest,
        context: {
          ...mockAnalysisRequest.context,
          userProfile: undefined
        }
      };

      const result = await healthIntelligenceService.analyzeHealthQuery(requestWithoutProfile);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
    });

    it('should handle empty messages', async () => {
      const emptyRequest = {
        ...mockAnalysisRequest,
        message: ''
      };

      const result = await healthIntelligenceService.analyzeHealthQuery(emptyRequest);

      expect(result).toBeDefined();
      expect(result.mcpToolsUsed).toContain('fallback-analysis');
    });
  });

  describe('Response Quality', () => {
    it('should provide responses in Thai language', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.response).toMatch(/[ก-๙]/); // Contains Thai characters
    });

    it('should include safety disclaimers for intelligence mode', async () => {
      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.response).toContain('ข้อมูลนี้ได้จากการวิเคราะห์ด้วย AI');
    });

    it('should suggest LINE contact for conversation mode', async () => {
      const conversationRequest = {
        ...mockAnalysisRequest,
        context: {
          ...mockAnalysisRequest.context,
          currentMode: 'conversation' as AppMode
        }
      };

      const result = await healthIntelligenceService.analyzeHealthQuery(conversationRequest);

      expect(result.response).toContain('คุยกับทีม Jirung ทาง LINE');
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});