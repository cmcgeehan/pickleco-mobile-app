# Development Workflow

This document describes how we work on new features and maintain documentation.

## Overview

Our workflow ensures that:
1. We understand existing systems before making changes
2. We track what we're building and why
3. Documentation stays up-to-date after every project

---

## Workflow Steps

### 1. Review Existing Documentation

Before starting any new project, review all relevant documentation in `/documentation/system_overview/`:

**Always check:**
- [README.md](./README.md) - Key architectural decisions
- [data/schema.md](./data/schema.md) - Database tables involved
- [data/rls_policies.md](./data/rls_policies.md) - RLS implications

**Check based on feature area:**
| If working on... | Review these docs |
|------------------|-------------------|
| Events/Calendar | [pages/calendar.md](./pages/calendar.md), [pages/play.md](./pages/play.md), [api/events_registration.md](./api/events_registration.md) |
| Lessons/Coaching | [users/coach.md](./users/coach.md), [pages/lessons.md](./pages/lessons.md) |
| Payments | [integrations/stripe.md](./integrations/stripe.md), [core_concepts/pricing.md](./core_concepts/pricing.md) |
| User accounts | [pages/account.md](./pages/account.md), [pages/auth.md](./pages/auth.md), [integrations/supabase.md](./integrations/supabase.md) |
| Memberships | [pages/membership.md](./pages/membership.md), [core_concepts/pricing.md](./core_concepts/pricing.md) |
| DUPR | [integrations/dupr.md](./integrations/dupr.md) |
| Court reservations | [pages/reserve.md](./pages/reserve.md), [users/coach.md](./users/coach.md) |
| Any booking feature | [core_concepts/waiver.md](./core_concepts/waiver.md) |
| Any UI text | [core_concepts/translations.md](./core_concepts/translations.md) |

**Check for existing PRDs:**
- `/documentation/prds/` - Product requirement documents

---

### 2. Create Implementation Document

Create a new document at `/documentation/implementations/<feature-name>.md`:

```markdown
# [Feature Name] Implementation

**Started:** YYYY-MM-DD
**Status:** In Progress | Completed
**PR:** #XXX (once created)

## Overview

Brief description of what we're building and why.

## Related Documentation

Documents reviewed before starting:
- [data/schema.md](../system_overview/data/schema.md) - Reviewed for X table
- [pages/calendar.md](../system_overview/pages/calendar.md) - Understood event display
- ...

## Changes Made

### Database
- Added `new_column` to `events` table
- Created new `feature_table` table

### API Routes
- `POST /api/feature/action` - Does X
- `GET /api/feature/list` - Returns Y

### Components
- `components/feature/NewComponent.tsx` - Handles Z

### Pages
- Modified `/play` page to include new feature

## Testing

- [ ] Tested on staging
- [ ] Tested edge cases: ...
- [ ] Verified in production

## Documentation Updates Needed

After deployment, update:
- [ ] `data/schema.md` - Add new tables
- [ ] `pages/play.md` - Document new functionality
- [ ] ...
```

---

### 3. Develop the Feature

While working:
- Update the implementation doc as you make decisions
- Note any unexpected complexities or gotchas
- Track which files you're modifying

**Cross-cutting concerns to remember:**
- Add translations to both `en.json` and `es.json` (see [translations.md](./core_concepts/translations.md))
- Check waiver for any booking features (see [waiver.md](./core_concepts/waiver.md))
- Use admin client for data others need to read (see [supabase.md](./integrations/supabase.md))
- Add `deleted_at` filter to all queries (see [schema.md](./data/schema.md#soft-deletes))

---

## Web App Workflow

### 4. Test Locally First (Web)

**IMPORTANT: Always test locally before deploying to staging.**

**Steps:**
1. Start the dev server: `npm run dev`
2. Test the feature thoroughly in your local environment
3. Get explicit confirmation from the user that local testing passed
4. Only proceed to staging deployment after local green light

**Why this matters:**
- Faster feedback loop for catching bugs
- Doesn't pollute staging with broken builds
- Saves deployment time and resources
- Ensures basic functionality works before remote testing

**What to test locally:**
- Happy path works as expected
- Error handling behaves correctly
- No console errors or warnings
- UI renders properly

---

### 5. Deploy to Staging (Web)

Follow the deployment workflow in [commiting_changes.md](./commiting_changes.md):

**IMPORTANT:**
- Auto-deployments are **disabled** - you must manually deploy
- Staging must use **Stripe test keys** - never deploy with live keys to staging

**Steps:**
1. Commit and push to git
2. Deploy manually: `vercel --prod --scope cmcgeehans-projects` (select pickleco-staging)
3. Test thoroughly on staging.thepickleco.mx
4. Update implementation doc with any issues found

---

### 6. Deploy to Production (Web)

Once staging is verified:

**CRITICAL: Switch Stripe to live mode before deploying to production!**

**Steps:**
1. Ensure Stripe env vars are set to **live keys** in Vercel production (see [commiting_changes.md](./commiting_changes.md#stripe-configuration))
2. Deploy: `vercel --prod` (select thepickleco project)
3. Verify on www.thepickleco.mx
4. Re-link to staging: `vercel link` → select pickleco-staging

---

## Mobile App Workflow

The mobile app follows a three-stage deployment process with different Stripe configurations at each stage.

### 4. Test on Simulator (Mobile)

**IMPORTANT: Always test on the iOS simulator before submitting to TestFlight.**

**Environment:**
- Uses **staging API** (`staging.thepickleco.mx`)
- Uses **Stripe test keys**
- Connects to staging Supabase data

**Steps:**
1. Run the app on simulator via Xcode:
   ```bash
   npx expo run:ios --device "iPhone 17 Pro"
   ```
2. Test all features thoroughly with staging data
3. Test payment flows with Stripe test cards (e.g., `4242 4242 4242 4242`)
4. Verify no console errors or warnings
5. Get explicit confirmation that simulator testing passed

**What to test:**
- Happy path works as expected
- Error handling behaves correctly
- Payment flows complete successfully (with test cards)
- UI renders properly on different device sizes
- All translations display correctly

---

### 5. Submit to TestFlight (Mobile)

Once simulator testing passes, submit to TestFlight for beta testing.

**Environment:**
- Uses **staging API** (`staging.thepickleco.mx`)
- Uses **Stripe test keys**
- Allows real device testing with test payment data

**Steps:**
1. Increment build number in `app.json` and native project files
2. Build and submit to TestFlight:
   ```bash
   eas build --platform ios --profile production --auto-submit --non-interactive
   ```
3. Wait for Apple processing (usually 15-30 minutes)
4. Test on physical devices via TestFlight
5. Have beta testers verify functionality

**IMPORTANT:** TestFlight builds should use Stripe test keys so testers can test payment flows without real charges. Configure the TestFlight build to point to staging API.

**What to verify on TestFlight:**
- App installs and launches correctly
- All features work on real devices
- Push notifications work (if applicable)
- Payment flows complete with test cards
- Performance is acceptable

---

### 6. Submit to App Store (Mobile)

Once TestFlight testing is complete and approved:

**CRITICAL: Production builds MUST use live Stripe keys!**

**Environment:**
- Uses **production API** (`www.thepickleco.mx`)
- Uses **Stripe live keys**
- Real payments will be processed

**Steps:**
1. Update environment variables to point to production:
   - `EXPO_PUBLIC_API_URL` → production URL
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` → live key
2. Build for production:
   ```bash
   eas build --platform ios --profile production --auto-submit --non-interactive
   ```
3. Submit for App Store review
4. Monitor review status in App Store Connect
5. Once approved, release to users

**Pre-submission checklist:**
- [ ] Environment points to production API
- [ ] Stripe uses live keys
- [ ] Build number is incremented
- [ ] All TestFlight issues are resolved
- [ ] App Store metadata is up to date

---

### Mobile Stripe Key Summary

| Stage | API | Stripe Keys | Purpose |
|-------|-----|-------------|---------|
| Simulator | staging | Test | Development testing |
| TestFlight | staging | Test | Beta testing with test payments |
| App Store | production | Live | Real users, real payments |

---

### 7. Update Documentation

**This step is critical.** After every project:

#### Update existing docs:
- Schema changes → update [data/schema.md](./data/schema.md)
- New API routes → update relevant API docs
- Page changes → update relevant page docs
- New integrations → update [integrations/](./integrations/) docs

#### Create new docs if needed:
- Major new feature → new page doc in [pages/](./pages/)
- New core concept → new doc in [core_concepts/](./core_concepts/)
- New integration → new doc in [integrations/](./integrations/)

#### Update implementation doc:
- Mark status as "Completed"
- Add PR number
- Check off documentation updates
- Note any known issues or future improvements

---

## Documentation Quality Standards

### What to document:
- Database schema (tables, columns, relationships)
- API endpoints (request/response format, authentication)
- Key business logic (pricing calculations, availability checks)
- Integration patterns (how to use Stripe, DUPR, etc.)
- Cross-cutting concerns (auth, waiver, translations)

### How to write docs:
- Include code examples that can be copied
- Link to related documents inline
- Explain the "why" not just the "what"
- Keep examples updated with actual code patterns

### What NOT to document:
- Implementation details that change frequently
- Obvious code patterns
- Third-party library usage (link to their docs instead)

---

## Quick Reference

### Starting a new project:
```bash
# 1. Review relevant docs in /documentation/system_overview/
# 2. Check for existing PRDs in /documentation/prds/
# 3. Create implementation doc:
touch /documentation/implementations/my-feature.md
```

### After deploying:
```bash
# 1. Update schema.md if database changed
# 2. Update relevant page/API docs
# 3. Update implementation doc status
# 4. Consider if new docs are needed
```

---

---

## Slash Commands

These commands are available in Claude Code to automate the workflow above:

| Command | Description |
|---------|-------------|
| `/onboard` | Get agent up to speed on codebase |
| `/plan-feature` | Plan a feature from a brain dump |
| `/squash-bug` | Investigate, fix, test, and deploy a bug fix |
| `/security-check` | Security review before merge |
| `/merge` | Merge feature branch to main |
| `/ship` or `/ship testflight` | Build and submit to TestFlight |
| `/ship prod` | Build and submit to App Store |
| `/offboard` | Update docs and send Slack summary to #pickleco-software |
| `/doc-audit` | Check for stale documentation |
| `/generate-impl-doc` | Generate implementation doc from git changes |

---

## Related Documentation

- [README.md](./README.md) - Documentation index and key decisions
- [commiting_changes.md](./commiting_changes.md) - Deployment workflow
- [data/schema.md](./data/schema.md) - Database reference
- [integrations/supabase.md](./integrations/supabase.md) - Database patterns
