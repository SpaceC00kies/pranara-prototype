/**
 * Natural Thai Conversation Patterns for Pranara
 * Supporting authentic, varied responses that feel naturally Thai
 */

export interface EmotionalContext {
    currentMood: 'anxious' | 'sad' | 'worried' | 'calm' | 'seeking' | 'neutral';
    intensityLevel: number; // 1-5
    topicProgression: string[];
    conversationLength: number;
    emotionalJourney: Array<{
        timestamp: Date;
        mood: string;
        trigger?: string;
    }>;
}

export interface ResponseStyle {
    openingStyle: 'acknowledge' | 'gentle_question' | 'metaphor' | 'direct_comfort' | 'shared_understanding';
    breathingPace: 'slow' | 'steady' | 'matching_user';
    closingStyle: 'invitation' | 'affirmation' | 'gentle_suggestion' | 'open_space';
}

export const ThaiConversationPatterns = {
    // Acknowledgment patterns that feel natural
    acknowledgments: {
        understanding: [
            "เข้าใจค่ะ...",
            "อืม ใช่เลย...",
            "ฟังแล้วเห็นภาพเลย...",
            "รู้สึกได้เลยค่ะว่า...",
            "เห็นด้วยค่ะ...",
            "ใช่เลยนะคะ..."
        ],
        empathy: [
            "หนักใจมากเลยใช่ไหมคะ",
            "ช่วงนี้ไม่ง่ายเลยนะคะ",
            "เป็นความรู้สึกที่หลายคนเจอค่ะ",
            "ใครๆ ก็มีช่วงแบบนี้นะคะ",
            "เข้าใจความรู้สึกนี้ดีเลยค่ะ",
            "รู้สึกได้ถึงความเป็นห่วงนี้เลย"
        ]
    },

    // Gentle transitions
    transitions: {
        toSuggestion: [
            "ถ้าพร้อม ลองดูวิธีนี้ได้นะคะ...",
            "มีอะไรที่อาจช่วยได้...",
            "จากประสบการณ์ของหลายๆ คน...",
            "ค่อยๆ ลองทีละอย่าง...",
            "บางทีอาจลองดู...",
            "ถ้าสะดวก อาจจะ..."
        ],
        toQuestion: [
            "อยากรู้ว่า...",
            "ช่วยเล่าเพิ่มหน่อยได้ไหมคะ...",
            "ปกติแล้ว...",
            "รู้สึกยังไงบ้างคะ เวลา...",
            "เป็นยังไงบ้างคะ เมื่อ...",
            "ลองนึกดูว่า..."
        ]
    },

    // Natural pauses and breathing cues
    pauseIndicators: [
        "...",  // Thinking pause
        "—",    // Breath pause
        ",",    // Natural comma pause
    ],

    // Emotional intensity responses
    intensityResponses: {
        high: [
            "ปราณารารู้สึกได้ถึงความเจ็บปวดนี้ค่ะ",
            "ไม่ต้องรีบ ค่อยๆ หายใจ",
            "อยู่ตรงนี้ด้วยกันนะคะ",
            "ให้เวลากับตัวเองหน่อย"
        ],
        medium: [
            "หนักใจมากใช่ไหมคะ",
            "บางทีการได้พูดออกมา ก็ทำให้ใจเบาขึ้นได้",
            "ช่วงนี้ท้าทายจริงๆ นะคะ",
            "เข้าใจความรู้สึกที่ว่ามา"
        ],
        low: [
            "ฟังดูเหมือนมีอะไรค้างคาใจอยู่นะคะ",
            "บอกเล่าออกมาได้เลย ปราณาราอยู่ตรงนี้ฟังค่ะ",
            "มีอะไรอยากแบ่งปันไหมคะ",
            "เป็นยังไงบ้างคะ วันนี้"
        ]
    }
};

export function selectResponseStyle(
    emotionalContext: EmotionalContext,
    conversationLength: number,
    recentStyles: ResponseStyle[] = []
): ResponseStyle {
    // Never repeat the same style twice in a row
    // Match the user's emotional state
    if (emotionalContext.intensityLevel > 3) {
        // High intensity - start with acknowledgment, slow breathing
        return {
            openingStyle: 'acknowledge',
            breathingPace: 'slow',
            closingStyle: 'open_space'
        };
    }

    // Vary based on conversation flow
    const styles: ResponseStyle[] = [
        { openingStyle: 'gentle_question', breathingPace: 'steady', closingStyle: 'invitation' },
        { openingStyle: 'shared_understanding', breathingPace: 'matching_user', closingStyle: 'affirmation' },
        { openingStyle: 'direct_comfort', breathingPace: 'slow', closingStyle: 'gentle_suggestion' },
        { openingStyle: 'acknowledge', breathingPace: 'steady', closingStyle: 'open_space' },
        { openingStyle: 'metaphor', breathingPace: 'matching_user', closingStyle: 'invitation' }
    ];

    // Filter out recently used styles
    const unusedStyles = styles.filter(style =>
        !recentStyles.some(recent =>
            recent.openingStyle === style.openingStyle
        )
    );

    // Select based on conversation progression
    if (conversationLength === 1) {
        // First interaction - gentle welcome
        return unusedStyles.find(s => s.openingStyle === 'gentle_question') || styles[0];
    } else if (conversationLength < 5) {
        // Early conversation - build rapport
        const earlyStyles = unusedStyles.filter(s =>
            s.openingStyle === 'acknowledge' || s.openingStyle === 'shared_understanding'
        );
        return earlyStyles[0] || unusedStyles[0] || styles[0];
    } else {
        // Deeper conversation - can use metaphors and deeper comfort
        return unusedStyles[0] || styles[0];
    }
}

export function shouldSuggestBreathing(emotionalContext: EmotionalContext): boolean {
    return false; // hard off - no more breathing suggestions
}

export function getBreathingGuidance(): string {
    return `If the user seems overwhelmed, naturally guide them:
"ลองหยุดพักหายใจกันสักครู่นะคะ... หายใจเข้าลึกๆ ช้าๆ... แล้วค่อยๆ ปล่อยออกมา... ดีมากค่ะ... ความรู้สึกที่ว่ามา เราค่อยๆ คลี่คลายไปด้วยกัน"`;
}

export interface CulturalNuances {
    useHonorific: boolean;
    formalityLevel: 'casual' | 'polite' | 'formal';
}

export function detectFormalityPreference(conversationContext: {
    recentMessages?: Array<{ text: string, sender: string }>;
}): 'casual' | 'polite' | 'formal' {
    if (!conversationContext.recentMessages) return 'polite';

    const userMessages = conversationContext.recentMessages
        .filter(msg => msg.sender === 'user')
        .map(msg => msg.text);

    // Check for formal markers
    const formalMarkers = ['ครับผม', 'ค่ะ', 'ขอบคุณครับ', 'ขอบคุณค่ะ', 'กรุณา'];
    const casualMarkers = ['จ้า', 'นะ', 'เอ่ย', 'เฮ้ย'];

    let formalCount = 0;
    let casualCount = 0;

    userMessages.forEach(message => {
        formalMarkers.forEach(marker => {
            if (message.includes(marker)) formalCount++;
        });
        casualMarkers.forEach(marker => {
            if (message.includes(marker)) casualCount++;
        });
    });

    if (formalCount > casualCount) return 'formal';
    if (casualCount > formalCount) return 'casual';
    return 'polite'; // Default
}

export function buildEmotionallyAwarePrompt(
    userMessage: string,
    emotionalContext: EmotionalContext,
    responseStyle: ResponseStyle,
    culturalNuances: CulturalNuances,
    conversationContext?: string
): string {
    const contextParts: string[] = [];

    // Add emotional awareness
    if (emotionalContext.intensityLevel > 2) {
        contextParts.push(`Emotional State: User is ${emotionalContext.currentMood} with intensity ${emotionalContext.intensityLevel}/5. Respond with extra gentleness and empathy.`);
    }

    // Add response style guidance
    contextParts.push(`Response Style: ${responseStyle.openingStyle} opening, ${responseStyle.breathingPace} breathing pace, ${responseStyle.closingStyle} closing.`);

    // Add cultural context
    if (culturalNuances.useHonorific) {
        contextParts.push(`Cultural Context: Use respectful language appropriate for elderly users. Use "คุณ" and formal particles.`);
    }

    contextParts.push(`Formality Level: ${culturalNuances.formalityLevel} - adjust particle usage accordingly.`);

    // Add breathing guidance if needed
    if (shouldSuggestBreathing(emotionalContext)) {
        contextParts.push(getBreathingGuidance());
    }

    // Add conversation context if provided
    if (conversationContext) {
        contextParts.push(conversationContext);
    }

    const contextString = contextParts.length > 0 ? contextParts.join('\n\n') + '\n\n' : '';
    return contextString + `Caregiver asks: ${userMessage}`;
}

export function analyzeEmotionalContext(recentMessages: Array<{ text: string, sender: string }>): EmotionalContext {
    if (!recentMessages || recentMessages.length === 0) {
        return {
            currentMood: 'neutral',
            intensityLevel: 1,
            topicProgression: [],
            conversationLength: 0,
            emotionalJourney: [{
                timestamp: new Date(),
                mood: 'neutral'
            }]
        };
    }

    const userMessages = recentMessages.filter(msg => msg.sender === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1]?.text || '';

    // Thai emotional markers
    const anxietyMarkers = ['กังวล', 'กลัว', 'ไม่แน่ใจ', 'วิตก', 'เครียด'];
    const sadnessMarkers = ['เศร้า', 'เหนื่อย', 'ท้อ', 'เบื่อ', 'หดหู่'];
    const worryMarkers = ['เป็นห่วง', 'กลุ้มใจ', 'ไม่สบายใจ', 'ห่วงใย'];

    let currentMood: EmotionalContext['currentMood'] = 'neutral';
    let intensityLevel = 1;

    // Detect mood from text
    if (anxietyMarkers.some(marker => lastUserMessage.includes(marker))) {
        currentMood = 'anxious';
        intensityLevel = 3;
    } else if (sadnessMarkers.some(marker => lastUserMessage.includes(marker))) {
        currentMood = 'sad';
        intensityLevel = 3;
    } else if (worryMarkers.some(marker => lastUserMessage.includes(marker))) {
        currentMood = 'worried';
        intensityLevel = 2;
    }

    // Increase intensity for multiple emotional markers or urgent language
    const urgentMarkers = ['ฉุกเฉิน', 'ด่วน', 'ช่วย', 'ไม่รู้จะทำยังไง'];
    if (urgentMarkers.some(marker => lastUserMessage.includes(marker))) {
        intensityLevel = Math.min(5, intensityLevel + 2);
    }

    return {
        currentMood,
        intensityLevel,
        topicProgression: userMessages.map(msg => msg.text.substring(0, 50)),
        conversationLength: recentMessages.length,
        emotionalJourney: [{
            timestamp: new Date(),
            mood: currentMood,
            trigger: lastUserMessage.substring(0, 50)
        }]
    };
}