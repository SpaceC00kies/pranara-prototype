# Jirung Senior Advisor

An AI-powered web application that provides Thai families with immediate, practical guidance for elder care questions. This MVP serves as a bridge between families and Jirung's human care services, offering empathetic, culturally-appropriate advice while collecting valuable insights about user needs.

## 🌟 Features

- 🤖 **AI-Powered Chat**: Gemini Flash API with Thai language support
- 🏥 **Safe Guidance**: Non-medical advice focused on practical home care
- 📱 **Mobile-First**: Responsive design optimized for Thai mobile users
- 🔒 **Privacy-Focused**: PII scrubbing and minimal data collection
- 📊 **Smart Analytics**: Topic classification and conversation flow tracking
- 💬 **Human Handoff**: Seamless LINE integration for complex cases
- ♿ **Accessible**: WCAG 2.1 AA compliance with screen reader support
- 🎨 **HAJOBJA Design**: Health-focused aesthetic with calming colors

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with HAJOBJA design system tokens
- **AI**: Google Gemini Flash API with safety settings
- **Database**: Vercel KV (primary) or Vercel Postgres (alternative)
- **Deployment**: Vercel with edge functions
- **Testing**: Vitest with React Testing Library
- **Fonts**: Prompt & Sarabun (Thai-optimized)
- **Monitoring**: Custom health checks and Vercel Analytics

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** or **yarn** package manager
- **Google Gemini API key** ([Get one here](https://aistudio.google.com/))
- **LINE Official Account** ([Create here](https://www.linebiz.com/))
- **Vercel account** (for deployment)

### Local Development Setup

1. **Clone and install**:
```bash
git clone <repository-url>
cd jirung-senior-advisor
npm install
```

2. **Environment configuration**:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:
```bash
# Required for basic functionality
GEMINI_API_KEY=your_gemini_api_key_here
LINE_URL=https://line.me/ti/p/your_line_id
NEXT_PUBLIC_LINE_URL=https://line.me/ti/p/your_line_id
SESSION_SECRET=your_secure_random_string_32_chars_minimum

# Database (choose one)
KV_URL=your_vercel_kv_url  # Recommended for MVP
# OR configure Postgres variables (see .env.example)
```

3. **Start development server**:
```bash
npm run dev
```

4. **Open application**:
Visit [http://localhost:3000](http://localhost:3000)

### Production Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Quick deploy to Vercel**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add GEMINI_API_KEY
vercel env add LINE_URL
# ... add other variables

# Deploy to production
vercel --prod
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for AI responses |
| `LINE_URL` | ✅ | LINE Official Account URL for human handoff |
| `NEXT_PUBLIC_LINE_URL` | ✅ | Public LINE URL (same as above) |
| `SESSION_SECRET` | ✅ | Secure random string for session encryption |
| `KV_URL` | ⚠️ | Vercel KV database URL (or use Postgres) |
| `KV_REST_API_URL` | ⚠️ | Vercel KV REST API URL |
| `KV_REST_API_TOKEN` | ⚠️ | Vercel KV REST API token |
| `POSTGRES_URL` | ⚠️ | Postgres connection URL (alternative to KV) |
| `NODE_ENV` | ⚠️ | Environment (development/production) |
| `ANALYTICS_ENABLED` | ❌ | Enable/disable analytics (default: true) |
| `ADMIN_PASSWORD` | ❌ | Admin dashboard password (if implemented) |

⚠️ = Required (choose either KV or Postgres)  
❌ = Optional

### Database Setup

**Option 1: Vercel KV (Recommended)**
- Simple key-value store
- Perfect for MVP analytics
- Easy Vercel integration

**Option 2: Vercel Postgres**
- Full SQL database
- Better for complex queries
- Scalable for future features

## Project Structure

```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/            # API endpoints
│   │   ├── chat/       # Chat API
│   │   ├── health/     # Health check
│   │   └── admin/      # Admin endpoints
│   ├── globals.css     # Global styles with design tokens
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── chat/          # Chat interface components
│   ├── layout/        # Layout components
│   └── ui/            # Reusable UI components
├── services/          # External service integrations
├── utils/             # Utility functions
└── types/             # TypeScript type definitions
```

## Development Guidelines

### Code Style
- Use TypeScript for all files
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

### Component Guidelines
- Use functional components with hooks
- Implement proper error boundaries
- Ensure accessibility compliance
- Support Thai language input/display
- Use Tailwind CSS with design tokens

### API Guidelines
- Implement proper error handling
- Use TypeScript for request/response types
- Include rate limiting and validation
- Log analytics events appropriately

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test

# Run tests once (CI/CD)
npm run test:run

# Run tests with UI
npm run test:ui
```

### Test Coverage

The project includes comprehensive tests for:
- ✅ React components (chat interface, error boundaries)
- ✅ API routes (chat, health check, LINE integration)
- ✅ Services (AI, analytics, PII scrubbing)
- ✅ Utilities (content safety, text sanitization)
- ✅ Integration tests (end-to-end API flows)

### Deployment Readiness Check

Before deploying, run the production readiness check:

```bash
# Check deployment readiness
npm run deploy:check

# Test production functionality
npm run deploy:test

# Verify deployment (after deploying)
npm run deploy:verify

# Full verification with comprehensive tests
npm run deploy:verify:full
```

**Deployment Check** validates:
- Environment variables configuration
- Project structure integrity
- Package dependencies
- Build process success
- API connectivity
- Security configuration

**Production Test** validates:
- API endpoint functionality
- Response times and performance
- Error handling
- Security headers
- SSL certificate (if HTTPS)
- Rate limiting

## 📚 API Documentation

### Chat API (`POST /api/chat`)

**Request:**
```json
{
  "message": "สวัสดีครับ ผมต้องการคำแนะนำเรื่องการดูแลผู้สูงอายุ",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "สวัสดีครับ ยินดีให้คำแนะนำเรื่องการดูแลผู้สูงอายุ...",
  "topic": "general",
  "showLineOption": false,
  "sessionId": "generated-session-id"
}
```

### Health Check (`GET /api/health`)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "gemini": true,
    "database": true
  }
}
```

### LINE Click Tracking (`POST /api/chat/line-click`)

**Request:**
```json
{
  "sessionId": "session-id",
  "context": "emergency"
}
```

## 🚀 Deployment

### Quick Deploy

```bash
# Using Vercel CLI (recommended)
vercel --prod

# Or connect GitHub repository to Vercel dashboard
```

### Comprehensive Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Step-by-step deployment instructions
- Environment variable setup
- Domain configuration
- Monitoring and maintenance
- Troubleshooting guide
- Security considerations
- Cost optimization tips

### Production Checklist

- [ ] Environment variables configured
- [ ] Database connected and tested
- [ ] Gemini API key valid and funded
- [ ] LINE integration working
- [ ] Health check endpoint responding
- [ ] Analytics logging properly
- [ ] PII scrubbing verified
- [ ] Performance metrics acceptable
- [ ] Security headers configured
- [ ] Error monitoring setup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is proprietary to Jirung Health Village.

## Support

For technical support or questions, contact the development team.