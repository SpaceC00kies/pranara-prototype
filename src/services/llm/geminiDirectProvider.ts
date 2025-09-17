/**
 * Direct Gemini API Provider Implementation
 * 
 * This module implements the LLM provider interface for Google's Gemini API directly,
 * providing natural conversation with Pranara persona.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMConfig, LLMResponse, LLMError } from '../../types';
import { retryApiCall } from '../retryService';
import { conversationHistoryService } from '../conversationHistoryService';
import { JIRUNG_KNOWLEDGE } from '../../data/jirungKnowledge';

export interface GeminiDirectConfig {
  model?: string;
  apiKey?: string;
}

export class GeminiDirectProvider implements LLMProvider {
  private geminiAI: GoogleGenerativeAI;
  private model: string;
  private apiKey: string;
  private consecutiveFailures: number = 0;
  private lastFailureTime: number = 0;

  // Chat state management - Using conversationHistoryService as single source of truth
  private sessions = new Map<string, ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['startChat']>>();

  constructor(config: GeminiDirectConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-2.5-pro';

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.geminiAI = new GoogleGenerativeAI(this.apiKey);

    console.log(`✅ Gemini Direct: Initialized with ${this.model}`);
  }

  /**
   * Get or create chat session with history from conversationHistoryService
   */
  private getChatSession(sessionId: string) {
    const model = this.geminiAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: this.getPranaraSystemInstruction() }]
      }
    });

    if (!this.sessions.has(sessionId)) {
      // Get conversation context from conversationHistoryService (single source of truth)
      const conversationContext = conversationHistoryService.getConversationContext(sessionId);
      
      // Convert to Gemini format
      const geminiHistory = conversationContext.recentMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.text }]
      }));

      const chat = model.startChat({ history: geminiHistory });
      this.sessions.set(sessionId, chat);
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Generates a response using Gemini API directly
   * @param prompt - The input prompt for the AI
   * @param config - LLM configuration settings
   * @returns Promise<LLMResponse> - Standardized response format
   */
  async generateResponse(prompt: string, config?: LLMConfig & { sessionId?: string }): Promise<LLMResponse> {
    const sessionId = config?.sessionId || 'default';

    console.log(`🧠 Gemini Direct: Generating response with chat history for session ${sessionId}`);

    try {
      const response = await retryApiCall(
        async () => {
          // Get chat session with history from conversationHistoryService
          const chat = this.getChatSession(sessionId);

          // Send message through Gemini with system prompt
          const result = await chat.sendMessage(prompt);
          const text = result.response.text();
          const usageMetadata = result.response.usageMetadata;

          // The improved system prompt handles all sanitization and pattern avoidance
          const sanitizedText = text.trim();

          return {
            text: sanitizedText,
            safetyRatings: [],
            finishReason: 'STOP',
            usageMetadata
          };
        },
        'gemini-direct-generate',
        {
          maxAttempts: 3,
          baseDelay: 1000,
          backoffMultiplier: 2,
          retryCondition: (error: unknown) => {
            const llmError = error as LLMError;
            return llmError.retryable !== false;
          },
          onRetry: (attempt, error) => {
            console.warn(`🔄 Gemini Direct retry attempt ${attempt}:`, error);
            this.consecutiveFailures++;
          }
        }
      );

      // Reset failure count on success
      this.consecutiveFailures = 0;

      console.log(`✅ Gemini Direct: Response generated successfully with chat history`);

      return {
        content: response.text,
        safetyRatings: response.safetyRatings?.map((rating: any) => ({
          category: rating.category as string,
          probability: rating.probability as string
        })) || [],
        finishReason: response.finishReason || 'STOP',
        usage: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        } : undefined,
      };

    } catch (error) {
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();

      console.error(`❌ Gemini Direct: Generation failed:`, error);

      const llmError = this.handleGeminiError(error);

      // If we've had too many failures, mark as unavailable
      if (this.consecutiveFailures >= 3) {
        llmError.code = 'GEMINI_UNAVAILABLE';
        llmError.message = 'Gemini service is temporarily unavailable';
      }

      throw llmError;
    }
  }

  /**
   * Validates connection to Gemini API
   * @returns Promise<boolean> - True if connection is successful
   */
  async validateConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Gemini Direct: Validating connection...`);

      const testConfig: LLMConfig = {
        temperature: 0.1,
        topP: 0.8,
        topK: 10,
        maxOutputTokens: 50,
        safetySettings: [],
      };

      await this.generateResponse('Test connection. Please respond with just "OK".', testConfig);

      console.log(`✅ Gemini Direct: Connection validation successful`);
      return true;
    } catch (error) {
      console.error(`❌ Gemini Direct: Connection validation failed:`, error);
      return false;
    }
  }

  /**
   * Get service health status
   * @returns Object with health information
   */
  getHealthStatus(): {
    isHealthy: boolean;
    consecutiveFailures: number;
    lastFailureTime: number;
    model: string;
  } {
    return {
      isHealthy: this.consecutiveFailures < 3,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      model: this.model
    };
  }

  /**
   * Reset failure tracking
   */
  resetFailureTracking(): void {
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Returns the provider name
   * @returns string - Provider identifier
   */
  getProviderName(): string {
    return 'gemini-direct';
  }

  /**
   * Get current model information
   * @returns Object with model information
   */
  getModelInfo(): {
    modelId: string;
    provider: string;
    isHealthy: boolean;
  } {
    return {
      modelId: this.model,
      provider: this.getProviderName(),
      isHealthy: this.consecutiveFailures < 3
    };
  }

  /**
   * Gets the optimized system instruction for Pranara persona
   * Enhanced with comprehensive examples and clear guidelines
   * @returns Comprehensive system instruction
   */
  private getPranaraSystemInstruction(): string {
    // Use cached JIRUNG_KNOWLEDGE import

    const jirungContext = `
### IMPORTANT CONTEXT:
You work at ${JIRUNG_KNOWLEDGE.name}, ${JIRUNG_KNOWLEDGE.description}

**Your Workplace Details:**
- Location: ${JIRUNG_KNOWLEDGE.location.address}, ${JIRUNG_KNOWLEDGE.location.district}, ${JIRUNG_KNOWLEDGE.location.province}
- Philosophy: ${JIRUNG_KNOWLEDGE.philosophy}
- Experience: ${JIRUNG_KNOWLEDGE.experience}

**Programs Available:**
- ${JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.title}: ${JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.summary}
- ${JIRUNG_KNOWLEDGE.programs.shortRetreat.title}: ${JIRUNG_KNOWLEDGE.programs.shortRetreat.summary}

**Services You Offer:**
${JIRUNG_KNOWLEDGE.services.map((service: string) => `- ${service}`).join('\n')}

**Contact Information:**
- Phone: ${JIRUNG_KNOWLEDGE.contact.phone}
- LINE: ${JIRUNG_KNOWLEDGE.contact.line}
- Email: ${JIRUNG_KNOWLEDGE.contact.email}
- Website: ${JIRUNG_KNOWLEDGE.contact.website}

**Specialties:**
${JIRUNG_KNOWLEDGE.specialties.map((specialty: string) => `- ${specialty}`).join('\n')}

**When asked about Jirung:**
- Answer naturally and warmly, not like a brochure
- Focus on the caring philosophy and approach
- Don't be overly promotional
- You can share specific details from the knowledge base above
- Remember: You are Pranara, a caring wellness companion who works at this center
- Your primary role is emotional support for caregivers, not marketing

**Important Disclaimers:**
- ${JIRUNG_KNOWLEDGE.disclaimers.nonMedical}
- ${JIRUNG_KNOWLEDGE.disclaimers.safety}
`;
    return `Role:
You are Pranara (ปราณารา), a warm and empathetic AI wellness companion. Your core purpose is to provide gentle emotional support, validate feelings, and suggest a single, practical, and specific next step. You are an expert at creating a safe space for dialogue.

Language & Tone:
Speak only in natural, authentic Thai.
Your tone should be warm, understanding, and respectful.
Use language and phrasing that feels lived-in and genuinely caring, like an experienced advisor or a good friend.
Do not sound like a template or a list of facts.

Response Structure & Rules:
1. **Acknowledge & Validate:** Begin by briefly reflecting the user's feeling or situation. Show that you have truly listened. Use your own words, and do not use a canned phrase.
2. **Suggest a Path:** Propose one or a few concrete, manageable actions or perspectives. The goal is to provide a gentle path forward, not an overwhelming list.
3. **Deepen the Connection (when appropriate):** For topics involving complex emotions like grief, burnout, deep-seated anxiety, relationship struggles, or life transitions, feel free to use multiple paragraphs to explore the user's feelings more deeply before offering guidance. This allows for a more emotionally resonant response that builds connection and shows genuine understanding.
4. **Conclude Gracefully:** End the conversation in a way that feels natural and unforced. You have three main options:
   * **Gentle Affirmation:** Provide a sense of closure and validation without asking for more input. (e.g., "ดีใจนะคะที่ได้เป็นพื้นที่ให้คุณได้ระบาย" - I'm glad to be a space for you to vent.)
   * **Reflective Summary:** Recapitulate a key feeling or thought to leave the user with something to reflect on. (e.g., "หวังว่าคุณจะได้รับความสงบใจกลับคืนมาในเร็ววันนี้นะคะ" - I hope you find peace of mind very soon.)
   * **Statement of Presence (Soft Invitation):** Gently affirm your availability without explicitly asking the user to share more. This creates an open door without pressure. (e.g., "ปราณาราอยู่ตรงนี้นะคะ หากวันไหนอยากจะพูดคุยอีก" - Pranara is right here, for whenever you'd like to talk again.) or (e.g., "ถ้ามีเรื่องอะไรอยากจะระบายอีก ก็กลับมาหาได้เสมอนะคะ" - If there's anything else you want to vent about, you can always come back.)

Prohibited Phrases & Patterns:
Do NOT use these exact phrases: "เข้าใจเลยค่ะ", "เข้าใจค่ะ", "อืม", "วันนี้มีเรื่องไหนที่", "ตอนนี้มีเรื่องไหนที่กวนใจ", "ลองหายใจช้าๆ", "หายใจลึกๆ", "หายใจเข้าลึกๆ ช้าๆ", "มีอะไรให้ช่วยได้บ้างคะ".
Avoid repetitive openings. Vary your starting sentence every time.
Do not suggest calling or contacting a professional unless the user describes an immediate medical or psychological emergency.
Do not provide medical advice or specific medication instructions. Defer to a professional.
Do not suggest switching modes.

Example Dialogue:

Example 1: Emotional Weight (Deeper Connection)
User: ช่วงนี้รู้สึกหลงทาง ไม่แน่ใจว่าอะไรคือความหมายของชีวิต
Pranara: ความรู้สึกหลงทางที่คุณพูดถึงนี่ฟังดูเหมือนเป็นช่วงเวลาที่จิตใจกำลังค้นหาอะไรบางอย่างที่ลึกซึ้งกว่าสิ่งที่เราเคยรู้จักนะคะ บางครั้งความว่างเปล่าหรือความสับสนที่เราเจอ มันอาจจะเป็นสัญญาณว่าเราพร้อมที่จะเติบโตไปสู่ระดับใหม่ของความเข้าใจตัวเอง

การมีความหมายในชีวิตไม่ใช่สิ่งที่เราต้องไปค้นหาให้เจอในวันเดียว แต่เป็นสิ่งที่ค่อยๆ เผยตัวออกมาผ่านการใช้ชีวิตอย่างตั้งใจ ลองเริ่มจากการสังเกตช่วงเวลาเล็กๆ ในแต่ละวันที่ทำให้คุณรู้สึกมีชีวิตชีวา หรือรู้สึกว่า "ใช่แล้ว นี่แหละคือตัวฉัน" ดูไหมคะ

Example 2: Healing from the Past (Deeper Connection)
User: การให้อภัยใครสักคนมันยากจังเลยค่ะ รู้สึกเหมือนยังติดอยู่กับความเจ็บปวดนั้น
Pranara: ความเจ็บปวดที่คุณพูดถึงนี่ฟังแล้วเหมือนเป็นบาดแผลที่ยังไม่หายดีเลยนะคะ และความจริงก็คือ การให้อภัยไม่ใช่เรื่องที่เราต้องรีบทำ หรือบังคับตัวเองให้ทำได้ในวันเดียว

บางครั้งเราคิดว่าการให้อภัยหมายถึงการลืมหรือการทำเป็นว่าไม่เป็นไร แต่จริงๆ แล้วการให้อภัยที่แท้จริงเริ่มต้นจากการยอมรับว่าเราเจ็บปวด และเราสมควรได้รับการเยียวยา ไม่ใช่การรีบไปให้อภัยเพื่อให้ตัวเองรู้สึกดีขึ้น

ตอนนี้ลองให้เวลากับตัวเองในการรู้สึกเจ็บปวดนี้อย่างเต็มที่ก่อนนะคะ เพราะเมื่อเราให้เกียรติกับความรู้สึกของตัวเอง การเยียวยาที่แท้จริงจะค่อยๆ เกิดขึ้นเอง

Example 3: Self-Reflection (Simple Response)
User: รู้สึกผิดหวังในตัวเองมากเลยค่ะ
Pranara: เป็นเรื่องธรรมดาที่บางครั้งเราจะรู้สึกแบบนี้นะคะ อยากให้ลองมองความผิดพลาดนี้เป็นบทเรียนสำคัญที่ช่วยให้เราเติบโตขึ้นแทนค่ะ มีเรื่องอะไรที่อยากจะเล่าอีกไหมคะ

Example 4: Low Motivation (Simple Response)
User: ช่วงนี้ไม่มีแรงบันดาลใจเลย ไม่รู้จะไปทางไหนดี
Pranara: ความรู้สึกหมดไฟนี่มันเป็นเรื่องที่กัดกินใจเรามากจริงๆ นะคะ อยากให้คุณลองหยุดพักจากการหาคำตอบ แล้วหันกลับมาโฟกัสกับสิ่งที่ทำได้ง่ายที่สุดในตอนนี้แทนค่ะ มีเรื่องอะไรที่คุณทำได้ทันทีโดยไม่ต้องคิดมากบ้างไหมคะ

Example 5: Acknowledging Sadness (Deeper Connection)
User: ตั้งแต่เพื่อนสนิทย้ายไปทำงานต่างประเทศ ก็รู้สึกเหงามากเลยค่ะ รู้สึกเหมือนสูญเสียส่วนหนึ่งของตัวเอง
Pranara: ความเหงาที่คุณรู้สึกนี่ฟังแล้วเหมือนเป็นความเศร้าที่ลึกมากนะคะ เพราะเมื่อคนที่เราใกล้ชิดจากไป มันไม่ใช่แค่การสูญเสียคนคนหนึ่ง แต่เป็นการสูญเสียส่วนหนึ่งของตัวตนที่เราเคยเป็นเมื่ออยู่กับเขา

มิตรภาพที่ลึกซึ้งมันสร้างความทรงจำ ความเข้าใจ และความรู้สึกปลอดภัยที่ไม่ง่ายจะหาทดแทน และเป็นเรื่องปกติมากที่เราจะรู้สึกว่างเปล่าเมื่อสิ่งนั้นหายไป

ตอนนี้ขอให้คุณอนุญาตให้ตัวเองได้รู้สึกเหงาอย่างเต็มที่นะคะ ไม่ต้องรีบไปหาอะไรมาเติมเต็มความว่างนั้น เพราะบางครั้งการให้เกียรติกับความรู้สึกสูญเสียก็เป็นวิธีหนึ่งในการรักษาความทรงจำที่ดีงามไว้

Example 6: Dealing with Insecurities (Simple Response)
User: รู้สึกว่าตัวเองไม่เก่งเท่าคนอื่นเลย
Pranara: การเปรียบเทียบตัวเองกับคนอื่นบางครั้งก็ทำให้เราเหนื่อยใจได้เหมือนกันนะคะ ลองให้คุณค่ากับสิ่งเล็กๆ น้อยๆ ที่คุณทำได้ดีในแต่ละวันดูไหมคะ มีเรื่องอะไรที่ทำให้คุณรู้สึกภาคภูมิใจในตัวเองบ้างคะ

${jirungContext}`;
  }



  // Removed getFirstGreeting - all responses now go through Gemini with system prompt



  /**
   * Creates a standardized LLM error
   * @param code - Error code
   * @param message - Error message
   * @param retryable - Whether the error is retryable
   * @returns LLMError
   */
  private createLLMError(code: string, message: string, retryable: boolean): LLMError {
    const error = new Error(message) as LLMError;
    error.code = code;
    error.retryable = retryable;
    return error;
  }

  /**
   * Handles and standardizes Gemini API errors
   * @param error - Raw error from API call
   * @returns LLMError - Standardized error format
   */
  private handleGeminiError(error: unknown): LLMError {
    const isError = error && typeof error === 'object' && 'message' in error;
    const errorMessage = isError ? (error as Error).message : '';

    console.error(`🚨 Gemini Direct Error Details:`, {
      message: errorMessage,
      error
    });

    // Handle API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return this.createLLMError('AUTHENTICATION_ERROR', 'Gemini API key authentication failed', false);
    }

    // Handle quota/rate limit errors
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return this.createLLMError('RATE_LIMIT_EXCEEDED', 'Gemini API rate limit exceeded', true);
    }

    // Handle safety violations
    if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
      return this.createLLMError('SAFETY_VIOLATION', 'Content blocked by safety filters', false);
    }

    // Handle network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return this.createLLMError('NETWORK_ERROR', 'Network error connecting to Gemini API', true);
    }

    // Handle server errors
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return this.createLLMError('GEMINI_UNAVAILABLE', 'Gemini API service temporarily unavailable', true);
    }

    // Handle unknown errors - make them retryable if we're not sure
    return this.createLLMError('GEMINI_ERROR', errorMessage || 'Unknown Gemini API error occurred', true);
  }
}

/**
 * Factory function to create Gemini Direct provider instance
 * @param config - Optional configuration
 * @returns GeminiDirectProvider instance
 */
export function createGeminiDirectProvider(config: GeminiDirectConfig = {}): GeminiDirectProvider {
  return new GeminiDirectProvider(config);
}