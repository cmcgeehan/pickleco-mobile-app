# The Pickle Co - System Overview

This document provides a comprehensive overview of The Pickle Co's software system, our users, and how everything fits together.

## What We're Building

Software for Mexico City's first professional pickleball club. The platform handles:
- **Event management** - Open play sessions, round robins, tournaments
- **Court reservations** - Players booking courts with friends
- **Lesson booking** - Private/group lessons with coaches
- **Membership management** - Subscription tiers with pricing benefits
- **Pro shop** - Merchandise and equipment sales

**Live site:** www.thepickleco.mx
**Staging site:** staging.thepickleco.mx

---

## Our Users

We have three primary user types, each with distinct needs:

| User Type | Primary Goal | Main Pages |
|-----------|-------------|------------|
| **Player** | Play pickleball, book courts/lessons, join events | /play, /calendar, /membership |
| **Coach** | Manage availability, track lessons, get paid | /coach-dashboard |
| **Admin/Staff** | Manage operations, courts, users, events | /admin |

### 1. The Player
**See:** [users/player.md](./users/player.md)

The website is primarily designed for players. Our most important goal is to get them playing as much as possible and make it easy.

**What players can do:**
- Browse and register for events on the calendar
- Reserve courts to play with friends
- Book lessons with coaches
- Purchase memberships for discounts
- Link their DUPR account for ratings display
- View their upcoming and past bookings

**Key pages:**
- `/play` - Booking hub with upcoming reservations and featured events
- `/calendar` - All events, filterable by date and skill level
- `/membership` - Purchase/manage membership subscriptions
- `/account` - Profile settings, DUPR linking, waiver signing

**Missing functionality:**
- Notifications/reminders for upcoming bookings
- In-app messaging with coaches

### 2. The Coach
**See:** [users/coach.md](./users/coach.md)

Coaches need to manage their availability and track their earnings.

**What coaches can do:**
- Set availability windows for lesson bookings
- View upcoming and past lessons
- See expected earnings

**Key pages:**
- `/coach-dashboard` - Availability management, schedule view

**Missing functionality:**
- Setting/editing avatar and bio
- Setting hourly rate (currently admin-only)
- Cancelling/rescheduling lessons
- Push notifications for new bookings

### 3. The Admin/Staff
**See:** [users/admin.md](./users/admin.md)

Staff manage day-to-day operations at the club.

**What admins can do:**
- View and edit court schedules
- Manage events (create, edit, delete)
- View and manage users
- Process walk-in payments
- Sell memberships

**Key pages:**
- `/admin` - Dashboard with court grid, event management
- `/admin/events` - Event CRUD operations
- `/admin/users` - User management (partially broken)

**Missing functionality:**
- Users page needs fixing
- Bulk operations on events

---

## Core Features

### Event Registration Flow
**See:** [api/events_registration.md](./api/events_registration.md)

1. Player browses `/calendar` and selects an event
2. Event modal shows details, price, and current participants
3. Player clicks "Register"
4. System checks: authentication, capacity, DUPR requirements, existing registration
5. Registration created with denormalized participant name fields
6. Player appears in participant list

**Key constraint:** Participant names are denormalized onto `event_registrations` because RLS prevents reading other users' data. See [data/rls_policies.md](./data/rls_policies.md).

### Court Reservations
Players can book courts for personal use:
1. Select date/time on `/play` or `/reserve`
2. Choose court and duration
3. Pay via Stripe (price based on membership tier)
4. Reservation appears on court schedule

### Lesson Booking
Players book lessons with coaches:
1. Select coach from available coaches
2. View coach's available time slots
3. Choose slot and duration
4. Pay court fee + coach hourly rate
5. Lesson appears on both player's and coach's schedules

**Pricing:** `total = court_price (membership-adjusted) + (coach_rate × hours)`

### Membership System
**See:** [core_concepts/pricing.md](./core_concepts/pricing.md)

| Tier | Monthly Cost | Benefits |
|------|-------------|----------|
| Pay to Play | $0 | Full price for everything |
| Standard | TBD | Discounted rates |
| Ultimate | TBD | Best rates, some free events |

Membership affects pricing for:
- Reta (Open Play)
- Court Reservations
- Lessons (court fee only, not coach fee)

### DUPR Integration
**See:** [integrations/dupr.md](./integrations/dupr.md)

Players can link their DUPR account to:
- Display their rating on their profile
- Show ratings in participant lists
- Access DUPR+ or DUPR Verified-only events

DUPR data stored on users table:
- `dupr_id` - Player ID
- `dupr_access_token` / `dupr_refresh_token` - OAuth tokens
- `dupr_singles_rating` / `dupr_doubles_rating` - Cached ratings

### Pro Shop
**See:** [pages/shop.md](./pages/shop.md)

E-commerce for paddles, merch, and accessories:
- Items marked as "pre-sale" if not in stock
- Regular sale for in-stock items
- Stripe checkout integration

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14 (App Router) | React framework with SSR |
| Database | Supabase (PostgreSQL) | Primary data store |
| Auth | Supabase Auth | Email + Google OAuth |
| Payments | Stripe | Subscriptions, one-time payments |
| Email | Resend | Transactional emails |
| Deployment | Vercel | Hosting and CI/CD |
| Notifications | Slack | Team alerts for bookings |
| Ratings | DUPR API | Player ratings integration |

---

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── play/book/     # Event registration
│   │   ├── events/        # Event management
│   │   ├── stripe/        # Payment webhooks
│   │   ├── dupr/          # DUPR integration
│   │   └── ...
│   ├── play/              # Player booking hub
│   ├── calendar/          # Event calendar
│   ├── membership/        # Membership purchase
│   ├── account/           # User settings
│   ├── admin/             # Admin panel
│   ├── coach-dashboard/   # Coach management
│   └── shop/              # Pro shop
├── components/            # React components
│   ├── calendar/          # Calendar-specific
│   ├── auth/              # Auth components
│   └── ui/                # Shared UI components
├── lib/                   # Shared utilities
│   ├── supabase-server.ts # Server Supabase clients
│   ├── pricing.ts         # Price calculations
│   ├── stripe.ts          # Stripe utilities
│   └── dupr/              # DUPR client
├── types/
│   └── supabase.ts        # Generated DB types
├── locales/               # i18n (en/es)
└── public/                # Static assets
```

---

## Key Architectural Decisions

### 1. Participant Name Denormalization
**See:** [data/rls_policies.md](./data/rls_policies.md)

Due to RLS, we can't join to users table to get other participants' names. Instead, we copy `first_name` and `last_initial` to `event_registrations` at registration time.

### 2. Admin Client Pattern
**See:** [integrations/supabase.md](./integrations/supabase.md)

Two Supabase client types:
- **User client** (anon key) - Subject to RLS
- **Admin client** (service role key) - Bypasses RLS

Use admin client when writing data other users need to read.

### 3. Soft Deletes
All tables use `deleted_at` timestamp instead of hard deletes. Always filter with `.is('deleted_at', null)`.

### 4. Flat Pricing Model
**See:** [core_concepts/pricing.md](./core_concepts/pricing.md)

Prices stored in `membership_event_discounts` table, not hardcoded. Each membership tier has specific prices per event type.

### 5. Bilingual Support
All user-facing content supports English and Spanish via i18n. Database stores both `description_en` and `description_es`.

---

## Environments

| Environment | URL | Stripe | DUPR | Supabase |
|-------------|-----|--------|------|----------|
| Local | localhost:3000 | Test | Test | Staging DB |
| Staging | staging.thepickleco.mx | Test | Test | Staging DB |
| Production | www.thepickleco.mx | **Live** | Test* | Production DB |

*DUPR doesn't have production keys yet

**See:** [ops/environments.md](./ops/environments.md)

---

## What's Not Being Used

- `/app/seo/` - SEO tools page, not actively used
- `/api/test-*` - Various test endpoints, can be cleaned up

---

## Related Documentation

- [README.md](./README.md) - Documentation index
- [commiting_changes.md](./commiting_changes.md) - Development workflow
- [data/schema.md](./data/schema.md) - Database structure
- [data/rls_policies.md](./data/rls_policies.md) - Security policies
