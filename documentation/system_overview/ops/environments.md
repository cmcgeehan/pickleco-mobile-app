# Environments

This document covers our development, staging, and production environments.

## Environment Overview

| Environment | URL | Purpose | Vercel Project |
|-------------|-----|---------|----------------|
| Local | localhost:3000 | Development | - |
| Staging | staging.thepickleco.mx | Testing | pickleco-staging |
| Production | www.thepickleco.mx | Live users | thepickleco |

---

## Local Development

### Setup

```bash
cd apps/web
npm install
npm run dev
```

### Environment Files

- `.env.local` - Local overrides (not committed)
- `.env` - Default values

**Local uses staging Supabase database** - same data as staging.thepickleco.mx

### Key Variables for Local

```bash
# Supabase (pointing to staging)
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (test mode)
NEXT_PUBLIC_USE_LIVE_STRIPE=  # Empty = test mode
STRIPE_TEST_SECRET_KEY=sk_test_...
NEXT_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY=pk_test_...

# DUPR (test mode)
DUPR_CLIENT_ID=...
DUPR_CLIENT_SECRET=...
NEXT_PUBLIC_DUPR_REDIRECT_URI=http://localhost:3000/api/dupr/callback
```

---

## Staging Environment

### Purpose
- Test new features before production
- Verify deployments
- QA testing
- Demo to stakeholders

### Access
- URL: https://staging.thepickleco.mx
- Vercel Project: `pickleco-staging`

### Database
- Supabase project: `pickleco-staging`
- Contains test data, not real users

### External Services

| Service | Mode |
|---------|------|
| Stripe | **Test** |
| DUPR | **Test** |
| Supabase | Staging DB |
| Resend | Test (or shared) |

### Deploying to Staging

```bash
cd apps/web
vercel link  # Select pickleco-staging
vercel --prod
```

---

## Production Environment

### Purpose
- Serve real users
- Process real payments
- Store real data

### Access
- URL: https://www.thepickleco.mx
- Vercel Project: `thepickleco`

### Database
- Supabase project: `thepickleco` (production)
- Contains real user data - **be careful**

### External Services

| Service | Mode |
|---------|------|
| Stripe | **Live** |
| DUPR | Test* |
| Supabase | Production DB |
| Resend | Live |

*DUPR doesn't have production API keys yet

### Deploying to Production

```bash
cd apps/web
vercel --prod
# Select: thepickleco (when prompted)
```

**Remember to re-link to staging after:**
```bash
vercel link
# Select: pickleco-staging
```

---

## Environment Variables

### Variable Sources

1. **Vercel Dashboard** - Per-project env vars
2. **`.env.local`** - Local overrides (git-ignored)
3. **`.env`** - Defaults (committed)

### Key Variables by Environment

| Variable | Local | Staging | Production |
|----------|-------|---------|------------|
| `NEXT_PUBLIC_USE_LIVE_STRIPE` | - | - | `true` |
| `STRIPE_SECRET_KEY` | Test | Test | **Live** |
| `SUPABASE_URL` | Staging | Staging | **Production** |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging | Staging | **Production** |

### Checking Current Environment

Look for console logs:
```
🔑 Stripe: NEXT_PUBLIC_USE_LIVE_STRIPE="true", useLive=true
🟢 SELECTED: LIVE mode (production)
```

Or check `/api/stripe/verify-mode` endpoint.

---

## Supabase Projects

### Staging: pickleco-staging
- Dashboard: https://supabase.com/dashboard/project/[staging-id]
- URL: `https://[staging-id].supabase.co`
- Test data, safe to experiment

### Production: thepickleco
- Dashboard: https://supabase.com/dashboard/project/[prod-id]
- URL: `https://[prod-id].supabase.co`
- Real user data, **be careful with changes**

### Running Migrations

Always run on **staging first**, then **production**:

```sql
-- In Supabase SQL Editor
-- Run the same migration on both environments
```

---

## Vercel Projects

### pickleco-staging
- Linked domain: staging.thepickleco.mx
- Auto-deploys: No (manual deploys)
- Environment: All test keys

### thepickleco
- Linked domain: www.thepickleco.mx, thepickleco.mx
- Auto-deploys: No (manual deploys)
- Environment: Live Stripe, production Supabase

### Switching Projects

```bash
# Check current project
vercel whoami
vercel project ls

# Link to different project
vercel link
# Select desired project

# Deploy
vercel --prod
```

---

## Domain Configuration

### Production
- `www.thepickleco.mx` - Primary
- `thepickleco.mx` - Redirects to www

### Staging
- `staging.thepickleco.mx`

### DNS (Namecheap or DNS provider)
- A records pointing to Vercel
- Configured in Vercel dashboard under Domains

---

## Stripe Configuration

### Test Mode (Local + Staging)
- Dashboard: https://dashboard.stripe.com/test
- Webhook endpoint: `https://staging.thepickleco.mx/api/webhook`
- Test cards work

### Live Mode (Production)
- Dashboard: https://dashboard.stripe.com
- Webhook endpoint: `https://www.thepickleco.mx/api/webhook`
- Real cards only

### Webhook Setup

Each environment needs its own webhook:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint for the environment
3. Select events (payment_intent.succeeded, etc.)
4. Copy signing secret to env vars

---

## DUPR Configuration

Currently using **test credentials** everywhere.

| Variable | Notes |
|----------|-------|
| `DUPR_CLIENT_ID` | Test client ID |
| `DUPR_CLIENT_SECRET` | Test secret |
| `NEXT_PUBLIC_DUPR_REDIRECT_URI` | Must match environment URL |

**Redirect URIs:**
- Local: `http://localhost:3000/api/dupr/callback`
- Staging: `https://staging.thepickleco.mx/api/dupr/callback`
- Production: `https://www.thepickleco.mx/api/dupr/callback`

---

## Troubleshooting

### "Wrong database"
Check `NEXT_PUBLIC_SUPABASE_URL` - staging vs production URL

### "Stripe payments failing"
1. Check `NEXT_PUBLIC_USE_LIVE_STRIPE` value
2. Check you're using correct keys for environment
3. Check webhook is set up for correct domain

### "DUPR linking not working"
Check `NEXT_PUBLIC_DUPR_REDIRECT_URI` matches current domain

### "Deployed to wrong environment"
```bash
vercel link  # Re-link to correct project
vercel --prod  # Re-deploy
```

---

## Related Documentation

- [../commiting_changes.md](../commiting_changes.md) - Deployment workflow
- [../integrations/stripe.md](../integrations/stripe.md) - Stripe configuration
- [../integrations/supabase.md](../integrations/supabase.md) - Database setup
