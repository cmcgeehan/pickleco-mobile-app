# Development Workflow & Deployment

This document covers the full development workflow from local development to production deployment.

## Quick Reference

| Environment | Vercel Project | URL | Stripe | DUPR |
|-------------|---------------|-----|--------|------|
| Local | - | localhost:3000 | Test | Test |
| Staging | pickleco-staging | staging.thepickleco.mx | Test | Test |
| Production | thepickleco | www.thepickleco.mx | **Live** | Test* |

*DUPR doesn't have production API keys yet

---

## Development Steps

### 1. Local Development

```bash
# Start local dev server
cd apps/web
npm run dev
```

**Environment:**
- Uses `.env.local` which points to **staging** Supabase
- Stripe in **test** mode
- DUPR in **test** mode

**Before starting work:**
1. Make sure you're on the latest `main` branch
2. Check that local env vars are correct (test keys)
3. Run `npm run dev` and verify the app starts

### 2. Deploy to Staging

**Prerequisites:**
- All changes tested locally
- Stripe keys set to **test** mode
- DUPR keys set to **test** mode

**Deploy command:**
```bash
cd apps/web
vercel --prod
```

This deploys to `staging.thepickleco.mx` (the `pickleco-staging` Vercel project).

**After deploying:**
1. Test the changes on staging.thepickleco.mx
2. Check Vercel logs for any errors
3. Verify with real user flows

### 3. Run Migrations (if needed)

If your changes include database migrations:

**On staging:**
1. Connect to staging Supabase dashboard
2. Run migration SQL in SQL Editor
3. Verify changes in table structure

**On production:**
1. Connect to production Supabase dashboard
2. Run the same migration SQL
3. Verify changes

**Migration files location:** `/documentation/migrations/`

### 4. Deploy to Production

**Prerequisites:**
- Changes verified on staging
- Migrations run on production database
- Stripe keys set to **live** mode

**Set Stripe to live mode:**
```bash
# In Vercel dashboard for thepickleco project, set:
NEXT_PUBLIC_USE_LIVE_STRIPE=true
```

Or via CLI:
```bash
vercel env add NEXT_PUBLIC_USE_LIVE_STRIPE production
# Enter: true
```

**Deploy command:**
```bash
cd apps/web
vercel --prod --scope cmcgeehans-projects

# When prompted, select "thepickleco" (production project)
```

**After deploying:**
1. Verify changes on www.thepickleco.mx
2. Check Vercel logs
3. Test critical user flows

### 5. Re-link to Staging

After deploying to production, re-link your local environment back to staging:

```bash
cd apps/web
vercel link
# Select "pickleco-staging" project
```

---

## Environment Variables

### Stripe Configuration

| Variable | Staging | Production |
|----------|---------|------------|
| `NEXT_PUBLIC_USE_LIVE_STRIPE` | `""` or `"false"` | `"true"` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Test webhook secret | Live webhook secret |

**How Stripe mode is determined:**
```typescript
// lib/stripe-config.ts
const useLive = process.env.NEXT_PUBLIC_USE_LIVE_STRIPE === 'true';
```

### DUPR Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `DUPR_CLIENT_ID` | Test client ID | Same for all envs currently |
| `DUPR_CLIENT_SECRET` | Test secret | Same for all envs currently |
| `NEXT_PUBLIC_DUPR_REDIRECT_URI` | Environment-specific | staging vs production URL |

### Supabase Configuration

| Variable | Staging | Production |
|----------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service key | Production service key |

---

## Database Migrations

### Creating a Migration

1. Write SQL in `/documentation/migrations/YYYYMMDD_description.sql`
2. Test on staging Supabase first
3. Document what the migration does

**Example migration file:**
```sql
-- 20251209_create_membership_event_discounts.sql
-- Creates the lookup table for membership-specific event pricing

CREATE TABLE IF NOT EXISTS membership_event_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_type_id UUID REFERENCES membership_types(id),
  event_type_id UUID REFERENCES event_types(id),
  price_mxn DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(membership_type_id, event_type_id)
);
```

### Running Migrations

**Staging:**
1. Go to Supabase Dashboard → pickleco-staging project
2. SQL Editor → New query
3. Paste and run migration SQL
4. Verify in Table Editor

**Production:**
1. Go to Supabase Dashboard → thepickleco project
2. SQL Editor → New query
3. Paste and run same migration SQL
4. Verify in Table Editor

### Rolling Back

We don't have automated rollback. If a migration causes issues:
1. Write a reverse migration SQL
2. Run it on the affected environment
3. Document what happened

---

## Git Workflow

### Branches

- `main` - Production-ready code
- Feature branches for new work (optional)

### Committing

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

**Note:** We typically deploy directly from `main` without PRs for speed. For large changes, consider creating a PR for review.

---

## Vercel Projects

**IMPORTANT: Auto-deployments are disabled for both projects.** Git pushes do NOT automatically trigger deployments. You must manually deploy using `vercel --prod` to have full control over when and where changes are deployed.

### pickleco-staging
- **URL:** staging.thepickleco.mx
- **Purpose:** Testing before production
- **Stripe:** Test mode (CRITICAL: never deploy with live keys)
- **Database:** Staging Supabase
- **Auto-deploy:** Disabled

### thepickleco
- **URL:** www.thepickleco.mx
- **Purpose:** Live production site
- **Stripe:** Live mode (CRITICAL: must switch before deploying)
- **Database:** Production Supabase
- **Auto-deploy:** Disabled

### Switching Between Projects

```bash
# Link to staging (default for development)
vercel link
# Select: pickleco-staging

# Deploy to production (one-time)
vercel --prod
# Select: thepickleco when prompted
```

---

## Checking Logs

### Vercel Logs

```bash
# Recent logs for staging
vercel logs https://staging.thepickleco.mx

# Recent logs for production
vercel logs https://www.thepickleco.mx

# Filter logs
vercel logs https://staging.thepickleco.mx 2>&1 | grep -i error
```

### Supabase Logs

1. Go to Supabase Dashboard
2. Select project (staging or production)
3. Click "Logs" in sidebar
4. Filter by type (API, Auth, Database)

---

## Common Issues

### "Wrong Vercel project"

If deploying to wrong project:
```bash
vercel link
# Select correct project
```

### "Stripe payments not working in production"

Check that `NEXT_PUBLIC_USE_LIVE_STRIPE=true` is set in production env vars.

### "Database changes not showing"

1. Verify migration was run on correct database (staging vs production)
2. Check Supabase Table Editor for schema changes
3. Regenerate types if needed: `npx supabase gen types typescript`

### "Auth not working after deploy"

1. Check Supabase Auth settings for correct redirect URLs
2. Verify cookie settings match environment
3. Check CORS settings

---

## Checklist: Deploying a Feature

- [ ] Feature tested locally
- [ ] Environment variables checked (test keys for staging)
- [ ] Deployed to staging: `vercel --prod` (pickleco-staging)
- [ ] Tested on staging.thepickleco.mx
- [ ] Migrations run on staging database (if any)
- [ ] Migrations run on production database (if any)
- [ ] Stripe env var set to live: `NEXT_PUBLIC_USE_LIVE_STRIPE=true`
- [ ] Deployed to production: `vercel --prod` (thepickleco)
- [ ] Tested on www.thepickleco.mx
- [ ] Re-linked to staging: `vercel link` → pickleco-staging

---

## Related Documentation

- [ops/environments.md](./ops/environments.md) - Detailed environment setup
- [integrations/supabase.md](./integrations/supabase.md) - Database access patterns
- [integrations/stripe.md](./integrations/stripe.md) - Payment configuration
