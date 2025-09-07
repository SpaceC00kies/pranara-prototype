/**
 * Health Intelligence Service Tests
 */

import { healthIntelligenceService } from '../healthIntelligenceService';
import { MCPAnalysisRequest, UserProfile, AppMode } from '../../types';

// Mock MCP tools
jest.mock('../../lib/mcp', () => ({
  mcp_sequential_thinking_sequentialthinking: jest.fn(),
  mcp_Context7_resolve_library_id: jest.fn(),
  mcp_Context7_get_library_docs: jest.fn(),
  mcp_duckduckgo_search: jest.fn(),
  isMCPAvailable: jest.fn(() => true),
  getMCPStatus: jest.fn(() => Promise.resolve({
    sequentialThinking: true,
    context7: true,
    duckduckgo: true
  }))
}));

// Mock user profile service
jest.mock('../userProfileService', () => ({
  getDemographicContext: jest.fn((profile) => {
    if (!profile) return '';
    return `Age: ${profile.ageRange}, Gender: ${profile.gender}, Location: ${profile.location}`;
  })
}));

// Mock analytics service
jest.mock('../analyticsService', () => ({
  classifyTopic: jest.fn(() => ({ topic: 'general', confidence: 0.8 }))
}));

describe('HealthIntelligenceService', () => {
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
      primaryConcerns: ['diabetes', 'fall prevention'],
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeHealthQuery', () => {
    it('should perform comprehensive health intelligence analysis', async () => {
      // Mock MCP tool responses
      const { mcp_sequential_thinking_sequentialthinking, mcp_Context7_resolve_library_id, mcp_Context7_get_library_docs, mcp_duckduckgo_search } = require('../../lib/mcp');
      
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์อาการปวดเข่าในผู้สูงอายุ: ควรพิจารณาสาเหตุ ความรุนแรง และวิธีการดูแล',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      mcp_Context7_resolve_library_id.mockResolvedValue('/geriatrics/care-guidelines');
      
      mcp_Context7_get_library_docs.mockResolvedValue(`
แนวทางการดูแลผู้สูงอายุ:
1. การประเมินอาการปวดเข่า
2. การจัดการโรคข้อเข่าเสื่อม
3. การป้องกันการล้ม
      `);

      mcp_duckduckgo_search.mockResolvedValue([
        {
          title: 'การดูแลอาการปวดเข่าในผู้สูงอายุ',
          snippet: 'คำแนะนำการดูแลและการรักษาอาการปวดเข่า',
          url: 'https://example.com/knee-pain'
        }
      ]);

      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result).toBeDefined();
      expect(result.response).toContain('การวิเคราะห์สุขภาพอัจฉริยะ');
      expect(result.topic).toBe('general');
      expect(result.confidence).toBe(0.8);
      expect(result.demographicInsights).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.mcpToolsUsed).toContain('sequential-thinking');
      expect(result.mcpToolsUsed).toContain('context7');
      expect(result.mcpToolsUsed).toContain('duckduckgo');
    });

    it('should handle conversation mode differently from intelligence mode', async () => {
      const conversationRequest = {
        ...mockAnalysisRequest,
        context: {
          ...mockAnalysisRequest.context,
          currentMode: 'conversation' as AppMode
        }
      };

      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์เบื้องต้น',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      const result = await healthIntelligenceService.analyzeHealthQuery(conversationRequest);

      expect(result.response).not.toContain('## การวิเคราะห์สุขภาพอัจฉริยะ');
      expect(result.response).toContain('เข้าใจความกังวลของคุณค่ะ');
    });

    it('should provide demographic-specific insights', async () => {
      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.demographicInsights?.ageSpecificConsiderations).toBeDefined();
      expect(result.demographicInsights?.genderSpecificConsiderations).toBeDefined();
      expect(result.demographicInsights?.locationSpecificResources).toBeDefined();
      
      // Check age-specific considerations for 60-69 age group
      expect(result.demographicInsights?.ageSpecificConsiderations).toContain('การปรับตัวเข้ากับการเปลี่ยนแปลงทางร่างกาย');
      
      // Check gender-specific considerations for female
      expect(result.demographicInsights?.genderSpecificConsiderations).toContain('การสนับสนุนผู้หญิงในบทบาทผู้ดูแลหลัก');
      
      // Check location-specific resources for Bangkok
      expect(result.demographicInsights?.locationSpecificResources).toContain('โรงพยาบาลรามาธิบดี');
    });

    it('should provide appropriate recommendations based on mode', async () => {
      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result.recommendations?.suggestedActions).toBeDefined();
      expect(result.recommendations?.followUpQuestions).toBeDefined();
      
      // Intelligence mode should have more analytical recommendations
      expect(result.recommendations?.suggestedActions).toContain('รวบรวมข้อมูลประวัติสุขภาพอย่างครบถ้วน');
      expect(result.recommendations?.followUpQuestions).toContain('ต้องการข้อมูลเปรียบเทียบตัวเลือกการรักษาหรือไม่?');
    });

    it('should handle MCP tool failures gracefully', async () => {
      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockRejectedValue(new Error('MCP tool failed'));

      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.mcpToolsUsed).toContain('fallback-analysis');
    });

    it('should handle missing user profile', async () => {
      const requestWithoutProfile = {
        ...mockAnalysisRequest,
        context: {
          ...mockAnalysisRequest.context,
          userProfile: undefined
        }
      };

      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      const result = await healthIntelligenceService.analyzeHealthQuery(requestWithoutProfile);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      // Should still provide basic insights even without profile
      expect(result.demographicInsights).toBeDefined();
    });

    it('should classify different health topics correctly', async () => {
      const { classifyTopic } = require('../analyticsService');
      classifyTopic.mockReturnValue({ topic: 'diabetes', confidence: 0.9 });

      const diabetesRequest = {
        ...mockAnalysisRequest,
        message: 'แม่เป็นเบาหวาน ควรกินอาหารอย่างไร'
      };

      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์เรื่องเบาหวาน',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      const result = await healthIntelligenceService.analyzeHealthQuery(diabetesRequest);

      expect(result.topic).toBe('diabetes');
      expect(result.confidence).toBe(0.9);
    });

    it('should provide different responses for different locations', async () => {
      const northernProfile = {
        ...mockUserProfile,
        location: 'north' as const
      };

      const northernRequest = {
        ...mockAnalysisRequest,
        context: {
          ...mockAnalysisRequest.context,
          userProfile: northernProfile
        }
      };

      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      const result = await healthIntelligenceService.analyzeHealthQuery(northernRequest);

      expect(result.demographicInsights?.locationSpecificResources).toContain('โรงพยาบาลมหาราชนครเชียงใหม่');
    });

    it('should handle emergency situations appropriately', async () => {
      const { classifyTopic } = require('../analyticsService');
      classifyTopic.mockReturnValue({ topic: 'emergency', confidence: 0.95 });

      const emergencyRequest = {
        ...mockAnalysisRequest,
        message: 'แม่หมดสติ หายใจไม่ออก'
      };

      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'สถานการณ์ฉุกเฉิน',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      const result = await healthIntelligenceService.analyzeHealthQuery(emergencyRequest);

      expect(result.topic).toBe('emergency');
      expect(result.recommendations?.escalationSuggestions).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid analysis requests', async () => {
      const invalidRequest = {
        message: '',
        context: {
          currentMode: 'intelligence' as AppMode,
          sessionMetadata: {
            sessionId: '',
            messageCount: 0,
            duration: 0,
            language: 'th' as const
          }
        },
        analysisType: 'health-intelligence' as const
      };

      const result = await healthIntelligenceService.analyzeHealthQuery(invalidRequest);

      expect(result).toBeDefined();
      expect(result.mcpToolsUsed).toContain('fallback-analysis');
    });

    it('should handle network errors gracefully', async () => {
      const { mcp_duckduckgo_search } = require('../../lib/mcp');
      mcp_duckduckgo_search.mockRejectedValue(new Error('Network error'));

      const result = await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      const { mcp_sequential_thinking_sequentialthinking } = require('../../lib/mcp');
      mcp_sequential_thinking_sequentialthinking.mockResolvedValue({
        thought: 'การวิเคราะห์',
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1
      });

      await healthIntelligenceService.analyzeHealthQuery(mockAnalysisRequest);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});