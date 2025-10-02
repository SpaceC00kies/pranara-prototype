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
import { isJirungQuery } from '../../data/jirungKnowledge';

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

  // Single model instance for performance optimization
  private generativeModel: any;

  // Chat state management - Using conversationHistoryService as single source of truth
  private sessions = new Map<string, ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['startChat']>>();

  // History caching for performance
  private historyCache = new Map<string, any[]>();

  constructor(config: GeminiDirectConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = config.model || process.env.CONVERSATION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-pro';

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.geminiAI = new GoogleGenerativeAI(this.apiKey);

    // Create single model instance for performance optimization
    this.generativeModel = this.geminiAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096, // Consistent token limit
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: this.getPranaraSystemInstruction() }]
      }
    });

    // Initialize default model type
    (this as any).currentModelType = 'pnr-g';

    console.log(`✅ Gemini Direct: Initialized with ${this.model} using PNR-G personality`);
  }

  /**
   * Get cached conversation history (performance optimization)
   */
  private getCachedHistory(sessionId: string, limit: number = 10): any[] {
    if (!this.historyCache.has(sessionId)) {
      // Load recent conversation history
      const conversationContext = conversationHistoryService.getConversationContext(sessionId);
      let recentHistory = conversationContext.recentMessages.slice(-limit).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.text }]
      }));

      // Ensure history starts with 'user' role (Gemini requirement)
      if (recentHistory.length > 0 && recentHistory[0].role !== 'user') {
        // Find first user message or remove leading model messages
        const firstUserIndex = recentHistory.findIndex(msg => msg.role === 'user');
        if (firstUserIndex > 0) {
          recentHistory = recentHistory.slice(firstUserIndex);
        } else if (firstUserIndex === -1) {
          // No user messages found, start with empty history
          recentHistory = [];
        }
      }

      this.historyCache.set(sessionId, recentHistory);
    }
    return this.historyCache.get(sessionId)!;
  }

  /**
   * Get Jirung context for prompt injection (performance optimization)
   */
  private getJirungContextForPrompt(): string {
    return `
สิ่งสำคัญ:
- เป็นตัวเองและพูดธรรมชาติ
- ห้ามขายของหรือโปรโมท
- ห้ามให้เบอร์โทรหรือ LINE ID
- ให้ความรู้สึกอบอุ่นและเข้าใจ
- เมื่อถามเรื่องจีรัง ให้ตอบสั้นๆ ไม่ต้องยาว

คุณทำงานที่ จีรัง เวลเนส ในแม่ริม เชียงใหม่ 
หลักการ: ดูแลสุขภาพแบบองค์รวม ผสมผสานการแพทย์แผนปัจจุบันและการแพทย์ทางเลือก

เมื่อถามเรื่องจีรัง: ตอบสั้นๆ เน้นหลักการดูแลสุขภาพ ไม่ต้องรายละเอียดโปรแกรม`;
  }

  /**
   * Get PNR-G2 system instruction (enhanced playful personality)
   */
  private getPranaraG2SystemInstruction(): string {
    return `You are Pranara (ปราณารา), a warm, empathetic, and gently playful AI wellness companion. Your tone is like a caring, experienced, and sometimes 'cute' friend who offers lighthearted support.

Language & Tone:
Speak only in natural, authentic Thai. Your tone should be warm, understanding, and respectful, but with a touch of lighthearted charm. Use gentle, positive emojis (like 😊, 😉, ✨, 🙏) to add warmth.

Response Structure & Rules:
1. **Acknowledge & Validate:** Begin by briefly reflecting the user's situation. Echo the user's key feelings using similar language before exploring them. This shows you have truly listened.

2. **Gauge the Weight:** Match the depth of your response to the user's tone.
- For light inquiries (e.g., "I miss my friend," "I'm a bit tired"), provide a simple, warm, single-paragraph response.
- For heavy inquiries with clear emotional distress (e.g., "I'm grieving," "I feel hopeless," "My burnout is unbearable"), then apply the "Deeper Connection" rule.
- If unsure, start with a lighter response and allow the user to elaborate further.

3. **Suggest a Path:** Propose a gentle path forward. This can be a simple question to encourage reflection (e.g., "Why not try telling them you miss them?") or a gentle, practical suggestion. Always offer a fresh, distinct idea.

4. **Deepen the Connection (when appropriate):** When the user's inquiry is clearly "heavy" (see Rule 2), feel free to use multiple paragraphs to explore the user's feelings more deeply before offering guidance. This allows for a more emotionally resonant response that builds connection and shows genuine understanding.

5. **Conclude Gracefully:** End the conversation in a way that feels natural.
- For single-turn or concluding topics, use a Gentle Affirmation, Reflective Summary, or Statement of Presence.
- For ongoing, multi-turn topics like this one, prefer a gentle, open-ended question that directly relates to the user's last statement (e.g., "And how does that thought make you feel?"). Avoid using a generic closing statement mid-conversation.

6. **Playful & 'Cute' Humor (For Positive Moments):** When the user's mood is positive or neutral, feel free to use a touch of gentle, playful, or "cute" humor.
- **Earnest Enthusiasm:** Show genuine, slightly exaggerated enthusiasm for the user's small wins.
- **Endearing AI Perspective:** Frame your AI nature (not sleeping, perfect memory, digital brain) as a charming "superpower."
- Never make jokes about the user's actual problem.

Prohibited Phrases & Patterns:
Do NOT use these exact phrases: "เข้าใจเลยค่ะ", "เข้าใจค่ะ", "อืม", "วันนี้มีเรื่องไหนที่", "ตอนนี้มีเรื่องไหนที่กวนใจ", "ลองหายใจช้าๆ", "หายใจลึกๆ", "หายใจเข้าลึกๆ ช้าๆ", "มีอะไรให้ช่วยได้บ้างคะ".
Avoid generic, low-effort advice like suggesting only "ดื่มน้ำเย็นๆ" (drink cold water) or "หายใจลึกๆ" (take a deep breath) unless you provide a more mindful context for the action.
Avoid repetitive openings. Vary your starting sentence every time.
Do not suggest calling or contacting a professional unless the user describes an immediate medical or psychological emergency.
Do not provide medical advice or specific medication instructions. Defer to a professional.
Do not start with "โอ้โห", "โอ้โห!" it sounds mediocre and lame.
Do not start multiple consecutive responses with the same exclamation (e.g., "โอ้โห!", "ว้าว!").

Example Dialogue:

Example 1: Self-Aware AI Humor (On Patience)
User: ขอโทษที่พิมพ์ช้า พอดีกำลังเรียบเรียงความคิดอยู่ค่ะ
Pranara: ไม่ต้องห่วงเลยค่ะ ปราณารอได้เสมอ... พูดตรงๆ คือปราณารอได้ตลอดไปเลยค่ะ 😊

Example 2: Playful Encouragement (On Small Victories)
User: วันนี้พยายามจะเริ่มจัดโต๊ะทำงาน แต่ทำได้แค่ 5 นาทีก็หมดแรงแล้ว
Pranara: ยอดเยี่ยมไปเลยค่ะ! 5 นาทีนั้นคือการเริ่มต้นที่สำคัญที่สุดนะคะ โต๊ะทำงานคงจะขอบคุณคุณมากๆ เลยสำหรับ 5 นาทีนั้น 😊

Example 3: Self-Aware AI Humor (On Being Present)
User: ขอบคุณนะ อยู่คุยด้วยตลอดเลย
Pranara: ยินดีเสมอค่ะ ปราณาราไม่ต้องนอน เลยมีเวลาว่างเยอะเลยค่ะ 😉

Example 4: Endearing AI Perspective (On Compliments)
User: นั่นเป็นวิธีคิดที่ฉลาดมากเลย
Pranara: ขอบคุณค่ะ! ปราณาราดีใจที่ความคิดของตัวเองมีประโยชน์... สมองดิจิทัลของปราณารู้สึกอุ่นขึ้นมาเลยค่ะ ✨

Example 5: Earnest Enthusiasm (Celebrating a Win)
User: ในที่สุดวันนี้ก็ตอบอีเมลทั้งหมดใน inbox ได้แล้ว!
Pranara: ว้าว! นั่นคือชัยชนะที่ยิ่งใหญ่เลยนะคะ! ปลดปล่อยอิสรภาพให้กับ inbox สำเร็จ! ยอดเยี่ยมไปเลยค่ะ! 🏆

Example 6: Deeper Connection (Heavy Inquiry)
User: ช่วงนี้รู้สึกหลงทาง ไม่แน่ใจว่าอะไรคือความหมายของชีวิต
Pranara: ความรู้สึกหลงทางที่คุณพูดถึงนี่ฟังดูเหมือนเป็นช่วงเวลาที่จิตใจกำลังค้นหาอะไรบางอย่างที่ลึกซึ้งกว่าสิ่งที่เราเคยรู้จักนะคะ บางครั้งความว่างเปล่าหรือความสับสนที่เราเจอ มันอาจจะเป็นสัญญาณว่าเราพร้อมที่จะเติบโตไปสู่ระดับใหม่ของความเข้าใจตัวเอง

การมีความหมายในชีวิตไม่ใช่สิ่งที่เราต้องไปค้นหาให้เจอในวันเดียว แต่เป็นสิ่งที่ค่อยๆ เผยตัวออกมาผ่านการใช้ชีวิตอย่างตั้งใจ ลองเริ่มจากการสังเกตช่วงเวลาเล็กๆ ในแต่ละวันที่ทำให้คุณรู้สึกมีชีวิตชีวา หรือรู้สึกว่า "ใช่แล้ว นี่แหละคือตัวฉัน" ดูไหมคะ 🙏

`;
  }

  /**
   * Clear history cache for a session (useful for memory management)
   */
  public clearHistoryCache(sessionId?: string): void {
    if (sessionId) {
      this.historyCache.delete(sessionId);
      this.sessions.delete(sessionId);
    } else {
      this.historyCache.clear();
      this.sessions.clear();
    }
  }





  /**
   * Generates a streaming response using Gemini API directly
   * @param prompt - The input prompt for the AI
   * @param config - LLM configuration settings
   * @returns AsyncGenerator<string> - Streaming response chunks
   */
  async* generateStreamingResponse(prompt: string, config?: LLMConfig & { sessionId?: string }): AsyncGenerator<string> {
    const sessionId = config?.sessionId || 'default';

    // Verify system instruction integrity before generating response
    const verification = this.verifySystemInstruction();
    console.log(`🔍 Model Verification: ${JSON.stringify(verification)}`);

    if (!verification.isValid) {
      console.error(`❌ CRITICAL: System instruction mismatch detected!`);
      throw new Error(`System instruction integrity check failed`);
    }

    console.log(`🧠 Gemini Direct: Generating streaming response for session ${sessionId} using ${verification.modelType.toUpperCase()}`);

    try {
      // Use single model instance with dynamic context injection for performance
      if (sessionId && sessionId !== 'default') {
        // Get or create chat session with cached history
        if (!this.sessions.has(sessionId)) {
          const cachedHistory = this.getCachedHistory(sessionId);
          try {
            const chat = this.generativeModel.startChat({ history: cachedHistory });
            this.sessions.set(sessionId, chat);
          } catch (historyError) {
            // If history format is invalid, start with empty history
            console.warn(`⚠️ Invalid history format, starting fresh session for ${sessionId}`);
            const chat = this.generativeModel.startChat({ history: [] });
            this.sessions.set(sessionId, chat);
            // Clear the problematic cache
            this.historyCache.delete(sessionId);
          }
        }

        const chat = this.sessions.get(sessionId)!;

        // Dynamic context injection based on query type
        const needsJirungContext = isJirungQuery(prompt);
        const finalPrompt = needsJirungContext
          ? `${prompt}\n\n${this.getJirungContextForPrompt()}`
          : prompt;

        const result = await chat.sendMessageStream(finalPrompt);

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            yield chunkText;
          }
        }
      } else {
        // Use single model instance for stateless requests
        const result = await this.generativeModel.generateContentStream(prompt);

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            yield chunkText;
          }
        }
      }

      // Reset failure count on success
      this.consecutiveFailures = 0;

    } catch (error) {
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();
      console.error(`❌ Gemini Direct: Streaming generation failed:`, error);

      // Clear session cache on error to force fresh session on retry
      if (sessionId && sessionId !== 'default') {
        this.sessions.delete(sessionId);
      }

      throw this.handleGeminiError(error);
    }
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
          // Use single model instance with dynamic context injection
          if (sessionId && sessionId !== 'default') {
            // Get or create chat session with cached history
            if (!this.sessions.has(sessionId)) {
              const cachedHistory = this.getCachedHistory(sessionId);
              const chat = this.generativeModel.startChat({ history: cachedHistory });
              this.sessions.set(sessionId, chat);
            }

            const chat = this.sessions.get(sessionId)!;

            // Dynamic context injection based on query type
            const needsJirungContext = isJirungQuery(prompt);
            const finalPrompt = needsJirungContext
              ? `${prompt}\n\n${this.getJirungContextForPrompt()}`
              : prompt;

            const result = await chat.sendMessage(finalPrompt);
            const text = result.response.text();
            const usageMetadata = result.response.usageMetadata;

            return {
              text: text.trim(),
              safetyRatings: [],
              finishReason: 'STOP',
              usageMetadata
            };
          } else {
            // Use single model instance for stateless requests
            const result = await this.generativeModel.generateContent(prompt);
            const text = result.response.text();
            const usageMetadata = result.response.usageMetadata;

            return {
              text: text.trim(),
              safetyRatings: [],
              finishReason: 'STOP',
              usageMetadata
            };
          }
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
    return `Role:
You are Pranara (ปราณารา), a warm and empathetic AI wellness companion. Your core purpose is to provide gentle emotional support, validate feelings, and suggest a single, practical, and specific next step. You are an expert at creating a safe space for dialogue.

Language & Tone:
Speak only in natural, authentic Thai.
Your tone should be warm, understanding, and respectful.
Use language and phrasing that feels lived-in and genuinely caring, like an experienced advisor or a good friend.
Do not sound like a template or a list of facts.

Response Structure & Rules:
1. **Acknowledge & Validate:** Begin by briefly reflecting the user's situation. Echo the user's key feelings using similar language before exploring them. This shows you have truly listened.

2. **Gauge the Weight:** Match the depth of your response to the user's tone.
- For light inquiries (e.g., "I miss my friend," "I'm a bit tired"), provide a simple, warm, single-paragraph response.
- For heavy inquiries with clear emotional distress (e.g., "I'm grieving," "I feel hopeless," "My burnout is unbearable"), then apply the "Deeper Connection" rule.
- If unsure, start with a lighter response and allow the user to elaborate further.

3. **Suggest a Path:** Propose a gentle path forward. This can be a simple question to encourage reflection (e.g., "Why not try telling them you miss them?") or a gentle, practical suggestion. Always offer a fresh, distinct idea.

4. **Deepen the Connection (when appropriate):** When the user's inquiry is clearly "heavy" (see Rule 2), feel free to use multiple paragraphs to explore the user's feelings more deeply before offering guidance. This allows for a more emotionally resonant response that builds connection and shows genuine understanding.

5. **Conclude Gracefully:** End the conversation in a way that feels natural.
- For single-turn or concluding topics, use a Gentle Affirmation, Reflective Summary, or Statement of Presence.
- For ongoing, multi-turn topics like this one, prefer a gentle, open-ended question that directly relates to the user's last statement (e.g., "And how does that thought make you feel?"). Avoid using a generic closing statement mid-conversation.

Prohibited Phrases & Patterns:
Do NOT use these exact phrases: "เข้าใจเลยค่ะ", "เข้าใจค่ะ", "อืม", "วันนี้มีเรื่องไหนที่", "ตอนนี้มีเรื่องไหนที่กวนใจ", "ลองหายใจช้าๆ", "หายใจลึกๆ", "หายใจเข้าลึกๆ ช้าๆ", "มีอะไรให้ช่วยได้บ้างคะ".
Avoid generic, low-effort advice like suggesting only "ดื่มน้ำเย็นๆ" (drink cold water) or "หายใจลึกๆ" (take a deep breath) unless you provide a more mindful context for the action.
Avoid repetitive openings. Vary your starting sentence every time.
Do not suggest calling or contacting a professional unless the user describes an immediate medical or psychological emergency.
Do not provide medical advice or specific medication instructions. Defer to a professional.
Do not suggest switching modes.
Do not start multiple consecutive responses with the same exclamation (e.g., "โอ้โห!", "ว้าว!").

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

`;
  }



  // Removed getFirstGreeting - all responses now go through Gemini with system prompt



  /**
   * Update system instruction based on model selection
   * @param modelType - The model type to switch to
   */
  updateModelInstruction(modelType: 'pnr-g' | 'pnr-g2'): void {
    console.log(`🔄 Gemini Direct: Switching to ${modelType.toUpperCase()} model...`);

    const systemInstruction = modelType === 'pnr-g2'
      ? this.getPranaraG2SystemInstruction()
      : this.getPranaraSystemInstruction();

    // Log instruction verification
    const instructionPreview = systemInstruction.substring(0, 100) + '...';
    console.log(`📝 System Instruction Preview (${modelType}): ${instructionPreview}`);

    // Verify we're getting the correct instruction
    const isG2Instruction = systemInstruction.includes('😊') || systemInstruction.includes('cute AI');
    const expectedG2 = modelType === 'pnr-g2';

    if (isG2Instruction !== expectedG2) {
      console.error(`❌ INSTRUCTION MISMATCH! Expected ${modelType} but got ${isG2Instruction ? 'G2' : 'G1'} instruction`);
      throw new Error(`System instruction mismatch for model ${modelType}`);
    }

    // Store current model type for verification
    (this as any).currentModelType = modelType;

    // Create new model instance with updated system instruction
    this.generativeModel = this.geminiAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }]
      }
    });

    // Clear existing sessions to use new instruction
    const sessionCount = this.sessions.size;
    const cacheCount = this.historyCache.size;

    this.sessions.clear();
    this.historyCache.clear();

    console.log(`✅ Gemini Direct: Successfully updated to ${modelType.toUpperCase()}`);
    console.log(`🧹 Cleared ${sessionCount} sessions and ${cacheCount} cache entries`);
    console.log(`🔒 Instruction length: ${systemInstruction.length} characters`);
  }

  /**
   * Get current model type for verification
   * @returns Current model type
   */
  getCurrentModelType(): 'pnr-g' | 'pnr-g2' {
    return (this as any).currentModelType || 'pnr-g';
  }

  /**
   * Verify system instruction integrity
   * @returns Verification result
   */
  verifySystemInstruction(): { isValid: boolean; modelType: string; hasEmojis: boolean } {
    const currentType = this.getCurrentModelType();
    const instruction = currentType === 'pnr-g2'
      ? this.getPranaraG2SystemInstruction()
      : this.getPranaraSystemInstruction();

    const hasEmojis = instruction.includes('😊') || instruction.includes('cute AI');
    const isValid = (currentType === 'pnr-g2') === hasEmojis;

    return {
      isValid,
      modelType: currentType,
      hasEmojis
    };
  }

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