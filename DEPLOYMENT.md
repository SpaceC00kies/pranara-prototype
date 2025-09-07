# Deployment Guide - Jirung Senior Advisor

This guide provides step-by-step instructions for deploying the Jirung Senior Advisor application to production.

## Prerequisites

Before deploying, ensure you have:

- ✅ Vercel account with appropriate permissions
- ✅ Google Cloud account with Gemini API access
- ✅ LINE Official Account or LINE@ account
- ✅ Database service (Vercel KV or Postgres)
- ✅ Domain name (optional, for custom domain)

## Pre-Deployment Checklist

Run the deployment readiness check:

```bash
node scripts/deployment-check.js
```

This script validates:
- Environment variable configuration
- Project structure integrity
- Package dependencies
- Build process
- API connectivity
- Security configuration

## Environment Setup

### 1. Google Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the API key (starts with `AIza...`)
4. Set usage limits and billing alerts

### 2. LINE Integration Setup

1. Create a LINE Official Account at [LINE Business](https://www.linebiz.com/)
2. Get your LINE URL (format: `https://line.me/ti/p/your_line_id`)
3. Configure auto-reply messages if needed

### 3. Database Setup

#### Option A: Vercel KV (Recommended for MVP)

1. In your Vercel dashboard, go to Storage
2. Create a new KV database
3. Copy the connection details:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

#### Option B: Vercel Postgres

1. In your Vercel dashboard, go to Storage
2. Create a new Postgres database
3. Copy the connection details:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NO_SSL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy to staging:
```bash
vercel
```

4. Set environment variables:
```bash
vercel env add GEMINI_API_KEY
vercel env add LINE_URL
vercel env add NEXT_PUBLIC_LINE_URL
# Add other environment variables...
```

5. Deploy to production:
```bash
vercel --prod
```

### Method 2: GitHub Integration

1. Push your code to GitHub
2. Connect repository to Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure build settings (auto-detected for Next.js)

3. Set environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all required variables from `.env.example`
   - Set appropriate environments (Production, Preview, Development)

4. Deploy:
   - Push to `main` branch for production
   - Push to other branches for preview deployments

### Method 3: Manual Deployment

1. Build the project locally:
```bash
npm run build
```

2. Test the build:
```bash
npm start
```

3. Upload to your hosting provider or use Vercel CLI

## Environment Variables Configuration

### Production Environment Variables

Copy from `.env.example` and set these in your Vercel dashboard:

```bash
# Required Variables
GEMINI_API_KEY=your_actual_gemini_api_key
LINE_URL=https://line.me/ti/p/your_actual_line_id
NEXT_PUBLIC_LINE_URL=https://line.me/ti/p/your_actual_line_id
SESSION_SECRET=your_secure_random_string_32_chars_min

# Database (choose one option)
# Vercel KV
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_vercel_kv_rest_api_url
KV_REST_API_TOKEN=your_vercel_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_rest_api_read_only_token

# OR Vercel Postgres
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url
POSTGRES_URL_NO_SSL=your_postgres_url_no_ssl
POSTGRES_URL_NON_POOLING=your_postgres_url_non_pooling
POSTGRES_USER=your_postgres_user
POSTGRES_HOST=your_postgres_host
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=your_postgres_database

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
ANALYTICS_ENABLED=true

# Optional Admin Configuration
ADMIN_PASSWORD=your_secure_admin_password
```

### Environment Variable Security

- ✅ Use Vercel's encrypted environment variables
- ✅ Never commit `.env` files to version control
- ✅ Use different values for development/staging/production
- ✅ Rotate API keys regularly
- ✅ Set up monitoring for API usage

## Domain Configuration

### Custom Domain Setup

1. In Vercel dashboard, go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### SSL Certificate

- Vercel automatically provides SSL certificates
- Certificates auto-renew
- HTTPS is enforced by default

## Post-Deployment Verification

### 1. Health Check

Visit your deployment URL + `/health`:
```
https://your-app.vercel.app/health
```

Expected response:
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

### 2. Chat Functionality Test

1. Visit the main application URL
2. Send a test message in Thai: "สวัสดีครับ"
3. Verify AI response is received
4. Test LINE button functionality

### 3. Analytics Verification

Check that analytics are being logged:
- Monitor database for new entries
- Verify PII scrubbing is working
- Check session tracking

### 4. Performance Testing

Use tools like:
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)

Target metrics:
- Performance Score: > 90
- Accessibility Score: > 95
- Best Practices Score: > 90
- SEO Score: > 90

## Monitoring and Maintenance

### 1. Vercel Analytics

Enable Vercel Analytics for:
- Page views and user sessions
- Performance metrics
- Error tracking
- Geographic distribution

### 2. Error Monitoring

Monitor these endpoints:
- `/api/health` - System health
- Application logs in Vercel dashboard
- Database connection status
- Gemini API usage and errors

### 3. Regular Maintenance

**Weekly:**
- Check error logs
- Monitor API usage and costs
- Review analytics data

**Monthly:**
- Update dependencies
- Review security settings
- Backup database (if applicable)
- Performance optimization

**Quarterly:**
- Rotate API keys
- Security audit
- Dependency security scan
- Performance review

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Check for TypeScript errors
npm run build

# Check for linting issues
npm run lint

# Clear Next.js cache
rm -rf .next
npm run build
```

#### Environment Variable Issues

```bash
# Verify environment variables are set
vercel env ls

# Pull environment variables locally for testing
vercel env pull .env.local
```

#### API Connection Issues

1. Verify Gemini API key is valid
2. Check API quotas and billing
3. Test LINE URL accessibility
4. Verify database connection strings

#### Performance Issues

1. Check Vercel function logs
2. Monitor database query performance
3. Review Gemini API response times
4. Optimize images and assets

### Getting Help

1. Check Vercel documentation
2. Review application logs
3. Test locally with production environment variables
4. Contact development team

## Rollback Procedure

If issues occur after deployment:

### Immediate Rollback

1. In Vercel dashboard, go to Deployments
2. Find the last working deployment
3. Click "Promote to Production"

### Environment Variable Rollback

1. Go to Project Settings → Environment Variables
2. Revert to previous values
3. Redeploy the application

### Code Rollback

```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main

# Or reset to previous commit (destructive)
git reset --hard <commit-hash>
git push --force origin main
```

## Security Considerations

### Production Security Checklist

- ✅ HTTPS enforced (automatic with Vercel)
- ✅ Security headers configured (see `vercel.json`)
- ✅ Environment variables encrypted
- ✅ PII scrubbing implemented
- ✅ Rate limiting configured
- ✅ Input validation implemented
- ✅ Error messages don't expose sensitive data
- ✅ Admin endpoints protected (if implemented)

### Ongoing Security

- Monitor for dependency vulnerabilities
- Regular security audits
- Keep dependencies updated
- Monitor API usage for anomalies
- Review access logs regularly

## Cost Optimization

### Vercel Costs

- Monitor function execution time
- Optimize API response times
- Use appropriate regions (sin1 for Thailand)
- Monitor bandwidth usage

### Gemini API Costs

- Set usage quotas
- Monitor token consumption
- Optimize prompt length
- Implement response caching if needed

### Database Costs

- Monitor storage usage
- Implement data retention policies
- Optimize query performance
- Regular cleanup of old analytics data

---

## Quick Reference

### Essential Commands

```bash
# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Set environment variable
vercel env add VARIABLE_NAME

# Run deployment check
node scripts/deployment-check.js
```

### Important URLs

- Production: `https://your-app.vercel.app`
- Health Check: `https://your-app.vercel.app/health`
- Vercel Dashboard: `https://vercel.com/dashboard`
- Google AI Studio: `https://aistudio.google.com/`

### Support Contacts

- Technical Issues: Development Team
- Vercel Support: [Vercel Help](https://vercel.com/help)
- Google AI Support: [Google Cloud Support](https://cloud.google.com/support)