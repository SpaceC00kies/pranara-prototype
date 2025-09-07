# Jirung Senior Advisor - AI Service

This module provides AI-powered chat capabilities for the Jirung Senior Advisor application, specifically designed for Thai elderly care guidance.

## Features

- 🤖 **Gemini AI Integration** - Powered by Google's Gemini Flash model
- 🛡️ **Safety First** - Built-in content safety and emergency detection
- 🇹🇭 **Thai Language Support** - Optimized for Thai elderly care context
- 🔒 **PII Protection** - Automatic scrubbing of sensitive information
- 🔄 **Retry Logic** - Robust error handling with exponential backoff
- 📊 **Analytics Ready** - Comprehensive logging and metrics
- 🏥 **Medical Disclaimers** - Automatic medical advice disclaimers
- 🚨 **Emergency Detection** - Automatic emergency situation detection

## Quick Start

### 1. Installation

```bash
npm install @google/generative-ai
```

### 2. Environment Setup

```bash
export GEMINI_API_KEY=your-gemini-api-key
```

### 3. Basic Usage

```typescript
import { createAIService } from './services/llm';
import { GeminiProvider } from './services/llm/geminiProvider';

// Create provider
const provider = new GeminiProvider({
  apiKey: process.env.GEMINI_API_KEY
});

// Create AI service
const aiService = createAIService(provider);

// Process message
const response = await aiService.processMessage(
  'คุณยายมีอาการปวดหัว ควรทำอย่างไร',
  'session-123',
  'th'
);

console.log(response.response);
```

## Architecture

### Core Components

1. **AIService** - Main orchestrator that coordinates all AI interactions
2. **GeminiProvider** - Google Gemini API integration with safety settings
3. **SystemPrompts** - Thai healthcare-specific prompt templates
4. **TextSanitization** - PII scrubbing and content validation
5. **ContentSafety** - Emergency detection and topic classification

### Data Flow

```
User Input → Validation → PII Scrubbing → Safety Check → Topic Classification → 
Prompt Building → LLM Generation → Response Processing → Safety Disclaimers → Output
```

## Configuration

### AI Service Configuration

```typescript
interface AIServiceConfig {
  llmProvider: LLMProvider;           // LLM provider instance
  defaultLLMConfig: LLMConfig;        // Default LLM settings
  maxRetries: number;                 // Max retry attempts (default: 3)
  retryDelayMs: number;              // Base retry delay (default: 1000ms)
  enableSafetyChecks: boolean;       // Enable safety filtering (default: true)
  enablePIIScrubbing: boolean;       // Enable PII removal (default: true)
}
```

### LLM Configuration

```typescript
interface LLMConfig {
  temperature?: number;              // Response creativity (0.0-1.0)
  topP?: number;                    // Nucleus sampling (0.0-1.0)
  topK?: number;                    // Top-K sampling
  maxOutputTokens?: number;         // Max response length
  safetySettings?: SafetySetting[]; // Content safety settings
}
```

## Safety Features

### Emergency Detection

The system automatically detects emergency situations and provides immediate guidance:

```typescript
// Emergency input
const input = "คุณปู่หายใจไม่ออก หน้าเขียว ช่วยด้วย!";

// Response includes emergency instructions
const response = await aiService.processMessage(input, sessionId, 'th');
// Response: "⚠️ นี่เป็นสถานการณ์ฉุกเฉิน กรุณาโทร 1669 หรือพาไปโรงพยาบาลทันที..."
```

### Content Safety

- **Medical Disclaimers** - Automatic disclaimers for medical content
- **PII Scrubbing** - Removes phone numbers, addresses, personal info
- **Topic Classification** - Categorizes conversations (general, medical, emergency, etc.)
- **LINE Handoff** - Recommends human assistance for complex topics

### Safety Categories

- `general` - General elderly care questions
- `medical` - Health-related questions (with disclaimers)
- `emergency` - Emergency situations (immediate response)
- `medication` - Medication-related questions
- `alzheimer` - Alzheimer's and dementia care
- `fall` - Fall prevention and response
- `sleep` - Sleep-related issues
- `diet` - Nutrition and dietary guidance

## API Reference

### AIService

#### `processMessage(message, sessionId, language)`

Processes a user message and returns an AI response.

**Parameters:**
- `message: string` - User's input message
- `sessionId: string` - Unique session identifier
- `language: 'th' | 'en'` - Language preference (default: 'th')

**Returns:** `Promise<AIServiceResponse>`

```typescript
interface AIServiceResponse {
  response: string;                    // AI-generated response
  topic: TopicCategory;               // Classified topic
  showLineOption: boolean;            // Whether to show LINE handoff option
  safetyResult: SafetyCheckResult;    // Safety analysis results
  processingResult: TextProcessingResult; // Text processing metadata
  usage?: TokenUsage;                 // Token usage statistics
}
```

#### `validateConnection()`

Checks if the LLM provider is available and properly configured.

**Returns:** `Promise<boolean>`

#### `getProviderName()`

Returns the name of the current LLM provider.

**Returns:** `string`

#### `updateLLMConfig(newConfig)`

Updates the LLM configuration at runtime.

**Parameters:**
- `newConfig: Partial<LLMConfig>` - Configuration updates

### GeminiProvider

#### `constructor(config)`

Creates a new Gemini provider instance.

**Parameters:**
- `config.apiKey: string` - Gemini API key
- `config.model?: string` - Model name (default: 'gemini-1.5-flash')

#### `generateResponse(prompt, config)`

Generates a response from the Gemini API.

**Parameters:**
- `prompt: string` - Input prompt
- `config?: LLMConfig` - Optional configuration override

**Returns:** `Promise<LLMResponse>`

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const response = await aiService.processMessage(message, sessionId);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error.code === 'AUTHENTICATION_ERROR') {
    // Handle auth issues
    console.log('Invalid API key');
  } else {
    // Handle other errors
    console.log('Error:', error.message);
  }
}
```

### Error Codes

- `INVALID_INPUT` - Invalid or empty input
- `RATE_LIMIT_EXCEEDED` - API rate limit reached
- `AUTHENTICATION_ERROR` - Invalid API credentials
- `SAFETY_VIOLATION` - Content blocked by safety filters
- `NETWORK_ERROR` - Network connectivity issues
- `UNKNOWN_ERROR` - Unexpected errors

## Testing

Run the test suite:

```bash
# Run all LLM service tests
npm run test:run -- src/services/llm

# Run specific test files
npm run test:run -- src/services/llm/__tests__/aiService.test.ts
npm run test:run -- src/services/llm/__tests__/geminiProvider.test.ts
npm run test:run -- src/services/llm/__tests__/systemPrompts.test.ts
npm run test:run -- src/services/llm/__tests__/integration.test.ts
```

## Examples

See `examples/usage.ts` for comprehensive usage examples including:

- Basic message processing
- Custom configuration
- Emergency detection
- Error handling
- Configuration updates

## Performance Considerations

### Token Usage

- **Input tokens** - Charged for prompt + conversation history
- **Output tokens** - Charged for AI response
- **Context window** - Gemini Flash supports up to 1M tokens

### Optimization Tips

1. **Use appropriate temperature** - Lower for consistent responses, higher for creativity
2. **Limit max tokens** - Set reasonable limits to control costs
3. **Enable caching** - Cache common responses when possible
4. **Monitor usage** - Track token consumption and costs

### Rate Limits

- **Gemini Flash** - 15 RPM (requests per minute) for free tier
- **Gemini Pro** - 2 RPM for free tier
- **Production** - Consider paid tiers for higher limits

## Security

### API Key Management

- Store API keys in environment variables
- Never commit API keys to version control
- Use different keys for development/production
- Rotate keys regularly

### Content Safety

- All responses are filtered through safety checks
- Medical content includes appropriate disclaimers
- Emergency situations trigger immediate response protocols
- PII is automatically scrubbed from inputs

## Monitoring

The service provides comprehensive analytics:

```typescript
interface AnalyticsData {
  sessionId: string;
  timestamp: Date;
  topic: TopicCategory;
  safetyFlags: string[];
  responseLength: number;
  processingTime: number;
  tokenUsage: TokenUsage;
}
```

## Contributing

When adding new features:

1. **Add tests** - Maintain test coverage above 90%
2. **Update documentation** - Keep README and code comments current
3. **Follow patterns** - Use existing error handling and safety patterns
4. **Test safety** - Verify safety features work with new functionality

## License

This module is part of the Jirung Senior Advisor project and follows the same licensing terms.