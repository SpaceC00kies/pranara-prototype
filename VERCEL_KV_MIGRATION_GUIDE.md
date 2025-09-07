# Vercel KV Migration Guide

## 🚨 **Urgent: Vercel KV Discontinuation**

Vercel KV has been discontinued and is no longer available for new projects. This guide provides migration options for the Jirung Senior Advisor project.

## 📊 **Current Usage Analysis**

The Jirung Senior Advisor project currently uses Vercel KV for:
- **Analytics logging**: Storing user interactions and conversation topics
- **Session management**: Tracking user sessions and conversation flow
- **Usage statistics**: Aggregating data for admin dashboard
- **Topic classification**: Storing conversation patterns

## 🎯 **Recommended Migration: Neon Postgres**

### **Why Neon Postgres?**
- ✅ **Serverless**: Auto-scaling, pay-per-use
- ✅ **Healthcare-ready**: SOC 2 compliant, HIPAA-eligible
- ✅ **Global edge**: Ultra-low latency worldwide
- ✅ **SQL power**: Complex analytics queries
- ✅ **Free tier**: 0.5GB storage, 1 compute unit
- ✅ **Easy setup**: One-click integration with Vercel

### **Migration Steps**

#### **1. Create Neon Database**
1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up/login with GitHub
3. Create new project: "jirung-senior-advisor"
4. Select region closest to your users (Asia-Pacific recommended)
5. Copy the connection string

#### **2. Update Environment Variables**
Replace KV variables with Postgres:

```bash
# Remove these KV variables:
# KV_URL=
# KV_REST_API_URL=
# KV_REST_API_TOKEN=
# KV_REST_API_READ_ONLY_TOKEN=

# Add Neon Postgres:
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
POSTGRES_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

#### **3. Initialize Database Schema**
The existing code will automatically create the required tables:

```sql
CREATE TABLE IF NOT EXISTS question_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  text_snippet VARCHAR(160) NOT NULL,
  topic VARCHAR(50) NOT NULL,
  language VARCHAR(2) NOT NULL,
  line_clicked BOOLEAN DEFAULT FALSE,
  routed VARCHAR(20) DEFAULT 'primary'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timestamp ON question_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_topic ON question_logs(topic);
CREATE INDEX IF NOT EXISTS idx_session_id ON question_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_language ON question_logs(language);
```

#### **4. Deploy and Test**
1. Deploy to Vercel with new environment variables
2. Test analytics logging functionality
3. Verify admin dashboard statistics
4. Monitor performance and costs

## 🔄 **Alternative Options**

### **Option 2: Supabase (Real-time Features)**
- **Best for**: Future family monitoring features
- **Pros**: Real-time subscriptions, built-in auth, REST API
- **Cons**: More complex setup, higher learning curve

```bash
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### **Option 3: Upstash Redis (Session-focused)**
- **Best for**: High-performance session management
- **Pros**: Redis compatibility, edge locations
- **Cons**: Limited analytics capabilities

```bash
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXXXAAIncDEyNzYwYjYtOWE2..."
```

### **Option 4: Turso SQLite (Edge Computing)**
- **Best for**: Global edge deployment
- **Pros**: SQLite compatibility, ultra-fast reads
- **Cons**: Newer platform, limited ecosystem

```bash
TURSO_DATABASE_URL="libsql://xxx.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

## 📋 **Migration Checklist**

### **Pre-Migration**
- [ ] Backup existing KV data (if any)
- [ ] Review current analytics requirements
- [ ] Choose migration option (Neon recommended)
- [ ] Set up new database account

### **Migration**
- [ ] Create new database instance
- [ ] Update environment variables
- [ ] Test database connection locally
- [ ] Deploy to staging environment
- [ ] Verify all functionality works
- [ ] Update documentation

### **Post-Migration**
- [ ] Monitor performance metrics
- [ ] Verify analytics data collection
- [ ] Test admin dashboard functionality
- [ ] Update deployment scripts
- [ ] Document new database setup

## 🚀 **Quick Start: Neon Migration**

### **1. One-Click Setup**
```bash
# Install Neon CLI (optional)
npm install -g @neondatabase/cli

# Create project
neon projects create jirung-senior-advisor --region aws-ap-southeast-1
```

### **2. Update .env.local**
```bash
# Replace KV with Neon
DATABASE_URL="postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

### **3. Deploy**
```bash
# Deploy to Vercel
vercel --prod
```

## 🔍 **Performance Comparison**

| Feature | Vercel KV | Neon Postgres | Supabase | Upstash Redis |
|---------|-----------|---------------|----------|---------------|
| **Latency** | ~50ms | ~30ms | ~40ms | ~20ms |
| **Scaling** | Auto | Auto | Auto | Auto |
| **Analytics** | Limited | Excellent | Good | Limited |
| **Cost (Free)** | N/A | 0.5GB | 500MB | 10K requests |
| **Healthcare** | ❌ | ✅ SOC 2 | ✅ SOC 2 | ✅ SOC 2 |

## 💰 **Cost Estimation**

### **Neon Postgres (Recommended)**
- **Free tier**: 0.5GB storage, 1 compute unit
- **Pro tier**: $19/month for 10GB storage
- **Estimated cost**: $0-5/month for MVP

### **Expected Usage**
- **Analytics logs**: ~1MB/day (365MB/year)
- **Sessions**: ~100KB/day (36MB/year)
- **Total**: ~400MB/year (fits in free tier)

## 🛠 **Code Changes Required**

The existing codebase already supports Postgres! No code changes needed:

```typescript
// src/services/databaseService.ts already supports both KV and Postgres
export function createDatabaseService(): DatabaseService {
  const kvUrl = process.env.KV_URL;
  const postgresUrl = process.env.DATABASE_URL;

  if (postgresUrl) {
    return new DatabaseService({
      type: 'postgres',
      postgresUrl
    });
  }
  // ... fallback logic
}
```

## 📞 **Support & Resources**

- **Neon Documentation**: https://neon.tech/docs
- **Vercel Integration**: https://vercel.com/integrations/neon
- **Migration Support**: https://neon.tech/docs/import/migrate-from-vercel-kv
- **Healthcare Compliance**: https://neon.tech/security

## 🎯 **Next Steps**

1. **Immediate**: Set up Neon Postgres account
2. **This week**: Complete migration and testing
3. **Next sprint**: Optimize queries for better analytics
4. **Future**: Consider real-time features with Supabase

---

**⚠️ Action Required**: Vercel KV is discontinued. Please migrate within 30 days to avoid service interruption.