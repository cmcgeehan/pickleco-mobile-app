# Database Schema

This document describes the database tables, their relationships, and key design decisions.

**Source of truth:** `apps/web/types/supabase.ts`

## Core Tables Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  locations  │────<│   courts    │     │    users    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   events    │────<│ event_courts│     │ event_registrations │
└─────────────┘     └─────────────┘     └─────────────────────┘
       │                                        │
       │                                        │
       ▼                                        │
┌─────────────┐                                 │
│ event_types │                                 │
└─────────────┘                                 │
                                                │
       ┌────────────────────────────────────────┘
       │
       ▼
┌─────────────────────┐
│ participant_* fields │  ← Denormalized from users (RLS workaround)
└─────────────────────┘
```

---

## Tables

### `users`
The main user table for players, coaches, and admins.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (matches Supabase Auth user ID) |
| `email` | string | User's email |
| `first_name`, `last_name` | string | User's name |
| `role` | string | User role (e.g., 'admin', 'staff', 'user') |
| `is_coach` | boolean | Whether user is a coach |
| `coaching_rate` | number | Hourly rate in MXN (if coach) |
| `has_signed_waiver` | boolean | Required before registering for events |
| `stripe_customer_id` | string | Stripe customer ID for payments |
| `dupr_id` | string | DUPR player ID |
| `dupr_access_token` | string | OAuth token for DUPR API calls |
| `dupr_singles_rating`, `dupr_doubles_rating` | number | DUPR ratings |

**Key relationships:**
- `events.created_by` → `users.id`
- `events.coach_id` → `users.id`
- `event_registrations.user_id` → `users.id`

**RLS Note:** Users can only read/update their own row. See [rls_policies.md](./rls_policies.md).

---

### `locations`
Physical club locations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Location name |
| `timezone` | string | Timezone for the location |
| `show_location` | boolean | Whether to display publicly |

---

### `courts`
Individual courts at a location.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Court name (e.g., "Court 1") |
| `location_id` | uuid | FK to locations |

---

### `event_types`
Categories of events (e.g., "Open Play", "Round Robin", "Lesson", "Court Reservation").

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Event type name |
| `cost_mxn` | number | Base cost in MXN |
| `cost_type` | string | 'per_person' or 'flat' |
| `duration` | number | Default duration in minutes |
| `display_event` | boolean | Whether to show on calendar |

**Important:** `display_event = false` hides the event type from the calendar API. Used for internal event types like court reservations.

---

### `events`
Individual scheduled events (games, lessons, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Event name |
| `event_type_id` | uuid | FK to event_types |
| `location_id` | uuid | FK to locations |
| `start_time`, `end_time` | timestamp | Event timing |
| `capacity` | number | Max participants |
| `cost_mxn` | number | Override cost (null = use event_type cost) |
| `skill_level` | string | Skill level filter |
| `coach_id` | uuid | FK to users (if lesson) |
| `created_by` | uuid | FK to users |
| `spotlight` | boolean | Featured on homepage |
| `recurring_event_id` | uuid | FK to recurring_events (if part of series) |
| `recurring_registrations` | boolean | Auto-register for future events in series |
| `requires_dupr_plus` | boolean | Requires DUPR+ subscription |
| `requires_dupr_verified` | boolean | Requires DUPR verified status |
| `match_type` | string | 'singles' or 'doubles' |

---

### `event_courts`
Junction table linking events to courts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `event_id` | uuid | FK to events |
| `court_id` | uuid | FK to courts |

---

### `event_registrations`
User registrations for events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `event_id` | uuid | FK to events |
| `user_id` | uuid | FK to users |
| `participant_first_name` | string | **Denormalized** - user's first name at registration time |
| `participant_last_initial` | string | **Denormalized** - user's last initial at registration time |
| `created_at` | timestamp | Registration time |
| `deleted_at` | timestamp | Soft delete (cancellation) |

#### Why `participant_first_name` and `participant_last_initial`?

**This is critical to understand.** See [rls_policies.md](./rls_policies.md) for full details.

Due to Row Level Security, users cannot query other users' data. When displaying event participants on the calendar, we cannot join to the users table to get names. Instead:

1. At registration time, we copy `first_name` and `last_name[0]` to the registration record
2. The calendar API reads these denormalized fields directly
3. Anyone can see participant names without needing access to the users table

**Code location:** `apps/web/app/api/play/book/route.ts:269-275`

```typescript
// Create registration with participant display fields using admin client
const { error: registrationError } = await adminClient
  .from('event_registrations')
  .insert({
    event_id: eventId,
    user_id: user.id,
    participant_first_name: userData?.first_name || 'Unknown',
    participant_last_initial: userData?.last_name?.charAt(0) || '?',
    created_at: new Date().toISOString()
  });
```

**Calendar API usage:** `apps/web/app/api/calendar/route.ts:133-143`

```typescript
participants: (event.event_registrations || [])
  .filter((reg: any) => !reg.deleted_at && reg.participant_first_name && reg.participant_last_initial)
  .map((reg: any) => ({
    userId: reg.user_id,
    firstName: reg.participant_first_name,
    lastInitial: reg.participant_last_initial,
    // ...DUPR ratings from joined user data (allowed because we select specific public fields)
  })),
```

---

### `recurring_events`
Templates for recurring event series.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Series name |
| `event_type_id` | uuid | FK to event_types |
| `frequency` | string | 'daily', 'weekly', 'monthly' |
| `days_of_week` | number[] | Days of week (0=Sunday) |
| `start_date`, `end_date` | date | Series duration |
| `first_event_id` | uuid | FK to first generated event |

---

### `membership_types`
Types of memberships available.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Membership name |
| `description` | string | What's included |
| `cost_mxn` | number | Monthly cost |

---

### `coach_weekly_templates`
Recurring weekly availability patterns for coaches.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `coach_id` | uuid | FK to users |
| `day_of_week` | int | 1-7 (Monday=1, Sunday=7) |
| `start_time` | time | Availability start (e.g., '09:00') |
| `end_time` | time | Availability end (e.g., '17:00') |
| `is_active` | boolean | Whether template is active |
| `created_at` | timestamp | Creation time |
| `deleted_at` | timestamp | Soft delete |

See [../users/coach.md](../users/coach.md) for full coach availability system.

---

### `coach_availability`
Generated availability slots from templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `coach_id` | uuid | FK to users |
| `start_time` | timestamptz | Slot start (UTC) |
| `end_time` | timestamptz | Slot end (UTC) |
| `booking_status` | varchar | Status: `template_generated`, `coach_reviewed`, `open_for_booking`, `past` |
| `generation_week` | date | Which week this was generated for |
| `auto_approved` | boolean | Whether auto-approved by system |
| `created_at` | timestamp | Creation time |
| `deleted_at` | timestamp | Soft delete |

---

### `coach_availability_overrides`
Time blocks and exceptions to coach availability.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `coach_id` | uuid | FK to users |
| `override_date` | date | Date of override |
| `override_type` | varchar | 'time_block' or 'full_day' |
| `start_time` | time | Block start (for time_block) |
| `end_time` | time | Block end (for time_block) |
| `reason` | text | Reason for block |
| `is_active` | boolean | Whether override is active |
| `created_at` | timestamp | Creation time |

---

### `coach_preferences`
Coach settings for automation and notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `coach_id` | uuid | FK to users |
| `auto_approve_enabled` | boolean | Auto-approve generated slots |
| `vacation_mode` | boolean | Disable generation during vacation |
| `vacation_start` | date | Vacation start date |
| `vacation_end` | date | Vacation end date |
| `notification_email` | varchar | Email for notifications |
| `notification_preferences` | jsonb | Notification settings |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last update |

---

### `payments`
Unified table for all Stripe payment records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `stripe_payment_intent_id` | string | Stripe PaymentIntent ID (unique) |
| `stripe_checkout_session_id` | string | Stripe Checkout Session ID |
| `stripe_charge_id` | string | Stripe Charge ID |
| `stripe_invoice_id` | string | Stripe Invoice ID |
| `stripe_subscription_id` | string | Stripe Subscription ID |
| `amount_mxn` | decimal | Amount in MXN |
| `currency` | string | Currency code (default 'mxn') |
| `status` | enum | Payment status (see below) |
| `payment_type` | enum | Payment type (see below) |
| `user_id` | uuid | FK to users |
| `event_id` | uuid | FK to events (optional) |
| `event_registration_id` | uuid | FK to event_registrations (optional) |
| `membership_id` | uuid | FK to memberships (optional) |
| `description` | string | Payment description |
| `metadata` | jsonb | Additional data |
| `paid_at` | timestamp | When payment succeeded |
| `refunded_at` | timestamp | When refund occurred |

**Payment Type Enum:** `lesson`, `event_registration`, `membership`, `pro_shop`, `other`

**Payment Status Enum:** `pending`, `processing`, `succeeded`, `failed`, `refunded`, `partially_refunded`, `cancelled`

**RLS:** Users can only view their own payments. Insert/update restricted to service role.

See [../integrations/stripe.md](../integrations/stripe.md) for full schema and queries.

---

### `memberships`
User membership subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users |
| `membership_type_id` | uuid | FK to membership_types |
| `stripe_subscription_id` | string | Stripe subscription ID |
| `created_at` | timestamp | When membership started |
| `end_date` | timestamp | When membership expires (null = perpetual) |
| `deleted_at` | timestamp | Soft delete (cancelled) |

---

### `membership_event_discounts`
Price lookup table for membership discounts.

| Column | Type | Description |
|--------|------|-------------|
| `membership_type_id` | uuid | FK to membership_types |
| `event_type_id` | uuid | FK to event_types |
| `price_mxn` | number | Discounted price for this combination |

---

## Soft Deletes

All tables use `deleted_at` for soft deletes. **Always filter with `.is('deleted_at', null)` when querying active records.**

```typescript
// Correct
const { data } = await supabase
  .from('events')
  .select('*')
  .is('deleted_at', null)

// Wrong - will include deleted records
const { data } = await supabase
  .from('events')
  .select('*')
```

---

## Related Documentation

- [rls_policies.md](./rls_policies.md) - RLS policies and their implications
- [../api/events_registration.md](../api/events_registration.md) - Event registration API flow
- [../integrations/supabase.md](../integrations/supabase.md) - Admin vs user client patterns
