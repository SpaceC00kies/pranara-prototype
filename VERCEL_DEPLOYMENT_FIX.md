# Vercel Deployment Fix & KV Migration Guide

## 🚨 **CRITICAL: Vercel KV Discontinued**

**Vercel KV has been discontinued** and is no longer available. You must migrate to a new database provider to maintain functionality.

## Issues & Solutions

### 1. Chat Functionality Fails
**Issue**: Environment variables not properly configured in Vercel
**Solution**: Set up environment variables and migrate database

### 2. Database Migration Required
**Issue**: Vercel KV discontinued, analytics and sessions will fail
**Solution**: Migrate to Neon Postgres (recommended) or alternative

## Quick Fix Steps

### 1. Set Environment Variables in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables and add:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
LINE_URL=https://line.me/ti/p/your_line_id
NEXT_PUBLIC_LINE_URL=https://line.me/ti/p/your_line_id
SESSION_SECRET=your_secure_random_string_32_chars_minimum
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
ANALYTICS_ENABLED=true
```

### 2. Set Up New Database (REQUIRED)

**🎯 RECOMMENDED: Neon Postgres**

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up with GitHub
3. Create project: "jirung-senior-advisor"
4. Copy connection string
5. Add to Vercel environment variables:
   ```
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

**Alternative Options:**

**Option A: Supabase**
1. Go to [Supabase](https://supabase.com/)
2. Create project
3. Get connection string from Settings → Database
4. Add to Vercel:
   ```
   DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
   ```

**Option B: Upstash Redis**
1. In Vercel dashboard → Storage → Click "Create" next to **Upstash**
2. Add the generated environment variables:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXXXAAIncDEyNzYwYjYtOWE2...
   ```

**Option C: Skip Database (Temporary)**
- Chat will work without database
- Analytics won't be stored
- Not recommended for production

### 3. Run Migration (If Using Postgres)

If you chose Neon or Supabase, run the migration script locally:
```bash
npm run db:migrate
```

This will initialize the database schema automatically.

### 4. Redeploy

After adding all environment variables:
1. Go to Deployments tab in Vercel
2. Click "Redeploy" on the latest deployment
3. Or push a new commit to trigger automatic deployment

### 5. Test

Visit your live app and try chatting. Both chat and analytics should work.

## Database Comparison

| Provider | Setup Time | Free Tier | Best For |
|----------|------------|-----------|----------|
| **Neon** | 2 minutes | 0.5GB | Healthcare apps (SOC 2) |
| **Supabase** | 3 minutes | 500MB | Real-time features |
| **Upstash** | 1 minute | 10K requests | High performance |

## Migration Timeline

- **Immediate**: Set up new database (choose Neon for best results)
- **This week**: Complete migration and testing
- **Next week**: Monitor performance and optimize

## Important Notes

- **🚨 KV Migration Required**: Vercel KV is discontinued, migration is mandatory
- **Never commit API keys to git** - they should only be in Vercel's environment variables
- **Use your actual URLs**: Update `NEXT_PUBLIC_APP_URL` to your Vercel app URL
- **Secure secrets**: Generate a strong `SESSION_SECRET` (32+ characters)
- **Healthcare compliance**: Neon and Supabase are SOC 2 compliant

## Verification

After deployment, test both chat and database:

**Test Chat API:**
```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "สวัสดี", "sessionId": "test-123"}'
```

**Test Health Check:**
```bash
curl https://your-app.vercel.app/api/health
```

Both should return proper JSON responses.

## Need Help?

- **Migration Guide**: See `VERCEL_KV_MIGRATION_GUIDE.md` for detailed instructions
- **Database Setup**: Each provider has excellent documentation
- **Vercel Support**: https://vercel.com/support
- **Emergency**: Deploy without database temporarily, migrate ASAP

---

**⚠️ Action Required**: Complete database migration within 30 days to avoid service interruption.