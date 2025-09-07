# API Documentation - Jirung Senior Advisor

This document provides comprehensive documentation for all API endpoints in the Jirung Senior Advisor application.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

## Authentication

Currently, the application does not require authentication for chat functionality. Admin endpoints (if implemented) may require password authentication.

## Rate Limiting

- **Chat API**: 60 requests per minute per IP
- **Health Check**: 120 requests per minute per IP
- **LINE Click**: 30 requests per minute per IP

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (AI service down)

---

## Chat API

### POST /api/chat

Processes user messages and returns AI-generated responses with safety filtering and topic classification.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "message": "string (required, 1-1000 characters)",
  "sessionId": "string (optional, UUID format)"
}
```

**Example:**
```json
{
  "message": "สวัสดีครับ ผมต้องการคำแนะนำเรื่องการดูแลผู้สูงอายุที่มีโรคอัลไซเมอร์",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response

**Success (200):**
```json
{
  "response": "string (AI-generated response)",
  "topic": "string (classified topic)",
  "showLineOption": "boolean (whether to show LINE handoff)",
  "sessionId": "string (session identifier)"
}
```

**Example:**
```json
{
  "response": "สวัสดีครับ การดูแลผู้ป่วยอัลไซเมอร์ต้องใช้ความอดทนและความเข้าใจ นี่คือคำแนะนำเบื้องต้น:\n\n1. สร้างกิจวัตรประจำวันที่ชัดเจน\n2. ใช้ป้ายชื่อติดของใช้ต่างๆ\n3. พูดช้าๆ ใช้ประโยคสั้น\n4. หลีกเลี่ยงการเปลี่ยนแปลงสิ่งแวดล้อมบ่อย\n\nหากมีอาการรุนแรงหรือพฤติกรรมก้าวร้าว ควรปรึกษาแพทย์ทันที",
  "topic": "alzheimer",
  "showLineOption": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Topic Classifications

The API classifies messages into these topics:

| Topic | Description | Thai Examples |
|-------|-------------|---------------|
| `alzheimer` | Alzheimer's and dementia care | อัลไซเมอร์, สมองเสื่อม, ความจำ |
| `fall` | Fall prevention and safety | ล้ม, ลื่น, ความปลอดภัย |
| `sleep` | Sleep issues and routines | นอน, นอนไม่หลับ, ตื่นกลางคืน |
| `diet` | Nutrition and eating | อาหาร, กิน, โภชนาการ |
| `night_care` | Nighttime care challenges | ดูแลกลางคืน, ตื่นบ่อย |
| `post_op` | Post-operative care | หลังผ่าตัด, แผล, ฟื้นตัว |
| `diabetes` | Diabetes management | เบาหวาน, น้ำตาล, อินซูลิน |
| `mood` | Emotional and behavioral issues | อารมณ์, เศร้า, โกรธ |
| `medication` | Medication management | ยา, กินยา, ลืมยา |
| `emergency` | Emergency situations | ฉุกเฉิน, เจ็บหน้าอก, หายใจไม่ออก |
| `general` | General elder care questions | ทั่วไป, ดูแล, ช่วยเหลือ |

#### Error Responses

**Bad Request (400):**
```json
{
  "error": "Message is required and must be between 1-1000 characters",
  "code": "INVALID_MESSAGE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Rate Limited (429):**
```json
{
  "error": "Too many requests. Please wait before sending another message.",
  "code": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Service Unavailable (503):**
```json
{
  "error": "AI service is temporarily unavailable. Please try again later.",
  "code": "AI_SERVICE_UNAVAILABLE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Health Check API

### GET /api/health

Returns the current health status of the application and its dependencies.

#### Request

No parameters required.

#### Response

**Healthy (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "gemini": true,
    "database": true
  },
  "version": "0.1.0",
  "uptime": 3600
}
```

**Degraded (200):**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "gemini": false,
    "database": true
  },
  "version": "0.1.0",
  "uptime": 3600,
  "issues": ["Gemini API connectivity issues"]
}
```

**Unhealthy (503):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "gemini": false,
    "database": false
  },
  "version": "0.1.0",
  "uptime": 3600,
  "issues": ["Database connection failed", "Gemini API unavailable"]
}
```

#### Status Definitions

- **healthy**: All services operational
- **degraded**: Some services have issues but core functionality works
- **unhealthy**: Critical services are down

---

## LINE Integration API

### POST /api/chat/line-click

Tracks when users click the LINE handoff button for analytics purposes.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "sessionId": "string (required, UUID format)",
  "context": "string (optional, conversation context)"
}
```

**Example:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "context": "emergency_situation"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "lineUrl": "https://line.me/ti/p/your_line_id"
}
```

**Error (400):**
```json
{
  "error": "Session ID is required",
  "code": "MISSING_SESSION_ID",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Admin API (Optional)

### GET /api/admin/stats

Returns usage statistics and analytics data. Requires admin authentication.

#### Request

**Headers:**
```
Authorization: Bearer admin_password
```

**Query Parameters:**
- `period` (optional): `day`, `week`, `month` (default: `week`)
- `limit` (optional): Number of results (default: 10, max: 100)

#### Response

**Success (200):**
```json
{
  "period": "week",
  "totalMessages": 1250,
  "uniqueSessions": 340,
  "topTopics": [
    {
      "topic": "alzheimer",
      "count": 180,
      "percentage": 14.4
    },
    {
      "topic": "sleep",
      "count": 165,
      "percentage": 13.2
    }
  ],
  "lineClickRate": 0.23,
  "averageSessionLength": 4.2,
  "languageDistribution": {
    "th": 0.95,
    "en": 0.05
  }
}
```

**Unauthorized (401):**
```json
{
  "error": "Admin authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Data Models

### Chat Message

```typescript
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  topic?: string;
  sessionId: string;
}
```

### Analytics Event

```typescript
interface AnalyticsEvent {
  sessionId: string;
  timestamp: Date;
  textSnippet: string; // First 160 characters, PII-scrubbed
  topic: string;
  language: 'th' | 'en';
  lineClicked: boolean;
  responseTime?: number;
}
```

### Health Status

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    gemini: boolean;
    database: boolean;
  };
  version: string;
  uptime: number;
  issues?: string[];
}
```

---

## Integration Patterns

### Frontend Integration

**React Hook Example:**
```typescript
import { useState } from 'react';

interface ChatResponse {
  response: string;
  topic: string;
  showLineOption: boolean;
  sessionId: string;
}

export function useChat() {
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async (message: string, sessionId?: string): Promise<ChatResponse> => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } finally {
      setLoading(false);
    }
  };
  
  return { sendMessage, loading };
}
```

### Error Handling Pattern

```typescript
try {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Handle specific error codes
    switch (data.code) {
      case 'RATE_LIMIT_EXCEEDED':
        showRateLimitMessage();
        break;
      case 'AI_SERVICE_UNAVAILABLE':
        showFallbackResponse();
        break;
      default:
        showGenericError();
    }
    return;
  }
  
  // Handle successful response
  displayMessage(data.response);
  
} catch (error) {
  // Handle network errors
  showNetworkError();
}
```

### Monitoring Integration

```typescript
// Health check monitoring
const checkHealth = async () => {
  try {
    const response = await fetch('/api/health');
    const health = await response.json();
    
    if (health.status !== 'healthy') {
      console.warn('Service degraded:', health.issues);
      // Alert monitoring system
    }
  } catch (error) {
    console.error('Health check failed:', error);
    // Alert monitoring system
  }
};

// Check every 5 minutes
setInterval(checkHealth, 5 * 60 * 1000);
```

---

## Security Considerations

### Input Validation

- All text inputs are sanitized and validated
- Maximum message length: 1000 characters
- Session IDs must be valid UUIDs
- Rate limiting prevents abuse

### PII Protection

- Email addresses → `[EMAIL]`
- Phone numbers → `[PHONE]`
- Thai ID numbers → `[ID]`
- URLs → `[URL]`
- LINE IDs → `[LINE_ID]`

### Content Safety

- Medical advice filtering
- Emergency keyword detection
- Inappropriate content blocking
- Gemini safety settings enabled

### API Security

- CORS configured for specific origins
- Security headers implemented
- Environment variables encrypted
- No sensitive data in logs

---

## Performance Considerations

### Response Times

- Chat API: < 3 seconds (95th percentile)
- Health Check: < 100ms
- LINE Click: < 200ms

### Caching Strategy

- Static assets cached at CDN
- API responses not cached (real-time)
- Health check cached for 30 seconds

### Rate Limiting

Implemented to prevent abuse and manage costs:
- Per-IP rate limiting
- Exponential backoff on errors
- Graceful degradation

---

## Changelog

### v0.1.0 (Current)

- Initial API implementation
- Chat functionality with Gemini integration
- Health monitoring
- LINE integration tracking
- Basic analytics logging
- PII scrubbing and content safety

### Future Versions

- Admin dashboard API
- Advanced analytics endpoints
- User authentication (optional)
- Conversation history API
- Multi-language support expansion