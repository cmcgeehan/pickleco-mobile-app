# The Pickle Co - System Documentation

This folder contains comprehensive documentation for The Pickle Co's software system. The goal is to provide enough context that any engineer can understand the full system, make informed decisions, and avoid architectural mistakes.

> **Mobile App Developers**: Start with [mobile_architecture.md](./mobile_architecture.md) for mobile-specific patterns, then review the shared concepts below.

## Quick Links

| Document | Description |
|----------|-------------|
| [mobile_architecture.md](./mobile_architecture.md) | **Mobile-specific** architecture, patterns, and structure |
| [general.md](./general.md) | High-level overview, user types, and business context |
| [commiting_changes.md](./commiting_changes.md) | Development workflow and deployment process |

## Documentation Structure

### Core System
- **[general.md](./general.md)** - Start here. Overview of the business, user types, and main features
- **[commiting_changes.md](./commiting_changes.md)** - Deployment workflow (staging → production)

### Data Architecture
- **[data/schema.md](./data/schema.md)** - Database tables, relationships, and design decisions
- **[data/rls_policies.md](./data/rls_policies.md)** - Row Level Security policies and their implications
- **[data/migrations.md](./data/migrations.md)** - How to create and run migrations

### API Documentation
- **[api/overview.md](./api/overview.md)** - API patterns, authentication, client types
- **[api/events_registration.md](./api/events_registration.md)** - Event booking flow (`/api/play/book`, `/api/events/register`)
- **[api/stripe.md](./api/stripe.md)** - Payment processing and webhooks
- **[api/dupr.md](./api/dupr.md)** - DUPR integration endpoints

### Core Concepts
- **[core_concepts/pricing.md](./core_concepts/pricing.md)** - Pricing model, membership discounts
- **[core_concepts/events_vs_reservations.md](./core_concepts/events_vs_reservations.md)** - Event types explained
- **[core_concepts/authentication.md](./core_concepts/authentication.md)** - Auth flow and session management
- **[core_concepts/waiver.md](./core_concepts/waiver.md)** - Liability waiver system
- **[core_concepts/translations.md](./core_concepts/translations.md)** - i18n and language switching

### Integrations
- **[integrations/supabase.md](./integrations/supabase.md)** - Database, auth, admin vs user clients
- **[integrations/stripe.md](./integrations/stripe.md)** - Payment processing setup
- **[integrations/dupr.md](./integrations/dupr.md)** - DUPR OAuth and entitlements

### User Journeys
- **[users/player.md](./users/player.md)** - Player features and pages
- **[users/coach.md](./users/coach.md)** - Coach dashboard and capabilities
- **[users/admin.md](./users/admin.md)** - Admin panel operations

### Pages
- **[pages/homepage.md](./pages/homepage.md)** - `/` main landing page
- **[pages/play.md](./pages/play.md)** - `/play` booking hub
- **[pages/calendar.md](./pages/calendar.md)** - `/calendar` event browsing
- **[pages/membership.md](./pages/membership.md)** - `/membership` purchase flow
- **[pages/lessons.md](./pages/lessons.md)** - `/lessons` coach browsing and booking
- **[pages/reserve.md](./pages/reserve.md)** - `/reserve` court reservations
- **[pages/account.md](./pages/account.md)** - `/account/*` user settings and profile
- **[pages/auth.md](./pages/auth.md)** - `/login` authentication flow
- **[pages/shop.md](./pages/shop.md)** - `/shop` pro shop e-commerce

### Operations
- **[ops/environments.md](./ops/environments.md)** - Staging vs production setup
- **[ops/troubleshooting.md](./ops/troubleshooting.md)** - Common issues and solutions

---

## Key Architectural Decisions

These are critical patterns that must be understood before making changes:

### 1. RLS and the Participant Fields Pattern
**See: [data/rls_policies.md](./data/rls_policies.md)**

Users cannot query other users' data due to RLS. To display participant names on events, we denormalize `participant_first_name` and `participant_last_initial` onto `event_registrations` at registration time. **Never try to join to the users table to get other participants' names.**

### 2. Admin Client vs User Client
**See: [integrations/supabase.md](./integrations/supabase.md)**

- User operations use the **anon key** client - subject to RLS
- Admin operations use the **service role key** client - bypasses RLS
- When writing data that needs to be readable by other users, use the admin client

### 3. Soft Deletes
All tables use `deleted_at` for soft deletes. Always filter with `.is('deleted_at', null)` when querying active records.

### 4. Test vs Live Keys
**See: [commiting_changes.md](./commiting_changes.md)**

- Staging: Test Stripe keys, Test DUPR keys
- Production: Live Stripe keys, Test DUPR keys (DUPR doesn't have production keys yet)

### 5. Waiver Requirement
**See: [core_concepts/waiver.md](./core_concepts/waiver.md)**

Users must sign the liability waiver before booking anything. All booking API routes must check `has_signed_waiver` and return 403 with `code: 'WAIVER_REQUIRED'` if not signed.

### 6. Translations (i18n)
**See: [core_concepts/translations.md](./core_concepts/translations.md)**

All user-facing text uses the translation system (`useTranslations()` hook). When adding new features:
- Add strings to both `messages/en.json` and `messages/es.json`
- Use `t('namespace', 'key')` instead of hardcoded strings

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Email | Resend |
| Deployment | Vercel |
| Notifications | Slack |

---

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── play/              # Player booking hub
│   ├── calendar/          # Event browsing
│   ├── account/           # User settings
│   ├── admin/             # Admin panel
│   ├── coach-dashboard/   # Coach management
│   └── ...
├── components/            # React components
├── lib/                   # Shared utilities
│   ├── supabase-server.ts # Server-side Supabase clients
│   ├── stripe.ts          # Stripe utilities
│   ├── pricing.ts         # Pricing calculations
│   └── ...
├── types/
│   └── supabase.ts        # Database types (generated)
└── locales/               # i18n translations
```

---

## Getting Help

- Check existing PRDs in `/documentation/prds/`
- Check implementation docs in `/documentation/implementations/`
- Review recent migrations in `/documentation/migrations/`
