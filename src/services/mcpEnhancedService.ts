/**
 * Enhanced MCP Service
 * Provides demographic-aware analysis using MCP tools
 */

import { 
  MCPAnalysisContext, 
  MCPAnalysisRequest, 
  MCPAnalysisResponse,
  UserProfile,
  TopicCategory,
  Location
} from '../types';
import { getDemographicContext } from './userProfileService';
import { classifyTopic } from './analyticsService';

/**
 * Enhanced MCP analysis with demographic awareness
 */
export async function performEnhancedMCPAnalysis(
  request: MCPAnalysisRequest
): Promise<MCPAnalysisResponse> {
  const { message, context } = request;
  
  // Get demographic context
  const demographicContext = getDemographicContext(context.userProfile || null);
  
  // Classify topic
  const topicResult = classifyTopic(message);
  
  // Build enhanced prompt with demographic context
  const enhancedPrompt = buildDemographicAwarePrompt(
    message,
    context,
    demographicContext,
    topicResult.topic
  );

  // For now, we'll simulate MCP analysis
  // In a real implementation, this would call actual MCP tools
  const mcpResponse = await simulateMCPAnalysis(enhancedPrompt, context);

  return {
    response: mcpResponse.response,
    topic: topicResult.topic,
    confidence: topicResult.confidence,
    demographicInsights: mcpResponse.demographicInsights,
    recommendations: mcpResponse.recommendations,
    mcpToolsUsed: mcpResponse.mcpToolsUsed
  };
}

/**
 * Build demographic-aware prompt for MCP analysis
 */
function buildDemographicAwarePrompt(
  message: string,
  context: MCPAnalysisContext,
  demographicContext: string,
  topic: TopicCategory
): string {
  const basePrompt = `
คุณคือ "Jirung Senior Advisor" ผู้ช่วยสำหรับครอบครัวที่ดูแลผู้สูงอายุ

DEMOGRAPHIC CONTEXT:
${demographicContext}

MODE: ${context.currentMode === 'conversation' ? 'Conversation Mode - ใบบุญ' : 'Health Intelligence Mode'}

SESSION INFO:
- จำนวนข้อความ: ${context.sessionMetadata.messageCount}
- ระยะเวลา: ${Math.round(context.sessionMetadata.duration)} นาที
- ภาษา: ${context.sessionMetadata.language}

TOPIC CLASSIFICATION: ${topic}

USER MESSAGE: "${message}"

INSTRUCTIONS:
${context.currentMode === 'conversation' 
  ? getConversationModeInstructions(context.userProfile)
  : getIntelligenceModeInstructions(context.userProfile)
}

DEMOGRAPHIC CONSIDERATIONS:
${getDemographicSpecificInstructions(context.userProfile)}

Please provide a response that takes into account the user's demographic profile and current mode.
`;

  return basePrompt;
}

/**
 * Get conversation mode instructions based on user profile
 */
function getConversationModeInstructions(profile?: UserProfile): string {
  let instructions = `
CONVERSATION MODE GUIDELINES:
- ใช้ภาษาที่อบอุ่น เข้าใจ และให้กำลังใจ
- ให้คำแนะนำเบื้องต้นที่ปฏิบัติได้จริง
- หลีกเลี่ยงการวินิจฉัยทางการแพทย์
- แนะนำให้ปรึกษาแพทย์เมื่อจำเป็น
`;

  if (profile?.ageRange) {
    if (['60-69', '70-79', '80+'].includes(profile.ageRange)) {
      instructions += `
- ใช้ภาษาที่เข้าใจง่าย หลีกเลี่ยงศัพท์เทคนิค
- ให้คำแนะนำที่เหมาะกับวัยผู้สูงอายุ
- แสดงความเคารพและเข้าใจประสบการณ์ชีวิต
`;
    } else if (['18-29', '30-39', '40-49'].includes(profile.ageRange)) {
      instructions += `
- ให้ข้อมูลที่ช่วยในการเตรียมตัวดูแลผู้สูงอายุ
- เข้าใจความกังวลของคนรุ่นใหม่ที่ต้องดูแลผู้ปกครอง
- แนะนำทรัพยากรและเครื่องมือที่ทันสมัย
`;
    }
  }

  return instructions;
}

/**
 * Get intelligence mode instructions based on user profile
 */
function getIntelligenceModeInstructions(profile?: UserProfile): string {
  let instructions = `
INTELLIGENCE MODE GUIDELINES:
- ให้ข้อมูลที่อิงหลักฐานทางวิทยาศาสตร์
- วิเคราะห์ข้อมูลอย่างละเอียดและเป็นระบบ
- เปรียบเทียบตัวเลือกต่างๆ อย่างเป็นกลาง
- ให้คำแนะนำระดับมืออาชีพ
`;

  if (profile?.healthContext?.caregivingRole === 'professional') {
    instructions += `
- ใช้ศัพท์เทคนิคและข้อมูลเชิงลึก
- อ้างอิงงานวิจัยและแนวทางปฏิบัติ
- ให้ข้อมูลที่สามารถนำไปใช้ในการปฏิบัติงานได้
`;
  } else {
    instructions += `
- อธิบายข้อมูลเทคนิคให้เข้าใจง่าย
- ให้ตัวอย่างที่เป็นรูปธรรม
- เชื่อมโยงกับสถานการณ์จริงในครอบครัว
`;
  }

  return instructions;
}

/**
 * Get demographic-specific instructions
 */
function getDemographicSpecificInstructions(profile?: UserProfile): string {
  const instructions: string[] = [];

  if (profile?.gender) {
    switch (profile.gender) {
      case 'female':
        instructions.push('- เข้าใจบทบาทการดูแลที่ผู้หญิงมักรับผิดชอบในสังคมไทย');
        instructions.push('- ให้การสนับสนุนทางอารมณ์และเข้าใจความเครียด');
        break;
      case 'male':
        instructions.push('- สนับสนุนผู้ชายในบทบาทการดูแลที่อาจไม่คุ้นเคย');
        instructions.push('- ให้คำแนะนำที่ตรงไปตรงมาและปฏิบัติได้');
        break;
      case 'transgender':
      case 'non-binary':
        instructions.push('- ใช้ภาษาที่เป็นกลางและเคารพความหลากหลาย');
        instructions.push('- หลีกเลี่ยงการตั้งสมมติฐานเรื่องบทบาททางเพศ');
        break;
    }
  }

  if (profile?.location) {
    switch (profile.location) {
      case 'bangkok':
        instructions.push('- แนะนำทรัพยากรและบริการในกรุงเทพฯ และปริมณฑล');
        instructions.push('- คำนึงถึงค่าใช้จ่ายที่สูงในเขตเมือง');
        break;
      case 'north':
        instructions.push('- เข้าใจวัฒนธรรมล้านนาและความสำคัญของครอบครัวใหญ่');
        instructions.push('- แนะนำทรัพยากรที่เข้าถึงได้ในภาคเหนือ');
        break;
      case 'northeast':
        instructions.push('- เข้าใจวัฒนธรรมอีสานและโครงสร้างครอบครัว');
        instructions.push('- คำนึงถึงข้อจำกัดด้านทรัพยากรในพื้นที่ห่างไกล');
        break;
      case 'south':
        instructions.push('- เข้าใจวัฒนธรรมใต้และความหลากหลายทางศาสนา');
        instructions.push('- แนะนำทรัพยากรที่เหมาะกับพื้นที่ภาคใต้');
        break;
    }
  }

  return instructions.join('\n');
}

/**
 * Simulate MCP analysis (placeholder for actual MCP integration)
 */
async function simulateMCPAnalysis(
  prompt: string,
  context: MCPAnalysisContext
): Promise<{
  response: string;
  demographicInsights: MCPAnalysisResponse['demographicInsights'];
  recommendations: MCPAnalysisResponse['recommendations'];
  mcpToolsUsed: string[];
}> {
  // This is a simulation - in real implementation, this would call actual MCP tools
  // like Sequential Thinking, Context7, DuckDuckGo, etc.
  
  const profile = context.userProfile;
  const mode = context.currentMode;

  // Generate demographic insights
  const demographicInsights: MCPAnalysisResponse['demographicInsights'] = {};

  if (profile?.ageRange) {
    if (['60-69', '70-79', '80+'].includes(profile.ageRange)) {
      demographicInsights.ageSpecificConsiderations = [
        'คำนึงถึงการเปลี่ยนแปลงทางร่างกายตามวัย',
        'ให้ความสำคัญกับความปลอดภัยและการป้องกันการล้ม',
        'เข้าใจความต้องการด้านอารมณ์และสังคม'
      ];
    } else if (['30-39', '40-49', '50-59'].includes(profile.ageRange)) {
      demographicInsights.ageSpecificConsiderations = [
        'การสร้างสมดุลระหว่างการทำงานและการดูแล',
        'การเตรียมตัวสำหรับการดูแลระยะยาว',
        'การจัดการความเครียดจากภาระหลายด้าน'
      ];
    }
  }

  if (profile?.gender === 'female') {
    demographicInsights.genderSpecificConsiderations = [
      'การสนับสนุนผู้หญิงในบทบาทผู้ดูแลหลัก',
      'การจัดการความเครียดและการดูแลตนเอง',
      'การขอความช่วยเหลือจากครอบครัวและชุมชน'
    ];
  } else if (profile?.gender === 'male') {
    demographicInsights.genderSpecificConsiderations = [
      'การปรับตัวเข้ากับบทบาทการดูแลใหม่',
      'การเรียนรู้ทักษะการดูแลเบื้องต้น',
      'การสื่อสารกับผู้สูงอายุอย่างมีประสิทธิภาพ'
    ];
  }

  if (profile?.location) {
    const locationResources: Record<Location, string[]> = {
      'bangkok': ['โรงพยาบาลรามาธิบดี', 'โรงพยาบาลจุฬาลงกรณ์', 'ศูนย์บริการสุขภาพชุมชน'],
      'central': ['โรงพยาบาลประจำจังหวัด', 'ศูนย์สุขภาพชุมชน', 'อสม.ท้องถิ่น'],
      'north': ['โรงพยาบาลมหาราชนครเชียงใหม่', 'ศูนย์สุขภาพชุมชนภาคเหนือ'],
      'northeast': ['โรงพยาบาลศรีนครินทร์', 'ศูนย์สุขภาพชุมชนอีสาน'],
      'south': ['โรงพยาบาลสงขลานครินทร์', 'ศูนย์สุขภาพชุมชนภาคใต้'],
      'other': ['โรงพยาบาลท้องถิ่น', 'ศูนย์สุขภาพชุมชน', 'สถานีอนามัย']
    };
    
    demographicInsights.locationSpecificResources = locationResources[profile.location] || [];
  }

  // Generate recommendations
  const recommendations: MCPAnalysisResponse['recommendations'] = {
    suggestedActions: [],
    followUpQuestions: [],
    resourceLinks: [],
    escalationSuggestions: []
  };

  if (mode === 'conversation') {
    recommendations.suggestedActions = [
      'สังเกตอาการและพฤติกรรมอย่างใกล้ชิด',
      'สร้างสภาพแวดล้อมที่ปลอดภัยและเอื้ออำนวย',
      'ให้กำลังใจและสนับสนุนทางอารมณ์'
    ];
    
    recommendations.followUpQuestions = [
      'มีอาการอื่นที่น่ากังวลหรือไม่?',
      'ได้ปรึกษาแพทย์แล้วหรือยัง?',
      'ต้องการความช่วยเหลือเพิ่มเติมหรือไม่?'
    ];
  } else {
    recommendations.suggestedActions = [
      'รวบรวมข้อมูลสุขภาพและประวัติการรักษา',
      'วิเคราะห์ตัวเลือกการดูแลที่เหมาะสม',
      'ปรึกษาผู้เชี่ยวชาญเพื่อการวางแผนระยะยาว'
    ];
    
    recommendations.followUpQuestions = [
      'ต้องการข้อมูลเปรียบเทียบตัวเลือกการรักษาหรือไม่?',
      'มีงบประมาณหรือข้อจำกัดอื่นๆ หรือไม่?',
      'ต้องการแผนการดูแลระยะยาวหรือไม่?'
    ];
  }

  // Generate response based on mode and context
  let response = '';
  if (mode === 'conversation') {
    response = generateConversationResponse(prompt, profile);
  } else {
    response = generateIntelligenceResponse(prompt, profile);
  }

  return {
    response,
    demographicInsights,
    recommendations,
    mcpToolsUsed: ['sequential-thinking', 'demographic-analysis', 'cultural-context']
  };
}

/**
 * Generate conversation mode response
 */
function generateConversationResponse(prompt: string, profile?: UserProfile): string {
  // This is a simplified response generator
  // In real implementation, this would use actual AI/LLM with the enhanced prompt
  
  let response = 'เข้าใจความกังวลของคุณค่ะ ';
  
  if (profile?.ageRange && ['60-69', '70-79', '80+'].includes(profile.ageRange)) {
    response += 'ในวัยนี้เป็นเรื่องปกติที่จะมีความกังวลเรื่องสุขภาพ ';
  } else if (profile?.ageRange && ['30-39', '40-49', '50-59'].includes(profile.ageRange)) {
    response += 'การดูแลผู้สูงอายุเป็นความรับผิดชอบที่สำคัญ ';
  }
  
  response += 'ใบบุญขอแนะนำให้:\n\n';
  response += '1. สังเกตอาการอย่างใกล้ชิด\n';
  response += '2. ปรึกษาแพทย์หากมีความกังวล\n';
  response += '3. สร้างสภาพแวดล้อมที่ปลอดภัย\n\n';
  response += 'หากต้องการความช่วยเหลือเพิ่มเติม คุยกับทีม Jirung ทาง LINE ได้เลยค่ะ';
  
  return response;
}

/**
 * Generate intelligence mode response
 */
function generateIntelligenceResponse(prompt: string, profile?: UserProfile): string {
  // This is a simplified response generator
  // In real implementation, this would use actual MCP tools for research and analysis
  
  let response = 'การวิเคราะห์เบื้องต้นจากข้อมูลที่ได้รับ:\n\n';
  
  response += '**การประเมินสถานการณ์:**\n';
  if (profile?.ageRange && ['60-69', '70-79', '80+'].includes(profile.ageRange)) {
    response += '- คำนึงถึงการเปลี่ยนแปลงทางสรีรวิทยาตามวัย\n';
    response += '- ประเมินความเสี่ยงจากปัจจัยต่างๆ\n';
  }
  
  response += '\n**คำแนะนำเชิงวิทยาศาสตร์:**\n';
  response += '- รวบรวมข้อมูลประวัติสุขภาพอย่างครบถ้วน\n';
  response += '- วิเคราะห์ตัวเลือกการดูแลที่เหมาะสม\n';
  response += '- ติดตามและประเมินผลอย่างต่อเนื่อง\n\n';
  
  if (profile?.location) {
    response += '**ทรัพยากรในพื้นที่:**\n';
    response += `- แนะนำให้ติดต่อสถานพยาบาลในพื้นที่ ${profile.location}\n`;
    response += '- ใช้บริการศูนย์สุขภาพชุมชน\n\n';
  }
  
  response += 'สำหรับข้อมูลเชิงลึกเพิ่มเติม สามารถปรึกษาผู้เชี่ยวชาญได้';
  
  return response;
}

/**
 * Get enhanced system prompt with demographic context
 */
export function getEnhancedSystemPrompt(
  profile: UserProfile | null,
  mode: 'conversation' | 'intelligence'
): string {
  const basePrompt = mode === 'conversation' 
    ? 'คุณคือ "ใบบุญ" ผู้ช่วยที่อบอุ่นและเข้าใจจาก Jirung'
    : 'คุณคือระบบวิเคราะห์สุขภาพอัจฉริยะของ Jirung';

  const demographicContext = getDemographicContext(profile);
  
  if (!demographicContext) {
    return basePrompt;
  }

  return `${basePrompt}

DEMOGRAPHIC CONTEXT:
${demographicContext}

กรุณาปรับคำตอบให้เหมาะสมกับบริบทของผู้ใช้`;
}