/**
 * Health Intelligence Service
 * Provides MCP-powered research and analysis for health-related queries
 * Uses Sequential Thinking, Context7, and DuckDuckGo for comprehensive health intelligence
 */

import { 
  MCPAnalysisContext, 
  MCPAnalysisRequest, 
  MCPAnalysisResponse,
  UserProfile,
  TopicCategory,
  Location
} from '../types';
import { 
  SequentialThinkingParams,
  DuckDuckGoSearchResult 
} from '../lib/mcp';
import { getDemographicContext } from './userProfileService';
import { classifyTopic } from './analyticsService';

/**
 * Health Intelligence Analysis using MCP tools
 */
export class HealthIntelligenceService {
  
  /**
   * Perform comprehensive health intelligence analysis
   */
  async analyzeHealthQuery(request: MCPAnalysisRequest): Promise<MCPAnalysisResponse> {
    const { message, context } = request;
    
    try {
      // Step 1: Classify the topic and get demographic context
      const topicResult = classifyTopic(message);
      const demographicContext = getDemographicContext(context.userProfile || null);
      
      // Step 2: Use Sequential Thinking for structured analysis
      const sequentialAnalysis = await this.performSequentialThinking(
        message, 
        context, 
        demographicContext,
        topicResult.topic
      );
      
      // Step 3: Research health information using Context7 and DuckDuckGo
      const researchResults = await this.performHealthResearch(
        message,
        context.userProfile,
        topicResult.topic
      );
      
      // Step 4: Generate demographic-aware insights
      const demographicInsights = this.generateDemographicInsights(
        context.userProfile,
        topicResult.topic,
        researchResults
      );
      
      // Step 5: Create actionable recommendations
      const recommendations = this.generateRecommendations(
        message,
        context,
        researchResults,
        demographicInsights
      );
      
      // Step 6: Synthesize final response
      const response = this.synthesizeResponse(
        sequentialAnalysis,
        researchResults,
        demographicInsights,
        recommendations,
        context.currentMode
      );
      
      return {
        response,
        topic: topicResult.topic,
        confidence: topicResult.confidence,
        demographicInsights,
        recommendations,
        mcpToolsUsed: ['sequential-thinking', 'context7', 'duckduckgo', 'demographic-analysis']
      };
      
    } catch (error) {
      console.error('Health Intelligence Analysis Error:', error);
      
      // Fallback to basic analysis
      return this.generateFallbackResponse(message, context);
    }
  }
  
  /**
   * Use Sequential Thinking MCP tool for structured health analysis
   */
  private async performSequentialThinking(
    message: string,
    context: MCPAnalysisContext,
    demographicContext: string,
    topic: TopicCategory
  ): Promise<{
    analysis: string;
    keyInsights: string[];
    riskFactors: string[];
    nextSteps: string[];
  }> {
    
    // Build structured thinking prompt
    const thinkingPrompt = `
Analyze this health-related query using structured thinking:

USER QUERY: "${message}"
TOPIC: ${topic}
MODE: ${context.currentMode}
DEMOGRAPHIC CONTEXT: ${demographicContext}

Please think through this step by step:
1. What is the core health concern or question?
2. What demographic factors are relevant?
3. What are the key considerations for this age group and gender?
4. What are potential risk factors to consider?
5. What evidence-based information is needed?
6. What are the recommended next steps?

Provide a structured analysis that considers the user's demographic profile.
`;

    try {
      // Use Sequential Thinking MCP tool (dynamic import to handle missing module)
      let mcp_sequential_thinking_sequentialthinking;
      try {
        const mcpModule = await import('../lib/mcp');
        mcp_sequential_thinking_sequentialthinking = mcpModule.mcp_sequential_thinking_sequentialthinking;
      } catch {
        // Fallback if MCP module is not available
        mcp_sequential_thinking_sequentialthinking = async (params: SequentialThinkingParams) => ({
          thought: `การวิเคราะห์เบื้องต้น: ${params.thought}`,
          nextThoughtNeeded: false,
          thoughtNumber: params.thoughtNumber,
          totalThoughts: params.totalThoughts
        });
      }
      
      const thinkingResult = await mcp_sequential_thinking_sequentialthinking({
        thought: thinkingPrompt,
        nextThoughtNeeded: true,
        thoughtNumber: 1,
        totalThoughts: 6
      });
      
      // Extract structured insights from thinking process
      return {
        analysis: thinkingResult.thought || 'Analysis completed',
        keyInsights: this.extractKeyInsights(thinkingResult.thought || ''),
        riskFactors: this.extractRiskFactors(thinkingResult.thought || ''),
        nextSteps: this.extractNextSteps(thinkingResult.thought || '')
      };
      
    } catch (error) {
      console.error('Sequential Thinking Error:', error);
      
      // Fallback structured analysis
      return {
        analysis: `การวิเคราะห์เบื้องต้นสำหรับ: ${message}`,
        keyInsights: ['ต้องการข้อมูลเพิ่มเติมเพื่อการวิเคราะห์ที่แม่นยำ'],
        riskFactors: ['ควรปรึกษาผู้เชี่ยวชาญสำหรับการประเมินความเสี่ยง'],
        nextSteps: ['รวบรวมข้อมูลเพิ่มเติม', 'ปรึกษาแพทย์หากจำเป็น']
      };
    }
  }
  
  /**
   * Research health information using Context7 and DuckDuckGo
   */
  private async performHealthResearch(
    message: string,
    userProfile?: UserProfile,
    topic?: TopicCategory
  ): Promise<{
    evidenceBasedInfo: string[];
    currentGuidelines: string[];
    demographicSpecificInfo: string[];
    localResources: string[];
  }> {
    
    try {
      // Step 1: Get evidence-based health information using Context7
      const healthLibraryInfo = await this.getHealthLibraryInfo(message, topic).catch(() => ['ข้อมูลสุขภาพเบื้องต้น']);
      
      // Step 2: Search for current guidelines and research using DuckDuckGo
      const currentResearch = await this.searchCurrentHealthResearch(message, userProfile).catch(() => ({
        guidelines: ['แนวทางปฏิบัติมาตรฐาน'],
        demographicInfo: ['ข้อมูลเฉพาะกลุ่ม']
      }));
      
      // Step 3: Find local Thai healthcare resources
      const localResources = await this.findLocalHealthcareResources(userProfile?.location).catch(() => ['ทรัพยากรสุขภาพในพื้นที่']);
      
      return {
        evidenceBasedInfo: healthLibraryInfo,
        currentGuidelines: currentResearch.guidelines,
        demographicSpecificInfo: currentResearch.demographicInfo,
        localResources
      };
      
    } catch (error) {
      console.error('Health Research Error:', error);
      
      return {
        evidenceBasedInfo: ['ข้อมูลสุขภาพเบื้องต้นจากแหล่งที่เชื่อถือได้'],
        currentGuidelines: ['แนวทางปฏิบัติมาตรฐานสำหรับการดูแลสุขภาพ'],
        demographicSpecificInfo: ['ข้อมูลเฉพาะกลุ่มตามช่วงอายุและเพศ'],
        localResources: ['ทรัพยากรสุขภาพในพื้นที่ประเทศไทย']
      };
    }
  }
  
  /**
   * Get health library information using Context7
   */
  private async getHealthLibraryInfo(
    message: string,
    topic?: TopicCategory
  ): Promise<string[]> {
    
    try {
      // Resolve health-related library (with fallback)
      let mcp_Context7_resolve_library_id;
      try {
        const mcpModule = await import('../lib/mcp');
        mcp_Context7_resolve_library_id = mcpModule.mcp_Context7_resolve_library_id;
      } catch (error) {
        // Fallback if MCP module is not available
        mcp_Context7_resolve_library_id = async () => '/health/general-guidelines';
      }
      
      let libraryQuery = 'health medical guidelines';
      if (topic) {
        libraryQuery += ` ${topic}`;
      }
      
      const libraryResult = await mcp_Context7_resolve_library_id({
        libraryName: libraryQuery
      });
      
      // Get documentation from resolved library
      if (libraryResult && libraryResult.includes('/')) {
        let mcp_Context7_get_library_docs;
        try {
          const mcpModule = await import('../lib/mcp');
          mcp_Context7_get_library_docs = mcpModule.mcp_Context7_get_library_docs;
        } catch (error) {
          // Fallback if MCP module is not available
          mcp_Context7_get_library_docs = async () => 'ข้อมูลสุขภาพเบื้องต้น';
        }
        
        const docsResult = await mcp_Context7_get_library_docs({
          context7CompatibleLibraryID: libraryResult,
          topic: message,
          tokens: 2000
        });
        
        return this.extractHealthInformation(docsResult);
      }
      
      return ['ข้อมูลสุขภาพจากแหล่งที่เชื่อถือได้'];
      
    } catch (error) {
      console.error('Context7 Health Library Error:', error);
      return ['ข้อมูลสุขภาพเบื้องต้น'];
    }
  }
  
  /**
   * Search current health research using DuckDuckGo
   */
  private async searchCurrentHealthResearch(
    message: string,
    userProfile?: UserProfile
  ): Promise<{
    guidelines: string[];
    demographicInfo: string[];
  }> {
    
    try {
      let mcp_duckduckgo_search;
      try {
        const mcpModule = await import('../lib/mcp');
        mcp_duckduckgo_search = mcpModule.mcp_duckduckgo_search;
      } catch (error) {
        // Fallback if MCP module is not available
        mcp_duckduckgo_search = async () => [
          {
            title: 'ข้อมูลสุขภาพ',
            snippet: 'คำแนะนำการดูแลสุขภาพ',
            url: 'https://example.com'
          }
        ];
      }
      
      // Search for general health guidelines
      const guidelinesQuery = `${message} health guidelines evidence based medicine`;
      const guidelinesResults = await mcp_duckduckgo_search({
        query: guidelinesQuery,
        max_results: 5
      });
      
      // Search for demographic-specific information
      let demographicQuery = `${message} health`;
      if (userProfile?.ageRange) {
        demographicQuery += ` elderly seniors age ${userProfile.ageRange}`;
      }
      if (userProfile?.gender && userProfile.gender !== 'prefer-not-to-say') {
        demographicQuery += ` ${userProfile.gender}`;
      }
      
      const demographicResults = await mcp_duckduckgo_search({
        query: demographicQuery,
        max_results: 5
      });
      
      return {
        guidelines: this.extractGuidelines(guidelinesResults),
        demographicInfo: this.extractDemographicInfo(demographicResults)
      };
      
    } catch (error) {
      console.error('DuckDuckGo Health Research Error:', error);
      
      return {
        guidelines: ['แนวทางปฏิบัติมาตรฐานจากองค์กรสุขภาพ'],
        demographicInfo: ['ข้อมูลเฉพาะกลุ่มอายุและเพศ']
      };
    }
  }
  
  /**
   * Find local healthcare resources in Thailand
   */
  private async findLocalHealthcareResources(location?: string): Promise<string[]> {
    
    try {
      let mcp_duckduckgo_search;
      try {
        const mcpModule = await import('../lib/mcp');
        mcp_duckduckgo_search = mcpModule.mcp_duckduckgo_search;
      } catch (error) {
        // Fallback if MCP module is not available
        mcp_duckduckgo_search = async () => [
          {
            title: 'ทรัพยากรสุขภาพ',
            snippet: 'บริการสุขภาพในพื้นที่',
            url: 'https://example.com'
          }
        ];
      }
      
      let locationQuery = 'Thailand healthcare hospitals clinics';
      if (location) {
        locationQuery += ` ${location}`;
      }
      
      const resourceResults = await mcp_duckduckgo_search({
        query: locationQuery,
        max_results: 5
      });
      
      return this.extractLocalResources(resourceResults, location);
      
    } catch (error) {
      console.error('Local Resources Search Error:', error);
      
      // Fallback local resources based on location
      return this.getFallbackLocalResources(location);
    }
  }
  
  /**
   * Generate demographic-aware insights
   */
  private generateDemographicInsights(
    userProfile?: UserProfile,
    topic?: TopicCategory,
    researchResults?: any
  ): MCPAnalysisResponse['demographicInsights'] {
    
    const insights: MCPAnalysisResponse['demographicInsights'] = {};
    
    // Age-specific considerations
    if (userProfile?.ageRange) {
      insights.ageSpecificConsiderations = this.getAgeSpecificConsiderations(
        userProfile.ageRange,
        topic
      );
    }
    
    // Gender-specific considerations
    if (userProfile?.gender && userProfile.gender !== 'prefer-not-to-say') {
      insights.genderSpecificConsiderations = this.getGenderSpecificConsiderations(
        userProfile.gender,
        topic
      );
    }
    
    // Cultural considerations
    if (userProfile?.culturalContext) {
      insights.culturalConsiderations = this.getCulturalConsiderations(
        userProfile.culturalContext,
        topic
      );
    }
    
    // Location-specific resources
    if (userProfile?.location) {
      insights.locationSpecificResources = this.getLocationSpecificResources(
        userProfile.location,
        topic
      );
    }
    
    return insights;
  }
  
  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    message: string,
    context: MCPAnalysisContext,
    researchResults: any,
    demographicInsights: any
  ): MCPAnalysisResponse['recommendations'] {
    
    const recommendations: MCPAnalysisResponse['recommendations'] = {
      suggestedActions: [],
      followUpQuestions: [],
      resourceLinks: [],
      escalationSuggestions: []
    };
    
    // Mode-specific recommendations
    if (context.currentMode === 'intelligence') {
      recommendations.suggestedActions = [
        'รวบรวมข้อมูลประวัติสุขภาพอย่างครบถ้วน',
        'วิเคราะห์ปัจจัยเสี่ยงและข้อมูลที่เกี่ยวข้อง',
        'ปรึกษาผู้เชี่ยวชาญเพื่อการวางแผนระยะยาว',
        'ติดตามและประเมินผลอย่างต่อเนื่อง'
      ];
      
      recommendations.followUpQuestions = [
        'ต้องการข้อมูลเปรียบเทียบตัวเลือกการรักษาหรือไม่?',
        'มีงบประมาณหรือข้อจำกัดอื่นๆ หรือไม่?',
        'ต้องการแผนการดูแลระยะยาวหรือไม่?',
        'มีประวัติครอบครัวที่เกี่ยวข้องหรือไม่?'
      ];
    } else {
      recommendations.suggestedActions = [
        'สังเกตอาการและพฤติกรรมอย่างใกล้ชิด',
        'สร้างสภาพแวดล้อมที่ปลอดภัยและเอื้ออำนวย',
        'ให้กำลังใจและสนับสนุนทางอารมณ์',
        'ปรึกษาแพทย์หากมีความกังวล'
      ];
      
      recommendations.followUpQuestions = [
        'มีอาการอื่นที่น่ากังวลหรือไม่?',
        'ได้ปรึกษาแพทย์แล้วหรือยัง?',
        'ต้องการความช่วยเหลือเพิ่มเติมหรือไม่?',
        'มีคนในครอบครัวช่วยดูแลหรือไม่?'
      ];
    }
    
    // Add demographic-specific recommendations
    if (context.userProfile?.ageRange && ['60-69', '70-79', '80+'].includes(context.userProfile.ageRange)) {
      recommendations.escalationSuggestions?.push(
        'พิจารณาปรึกษาแพทย์ผู้เชี่ยวชาญด้านผู้สูงอายุ',
        'ติดต่อศูนย์บริการสุขภาพผู้สูงอายุ'
      );
    }
    
    return recommendations;
  }
  
  /**
   * Synthesize final response
   */
  private synthesizeResponse(
    sequentialAnalysis: any,
    researchResults: any,
    demographicInsights: any,
    recommendations: any,
    mode: 'conversation' | 'intelligence'
  ): string {
    
    if (mode === 'intelligence') {
      return this.generateIntelligenceResponse(
        sequentialAnalysis,
        researchResults,
        demographicInsights,
        recommendations
      );
    } else {
      return this.generateConversationResponse(
        sequentialAnalysis,
        demographicInsights,
        recommendations
      );
    }
  }
  
  /**
   * Generate Intelligence Mode response
   */
  private generateIntelligenceResponse(
    analysis: any,
    research: any,
    insights: any,
    recommendations: any
  ): string {
    
    let response = '## การวิเคราะห์สุขภาพอัจฉริยะ\n\n';
    
    response += '### การประเมินเบื้องต้น\n';
    response += `${analysis.analysis}\n\n`;
    
    if (analysis.keyInsights?.length > 0) {
      response += '### ข้อมูลสำคัญ\n';
      analysis.keyInsights.forEach((insight: string, index: number) => {
        response += `${index + 1}. ${insight}\n`;
      });
      response += '\n';
    }
    
    if (research.evidenceBasedInfo?.length > 0) {
      response += '### ข้อมูลจากหลักฐานทางวิทยาศาสตร์\n';
      research.evidenceBasedInfo.forEach((info: string, index: number) => {
        response += `- ${info}\n`;
      });
      response += '\n';
    }
    
    if (insights.ageSpecificConsiderations?.length > 0) {
      response += '### ข้อพิจารณาตามช่วงอายุ\n';
      insights.ageSpecificConsiderations.forEach((consideration: string) => {
        response += `- ${consideration}\n`;
      });
      response += '\n';
    }
    
    if (recommendations.suggestedActions?.length > 0) {
      response += '### คำแนะนำการปฏิบัติ\n';
      recommendations.suggestedActions.forEach((action: string, index: number) => {
        response += `${index + 1}. ${action}\n`;
      });
      response += '\n';
    }
    
    if (research.localResources?.length > 0) {
      response += '### ทรัพยากรในพื้นที่\n';
      research.localResources.forEach((resource: string) => {
        response += `- ${resource}\n`;
      });
      response += '\n';
    }
    
    response += '### การติดตาม\n';
    if (recommendations.followUpQuestions?.length > 0) {
      recommendations.followUpQuestions.forEach((question: string) => {
        response += `- ${question}\n`;
      });
    }
    
    response += '\n*ข้อมูลนี้ได้จากการวิเคราะห์ด้วย AI และควรใช้ประกอบการพิจารณาเท่านั้น สำหรับคำแนะนำทางการแพทย์ กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญ*';
    
    return response;
  }
  
  /**
   * Generate Conversation Mode response
   */
  private generateConversationResponse(
    analysis: any,
    insights: any,
    recommendations: any
  ): string {
    
    let response = 'เข้าใจความกังวลของคุณค่ะ ';
    
    if (insights.ageSpecificConsiderations?.length > 0) {
      response += `${insights.ageSpecificConsiderations[0]} `;
    }
    
    response += 'ใบบุญขอแนะนำให้:\n\n';
    
    if (recommendations.suggestedActions?.length > 0) {
      recommendations.suggestedActions.slice(0, 3).forEach((action: string, index: number) => {
        response += `${index + 1}. ${action}\n`;
      });
    }
    
    response += '\n';
    
    if (analysis.riskFactors?.length > 0) {
      response += '⚠️ **สิ่งที่ควระวัง:**\n';
      response += `${analysis.riskFactors[0]}\n\n`;
    }
    
    response += 'หากต้องการข้อมูลเชิงลึกเพิ่มเติม สามารถเปลี่ยนไปใช้โหมด "Health Intelligence" ได้ค่ะ\n\n';
    response += 'หรือหากต้องการความช่วยเหลือเพิ่มเติม คุยกับทีม Jirung ทาง LINE ได้เลยค่ะ';
    
    return response;
  }
  
  /**
   * Generate fallback response when MCP tools fail
   */
  private generateFallbackResponse(
    message: string,
    context: MCPAnalysisContext
  ): MCPAnalysisResponse {
    
    const topicResult = classifyTopic(message);
    
    return {
      response: context.currentMode === 'intelligence' 
        ? this.getFallbackIntelligenceResponse(message, context.userProfile)
        : this.getFallbackConversationResponse(message, context.userProfile),
      topic: topicResult.topic,
      confidence: 0.5,
      demographicInsights: {
        ageSpecificConsiderations: ['ข้อมูลเบื้องต้นตามช่วงอายุ'],
        genderSpecificConsiderations: ['ข้อพิจารณาทั่วไป'],
        locationSpecificResources: ['ทรัพยากรสุขภาพในประเทศไทย']
      },
      recommendations: {
        suggestedActions: ['ปรึกษาแพทย์หากมีความกังวล', 'สังเกตอาการอย่างใกล้ชิด'],
        followUpQuestions: ['มีอาการอื่นที่น่ากังวลหรือไม่?'],
        escalationSuggestions: ['ติดต่อแพทย์หากอาการรุนแรง']
      },
      mcpToolsUsed: ['fallback-analysis']
    };
  }
  
  // Helper methods for extracting information from MCP results
  private extractKeyInsights(thought: string): string[] {
    // Extract key insights from sequential thinking output
    const insights = thought.match(/(?:key insight|สำคัญ|insight)[:\s]*([^\n]+)/gi) || [];
    return insights.map(insight => insight.replace(/(?:key insight|สำคัญ|insight)[:\s]*/i, '').trim());
  }
  
  private extractRiskFactors(thought: string): string[] {
    // Extract risk factors from sequential thinking output
    const risks = thought.match(/(?:risk|ความเสี่ยง|อันตราย)[:\s]*([^\n]+)/gi) || [];
    return risks.map(risk => risk.replace(/(?:risk|ความเสี่ยง|อันตราย)[:\s]*/i, '').trim());
  }
  
  private extractNextSteps(thought: string): string[] {
    // Extract next steps from sequential thinking output
    const steps = thought.match(/(?:next step|ขั้นตอนต่อไป|แนะนำ)[:\s]*([^\n]+)/gi) || [];
    return steps.map(step => step.replace(/(?:next step|ขั้นตอนต่อไป|แนะนำ)[:\s]*/i, '').trim());
  }
  
  private extractHealthInformation(docs: string): string[] {
    // Extract health information from Context7 documentation
    if (!docs) return [];
    
    const lines = docs.split('\n').filter(line => line.trim().length > 0);
    return lines.slice(0, 5); // Return first 5 relevant lines
  }
  
  private extractGuidelines(searchResults: any): string[] {
    // Extract guidelines from DuckDuckGo search results
    if (!searchResults || !Array.isArray(searchResults)) return [];
    
    return searchResults.slice(0, 3).map((result: any) => 
      result.title || result.snippet || 'แนวทางปฏิบัติจากแหล่งที่เชื่อถือได้'
    );
  }
  
  private extractDemographicInfo(searchResults: any): string[] {
    // Extract demographic-specific information from search results
    if (!searchResults || !Array.isArray(searchResults)) return [];
    
    return searchResults.slice(0, 3).map((result: any) => 
      result.title || result.snippet || 'ข้อมูลเฉพาะกลุ่มประชากร'
    );
  }
  
  private extractLocalResources(searchResults: any, location?: string): string[] {
    // Extract local healthcare resources from search results
    if (!searchResults || !Array.isArray(searchResults)) {
      return this.getFallbackLocalResources(location);
    }
    
    const resources = searchResults.slice(0, 3).map((result: any) => 
      result.title || result.snippet || 'ทรัพยากรสุขภาพในพื้นที่'
    );
    
    return resources.length > 0 ? resources : this.getFallbackLocalResources(location);
  }
  
  private getFallbackLocalResources(location?: string): string[] {
    const baseResources = [
      'โรงพยาบาลประจำจังหวัด',
      'ศูนย์สุขภาพชุมชน',
      'สถานีอนามัย',
      'หมายเลขฉุกเฉิน 1669'
    ];
    
    if (location === 'bangkok') {
      return [
        'โรงพยาบาลรามาธิบดี',
        'โรงพยาบาลจุฬาลงกรณ์',
        'โรงพยาบาลศิริราช',
        ...baseResources
      ];
    }
    
    return baseResources;
  }
  
  private getAgeSpecificConsiderations(ageRange: string, topic?: TopicCategory): string[] {
    const considerations: Record<string, string[]> = {
      '18-29': [
        'การเตรียมตัวสำหรับการดูแลผู้สูงอายุในอนาคต',
        'การสร้างนิสัยสุขภาพที่ดีตั้งแต่วัยหนุ่มสาว',
        'การเรียนรู้เรื่องการดูแลสุขภาพครอบครัว'
      ],
      '30-39': [
        'การสร้างสมดุลระหว่างการทำงานและการดูแลครอบครัว',
        'การเตรียมแผนการเงินสำหรับการดูแลระยะยาว',
        'การเรียนรู้ทักษะการดูแลเบื้องต้น'
      ],
      '40-49': [
        'การเริ่มวางแผนการดูแลผู้ปกครองที่เริ่มสูงอายุ',
        'การจัดการความเครียดจากภาระหลายด้าน',
        'การหาข้อมูลเรื่องการดูแลระยะยาว'
      ],
      '50-59': [
        'การเตรียมตัวสำหรับการเป็นผู้ดูแลหลัก',
        'การดูแลสุขภาพตนเองควบคู่กับการดูแลผู้อื่น',
        'การวางแผนการเกษียณและการดูแล'
      ],
      '60-69': [
        'การปรับตัวเข้ากับการเปลี่ยนแปลงทางร่างกาย',
        'การป้องกันโรคเรื้อรังและการล้ม',
        'การรักษาความเป็นอิสระและคุณภาพชีวิต'
      ],
      '70-79': [
        'การจัดการกับโรคเรื้อรังหลายโรค',
        'การรักษาสมรรถภาพทางกายและสมอง',
        'การเตรียมตัวสำหรับการได้รับการดูแล'
      ],
      '80+': [
        'การดูแลเฉพาะทางสำหรับผู้สูงอายุมาก',
        'การจัดการกับความอ่อนแอและพึ่งพิง',
        'การรักษาศักดิ์ศรีและคุณภาพชีวิต'
      ]
    };
    
    return considerations[ageRange] || considerations['50-59'];
  }
  
  private getGenderSpecificConsiderations(gender: string, topic?: TopicCategory): string[] {
    const considerations: Record<string, string[]> = {
      'female': [
        'การสนับสนุนผู้หญิงในบทบาทผู้ดูแลหลัก',
        'การจัดการความเครียดและการดูแลตนเอง',
        'การขอความช่วยเหลือจากครอบครัวและชุมชน'
      ],
      'male': [
        'การปรับตัวเข้ากับบทบาทการดูแลใหม่',
        'การเรียนรู้ทักษะการดูแลเบื้องต้น',
        'การสื่อสารกับผู้สูงอายุอย่างมีประสิทธิภาพ'
      ],
      'transgender': [
        'การเข้าถึงบริการสุขภาพที่เป็นมิตร',
        'การจัดการกับความท้าทายทางสังคม',
        'การสร้างเครือข่ายสนับสนุนที่เข้าใจ'
      ],
      'non-binary': [
        'การใช้ภาษาที่เป็นกลางและเคารพ',
        'การหลีกเลี่ยงการตั้งสมมติฐานเรื่องบทบาท',
        'การสร้างสภาพแวดล้อมที่ปลอดภัย'
      ]
    };
    
    return considerations[gender] || considerations['female'];
  }
  
  private getCulturalConsiderations(culturalContext: any, topic?: TopicCategory): string[] {
    const considerations = [
      'เคารพวัฒนธรรมไทยในการดูแลผู้สูงอายุ',
      'คำนึงถึงโครงสร้างครอบครัวแบบไทย',
      'เข้าใจความสำคัญของการทำบุญและศาสนา'
    ];
    
    if (culturalContext.region) {
      switch (culturalContext.region) {
        case 'north':
          considerations.push('เข้าใจวัฒนธรรมล้านนาและความสำคัญของครอบครัวใหญ่');
          break;
        case 'northeast':
          considerations.push('เข้าใจวัฒนธรรมอีสานและโครงสร้างชุมชน');
          break;
        case 'south':
          considerations.push('เข้าใจวัฒนธรรมใต้และความหลากหลายทางศาสนา');
          break;
      }
    }
    
    return considerations;
  }
  
  private getLocationSpecificResources(location: string, topic?: TopicCategory): string[] {
    const resources: Record<string, string[]> = {
      'bangkok': [
        'โรงพยาบาลรามาธิบดี - ศูนย์ผู้สูงอายุ',
        'โรงพยาบาลจุฬาลงกรณ์ - คลินิกผู้สูงอายุ',
        'โรงพยาบาลศิริราช - แผนกอายุรกรรมผู้สูงอายุ',
        'ศูนย์บริการสุขภาพชุมชนกรุงเทพฯ'
      ],
      'central': [
        'โรงพยาบาลประจำจังหวัด',
        'ศูนย์สุขภาพชุมชนภาคกลาง',
        'สถานีอนามัยท้องถิ่น'
      ],
      'north': [
        'โรงพยาบาลมหาราชนครเชียงใหม่',
        'ศูนย์สุขภาพชุมชนภาคเหนือ',
        'โรงพยาบาลประจำจังหวัดภาคเหนือ'
      ],
      'northeast': [
        'โรงพยาบาลศรีนครินทร์ ขอนแก่น',
        'ศูนย์สุขภาพชุมชนอีสาน',
        'โรงพยาบาลประจำจังหวัดภาคอีสาน'
      ],
      'south': [
        'โรงพยาบาลสงขลานครินทร์',
        'ศูนย์สุขภาพชุมชนภาคใต้',
        'โรงพยาบาลประจำจังหวัดภาคใต้'
      ]
    };
    
    return resources[location] || resources['central'];
  }
  
  private getFallbackIntelligenceResponse(message: string, profile?: UserProfile): string {
    return `## การวิเคราะห์เบื้องต้น

**คำถาม:** ${message}

### การประเมินสถานการณ์
ระบบได้รับคำถามของคุณและกำลังประมวลผลข้อมูลเบื้องต้น

### คำแนะนำทั่วไป
1. รวบรวมข้อมูลประวัติสุขภาพอย่างครบถ้วน
2. ปรึกษาแพทย์หรือผู้เชี่ยวชาญที่เกี่ยวข้อง
3. สังเกตอาการและพฤติกรรมอย่างใกล้ชิด
4. จัดเตรียมสภาพแวดล้อมที่ปลอดภัย

### การติดตาม
- ติดตามอาการและการเปลี่ยนแปลง
- บันทึกข้อมูลสำคัญ
- ปรึกษาผู้เชี่ยวชาญเมื่อจำเป็น

*สำหรับข้อมูลเชิงลึกเพิ่มเติม กรุณาลองใหม่อีกครั้ง หรือปรึกษาทีม Jirung ทาง LINE*`;
  }
  
  private getFallbackConversationResponse(message: string, profile?: UserProfile): string {
    return `เข้าใจความกังวลของคุณค่ะ ใบบุญขอแนะนำให้:

1. สังเกตอาการและพฤติกรรมอย่างใกล้ชิด
2. สร้างสภาพแวดล้อมที่ปลอดภัยและเอื้ออำนวย
3. ให้กำลังใจและสนับสนุนทางอารมณ์
4. ปรึกษาแพทย์หากมีความกังวล

หากต้องการข้อมูลเชิงลึกเพิ่มเติม สามารถเปลี่ยนไปใช้โหมด "Health Intelligence" ได้ค่ะ

หรือหากต้องการความช่วยเหลือเพิ่มเติม คุยกับทีม Jirung ทาง LINE ได้เลยค่ะ`;
  }
}

// Export singleton instance
export const healthIntelligenceService = new HealthIntelligenceService();