// Core type definitions for Jirung Senior Advisor

// ============================================================================
// CHAT MESSAGE INTERFACES
// ============================================================================

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  topic?: TopicCategory;
  showLineOption?: boolean;
  lineHandoffReason?: 'emergency' | 'complex_topic' | 'complex_language' | 'long_conversation' | 'none';
  lineHandoffUrgency?: 'high' | 'medium' | 'low';
  lineHandoffMessage?: string;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  mode?: AppMode;
  model?: 'pnr-g' | 'pnr-g2';
}

export interface ChatResponse {
  response: string;
  topic: TopicCategory;
  showLineOption: boolean;
  sessionId: string;
  mode?: AppMode;
  mcpAnalysis?: MCPAnalysisResponse;
}

// ============================================================================
// USER SESSION INTERFACES
// ============================================================================

export interface UserSession {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  language: 'th' | 'en';
  profile?: UserProfile;
}

// ============================================================================
// USER PROFILE INTERFACES
// ============================================================================

export type AgeRange = '18-29' | '30-39' | '40-49' | '50-59' | '60-69' | '70-79' | '80+';
export type Gender = 'male' | 'female' | 'transgender' | 'non-binary' | 'prefer-not-to-say';
export type Location = 'bangkok' | 'central' | 'north' | 'northeast' | 'south' | 'other';

export interface UserProfile {
  id: string;
  sessionId: string;
  ageRange?: AgeRange;
  gender?: Gender;
  location?: Location;
  culturalContext?: {
    language: 'th' | 'en';
    region?: string;
    familyStructure?: 'nuclear' | 'extended' | 'single' | 'other';
  };
  healthContext?: {
    primaryConcerns?: string[];
    caregivingRole?: 'primary' | 'secondary' | 'family-member' | 'professional';
    experienceLevel?: 'beginner' | 'intermediate' | 'experienced';
  };
  createdAt: Date;
  updatedAt: Date;
  isComplete: boolean;
}

export interface UserProfileRequest {
  sessionId: string;
  ageRange?: AgeRange;
  gender?: Gender;
  location?: Location;
  culturalContext?: UserProfile['culturalContext'];
  healthContext?: UserProfile['healthContext'];
}

export interface UserProfileResponse {
  profile: UserProfile;
  recommendations?: {
    suggestedMode?: AppMode;
    personalizedFeatures?: string[];
    culturalConsiderations?: string[];
  };
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  averageSessionLength: number;
  topLanguages: Record<string, number>;
}

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

export interface AnalyticsEvent {
  sessionId: string;
  timestamp: Date;
  textSnippet: string;
  topic: TopicCategory;
  language: 'th' | 'en';
  lineClicked: boolean;
  routed: 'primary' | 'fallback';
  userProfile?: {
    ageRange?: AgeRange;
    gender?: Gender;
    location?: Location;
  };
}

// ============================================================================
// ENHANCED MCP ANALYSIS INTERFACES
// ============================================================================

export interface MCPAnalysisContext {
  userProfile?: UserProfile;
  conversationHistory?: ChatMessage[];
  currentMode: AppMode;
  sessionMetadata: {
    sessionId: string;
    messageCount: number;
    duration: number;
    language: 'th' | 'en';
  };
}

export interface MCPAnalysisRequest {
  message: string;
  context: MCPAnalysisContext;
  analysisType: 'conversation' | 'health-intelligence' | 'demographic-aware';
}

export interface MCPAnalysisResponse {
  response: string;
  topic: TopicCategory;
  confidence: number;
  demographicInsights?: {
    ageSpecificConsiderations?: string[];
    genderSpecificConsiderations?: string[];
    culturalConsiderations?: string[];
    locationSpecificResources?: string[];
  };
  recommendations?: {
    suggestedActions?: string[];
    followUpQuestions?: string[];
    resourceLinks?: string[];
    escalationSuggestions?: string[];
  };
  mcpToolsUsed?: string[];
}

export interface AnalyticsLog {
  id?: number;
  session_id: string;
  timestamp: Date;
  text_snippet: string;
  topic: string;
  language: string;
  line_clicked: boolean;
  routed: string;
}

export interface TopicAnalytics {
  topic: TopicCategory;
  count: number;
  percentage: number;
  lineClickRate: number;
}

export interface UsageStats {
  totalQuestions: number;
  uniqueSessions: number;
  topTopics: TopicAnalytics[];
  languageDistribution: Record<string, number>;
  lineClickRate: number;
  averageResponseTime: number;
}

// ============================================================================
// PII scrubbing removed - keeping system simple

// ============================================================================
// SAFETY CONFIGURATION INTERFACES
// ============================================================================

export interface SafetySetting {
  category: 'HARM_CATEGORY_DANGEROUS_CONTENT' | 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT';
  threshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH_AND_ABOVE';
}

export interface GeminiSafetyConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  safetySettings: SafetySetting[];
}

export interface ContentFilter {
  checkMedicalContent: (text: string) => boolean;
  checkEmergencyKeywords: (text: string) => boolean;
  suggestLineHandoff: (text: string) => boolean;
}

export interface SafetyCheckResult {
  isSafe: boolean;
  flaggedCategories: string[];
  recommendLineHandoff: boolean;
  emergencyDetected: boolean;
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  fallbackMessage: string;
  showLineOption: boolean;
  timestamp: Date;
}

export type ErrorCode =
  | 'GEMINI_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'DATABASE_ERROR'
  | 'SAFETY_VIOLATION'
  | 'NETWORK_ERROR'
  | 'HEALTH_CHECK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorMessages {
  [key: string]: {
    th: string;
    en: string;
  };
}

export interface FallbackResponse {
  topic: TopicCategory;
  responses: {
    th: string[];
    en: string[];
  };
}

// ============================================================================
// API CONTRACT INTERFACES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  timestamp: Date;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    gemini: boolean;
    database: boolean;
  };
  uptime: number;
  version: string;
  responseTime?: number;
  metrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    errorRate: number;
    requestCount: number;
  };
  serviceDetails?: {
    gemini: ServiceStatus;
    database: ServiceStatus;
  };
}

export interface ServiceStatus {
  name: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
  lastChecked: Date;
}

export interface AdminStatsResponse {
  period: string;
  stats: UsageStats;
  topQuestions: Array<{
    snippet: string;
    count: number;
    topic: TopicCategory;
  }>;
}

// ============================================================================
// LLM PROVIDER ABSTRACTION INTERFACES
// ============================================================================

export interface LLMConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  safetySettings: SafetySetting[];
}

export interface LLMResponse {
  content: string;
  safetyRatings: Array<{
    category: string;
    probability: string;
  }>;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generateResponse(prompt: string, config: LLMConfig): Promise<LLMResponse>;
  validateConnection(): Promise<boolean>;
  getProviderName(): string;
}

export interface LLMError extends Error {
  code: string;
  message: string;
  status?: number;
  retryable: boolean;
}

// ============================================================================
// GEMINI API INTEGRATION INTERFACES
// ============================================================================

export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  safetySettings: SafetySetting[];
  generationConfig: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// ============================================================================
// TOPIC CLASSIFICATION
// ============================================================================

export type TopicCategory =
  | 'stress'
  | 'mindfulness'
  | 'nutrition'
  | 'exercise'
  | 'mental_health'
  | 'relationships'
  | 'work_life_balance'
  | 'spirituality'
  | 'sleep'
  | 'mood'
  | 'general';

export interface TopicKeywords {
  [key: string]: {
    th: string[];
    en: string[];
  };
}

export interface TopicClassificationResult {
  topic: TopicCategory;
  confidence: number;
  keywords: string[];
}

// ============================================================================
// MODE SELECTION INTERFACES
// ============================================================================

export type AppMode = 'conversation' | 'intelligence';

export interface ModeSelection {
  mode: AppMode;
  timestamp: Date;
  sessionId: string;
}

export interface ModeConfig {
  conversation: {
    title: string;
    description: string;
    icon: string;
    features: string[];
  };
  intelligence: {
    title: string;
    description: string;
    icon: string;
    features: string[];
  };
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

export interface ChatInterfaceProps {
  onLineClick: () => void;
  lineUrl?: string;
  mode?: AppMode;
  onModeChange?: () => void;
}

export interface ModeSelectionProps {
  onModeSelect: (mode: AppMode) => void;
  selectedMode?: AppMode;
}

export interface MessageComponentProps {
  message: ChatMessage;
  showLineOption?: boolean;
  onLineClick?: () => void;
}

export interface TypingIndicatorProps {
  isVisible: boolean;
}

export interface LineButtonProps {
  onClick: () => void;
  text?: string;
  className?: string;
}

// ============================================================================
// FEEDBACK SYSTEM INTERFACES
// ============================================================================

export interface FeedbackData {
  messageId: string;
  sessionId: string;
  questionLogId?: number;
  feedbackType: 'helpful' | 'unhelpful' | 'inappropriate' | 'suggestion' | 'error';
  selectedText?: string;
  userComment?: string;
  emotionalTone?: 'too-formal' | 'too-casual' | 'just-right';
  responseLength?: 'too-long' | 'too-short' | 'just-right';
  culturalSensitivity?: 'appropriate' | 'inappropriate' | 'unsure';
  positiveAspects?: string[];
  negativeAspects?: string[];
  promptVersion?: string;
  timestamp: Date;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  satisfactionRate: number;
  commonIssues: Array<{
    category: string;
    count: number;
    examples: string[];
  }>;
  trendData: Array<{
    date: string;
    positive: number;
    negative: number;
  }>;
  responseQualityByTopic: Map<TopicCategory, number>;
  feedbackByType: Record<string, number>;
  feedbackByPromptVersion: Record<string, number>;
  averageRating: number;
}

export interface GoldStandardResponse {
  messageId: string;
  responseText: string;
  positiveScore: number;
  successPatterns: string[];
  promptVersion: string;
  topicCategory: TopicCategory;
  extractedElements: {
    empathyMarkers: string[];
    helpfulSuggestions: string[];
    culturalSensitivity: string[];
    tonalElements: string[];
  };
}

export interface PromptVersionAnalytics {
  version: string;
  totalResponses: number;
  averageRating: number;
  positiveAspectCounts: Record<string, number>;
  commonSuccessPatterns: string[];
  improvementAreas: string[];
}

export interface FeedbackModalProps {
  messageId: string;
  messageText: string;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
  mode?: 'detailed' | 'positive' | 'negative' | 'quick';
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export interface EnvironmentConfig {
  GEMINI_API_KEY: string;
  LINE_URL: string;
  DATABASE_URL?: string;
  KV_URL?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  VERCEL_ENV?: 'development' | 'preview' | 'production';
}