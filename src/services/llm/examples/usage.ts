/**
 * Usage Examples for Jirung Senior Advisor AI Service
 * 
 * This file demonstrates how to use the AI service in different scenarios.
 */

import { AIService, createAIService, createDefaultAIConfig } from '../index';
import { GeminiProvider } from '../geminiProvider';
import { LLMError } from '../../../types';

// ============================================================================
// BASIC USAGE EXAMPLE
// ============================================================================

async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');
  
  try {
    // Create Gemini provider
    const geminiProvider = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here'
    });

    // Create AI service with default configuration
    const aiService = createAIService(geminiProvider);

    // Process a simple message
    const message = 'คุณยายมีอาการปวดหัว ควรทำอย่างไร';
    const sessionId = 'session-' + Date.now();
    
    const response = await aiService.processMessage(message, sessionId, 'th');
    
    console.log('User:', message);
    console.log('AI Response:', response.response);
    console.log('Topic:', response.topic);
    console.log('Show LINE Option:', response.showLineOption);
    console.log('Safety Result:', response.safetyResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// CUSTOM CONFIGURATION EXAMPLE
// ============================================================================

async function customConfigExample() {
  console.log('\\n=== Custom Configuration Example ===');
  
  try {
    // Create provider with custom settings
    const geminiProvider = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
      model: 'gemini-1.5-flash' // Use specific model
    });

    // Create custom configuration
    const config = createDefaultAIConfig(geminiProvider);
    config.maxRetries = 5; // Increase retry attempts
    config.retryDelayMs = 2000; // Increase retry delay
    config.defaultLLMConfig.temperature = 0.5; // More conservative responses
    config.defaultLLMConfig.maxOutputTokens = 512; // Shorter responses

    // Create AI service with custom config
    const aiService = new AIService(config);

    // Process message
    const message = 'My grandfather has diabetes and high blood pressure. What should I watch for?';
    const response = await aiService.processMessage(message, 'session-custom', 'en');
    
    console.log('User:', message);
    console.log('AI Response:', response.response);
    console.log('Usage:', response.usage);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EMERGENCY DETECTION EXAMPLE
// ============================================================================

async function emergencyDetectionExample() {
  console.log('\\n=== Emergency Detection Example ===');
  
  try {
    const geminiProvider = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here'
    });
    
    const aiService = createAIService(geminiProvider);

    // Emergency message
    const emergencyMessage = 'คุณปู่หายใจไม่ออก หน้าเขียว ช่วยด้วย!';
    const response = await aiService.processMessage(emergencyMessage, 'session-emergency', 'th');
    
    console.log('Emergency Message:', emergencyMessage);
    console.log('AI Response:', response.response);
    console.log('Emergency Detected:', response.safetyResult.emergencyDetected);
    console.log('Should show emergency info:', response.response.includes('1669'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// CONNECTION VALIDATION EXAMPLE
// ============================================================================

async function connectionValidationExample() {
  console.log('\\n=== Connection Validation Example ===');
  
  try {
    const geminiProvider = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here'
    });
    
    const aiService = createAIService(geminiProvider);

    // Validate connection
    const isConnected = await aiService.validateConnection();
    console.log('Connection Status:', isConnected ? 'Connected' : 'Failed');
    
    // Get provider info
    const providerName = aiService.getProviderName();
    console.log('Provider:', providerName);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// ERROR HANDLING EXAMPLE
// ============================================================================

async function errorHandlingExample() {
  console.log('\\n=== Error Handling Example ===');
  
  try {
    // Create provider with invalid API key
    const geminiProvider = new GeminiProvider({
      apiKey: 'invalid-api-key'
    });
    
    const aiService = createAIService(geminiProvider);

    // This should fail gracefully
    const message = 'Test message';
    const response = await aiService.processMessage(message, 'session-error', 'th');
    
    console.log('Unexpected success:', response);
    
  } catch (error) {
    console.log('Expected error caught:');
    console.log('- Code:', (error as LLMError).code);
    console.log('- Message:', (error as LLMError).message);
    console.log('- Retryable:', (error as LLMError).retryable);
  }
}

// ============================================================================
// CONFIGURATION UPDATE EXAMPLE
// ============================================================================

async function configurationUpdateExample() {
  console.log('\\n=== Configuration Update Example ===');
  
  try {
    const geminiProvider = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here'
    });
    
    const aiService = createAIService(geminiProvider);

    // Update LLM configuration at runtime
    aiService.updateLLMConfig({
      temperature: 0.3, // More conservative
      maxOutputTokens: 256, // Shorter responses
    });

    const message = 'คุณยายนอนไม่หลับ มีวิธีช่วยไหม';
    const response = await aiService.processMessage(message, 'session-config', 'th');
    
    console.log('User:', message);
    console.log('AI Response (with updated config):', response.response);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function runAllExamples() {
  console.log('🤖 Jirung Senior Advisor AI Service Examples\\n');
  
  // Check if API key is available
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  Set GEMINI_API_KEY environment variable to run examples with real API calls');
    console.log('   Example: export GEMINI_API_KEY=your-actual-api-key\\n');
  }
  
  await basicUsageExample();
  await customConfigExample();
  await emergencyDetectionExample();
  await connectionValidationExample();
  await errorHandlingExample();
  await configurationUpdateExample();
  
  console.log('\\n✅ All examples completed!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicUsageExample,
  customConfigExample,
  emergencyDetectionExample,
  connectionValidationExample,
  errorHandlingExample,
  configurationUpdateExample,
  runAllExamples,
};