# Services Directory

This directory contains service modules for external integrations and business logic.

## Implemented Services

- `llm/` - LLM provider abstractions and AI service implementations
- `sessionService.ts` - Session ID generation, validation, and lifecycle management
- `analyticsService.ts` - PII-safe analytics collection, topic classification, and conversation flow tracking
- `databaseService.ts` - Database abstraction layer supporting both Vercel KV and Postgres
- `__tests__/` - Unit tests for all service modules

## Key Features

### Session Management
- Cryptographically secure session ID generation
- Session timeout and activity tracking
- Language detection and session metrics
- Privacy-safe session hashing for analytics

### Analytics Service
- Topic classification using keyword matching for Thai and English
- PII scrubbing before data storage
- Conversation flow analysis and pattern detection
- Usage statistics and topic analytics calculation

### Database Service
- Unified interface for both Vercel KV and Postgres
- Automatic schema initialization for Postgres
- Analytics event storage and retrieval with filtering
- Health monitoring and connection management

## Usage

```typescript
import { 
  createSession, 
  generateSessionId,
  classifyTopic,
  createAnalyticsEvent,
  getDatabase 
} from '../services';

// Create a new session
const session = createSession('th');

// Classify message topic
const classification = classifyTopic('คุณยายนอนไม่หลับ');

// Store analytics event
const db = await getDatabase();
const event = createAnalyticsEvent(
  session.id, 
  'user message', 
  classification.topic, 
  'th'
);
await db.storeAnalyticsEvent(event);
```

## Service Guidelines

- Use TypeScript for type safety
- Implement proper error handling and retry logic
- Include comprehensive logging for debugging
- Follow async/await patterns for API calls
- Implement proper rate limiting and caching where appropriate