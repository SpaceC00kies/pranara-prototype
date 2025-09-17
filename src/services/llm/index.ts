/**
 * LLM Services Index
 * 
 * Main entry point for all LLM-related services and utilities.
 */

// Core service
export { 
  AIService, 
  createAIService, 
  createDefaultAIConfig,
  type AIServiceConfig,
  type AIServiceResponse 
} from './aiService';

// Providers
export { GeminiDirectProvider, type GeminiDirectConfig } from './geminiDirectProvider';

// Prompt utilities
export {
  buildUserPrompt,
  getResponseDisclaimer,
  validateUserInput,
  formatThaiTextResponse,
} from './promptUtils';

// Re-export types from main types file
export type {
  ChatMessage,
  ChatResponse,
  ErrorResponse,
  ErrorCode,
  TopicCategory,
  SafetyCheckResult,
  PIIScrubbingResult,
} from '../../types';

// Default export
import { AIService } from './aiService';
export default AIService;