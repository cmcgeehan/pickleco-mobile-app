# Reserve Page

This document covers the court reservation page (`/reserve`).

## Overview

**File:** `app/reserve/page.tsx`
**URL:** `/reserve`

The reserve page allows users to view their upcoming reservations and make new court reservations. Reservations are stored as events in the [events table](../data/schema.md#events) with a court reservation event type.

---

## Page Sections

### Upcoming Reservations
- Shows user's current/upcoming reservations from [events table](../data/schema.md#events)
- Component: `<UpcomingReservations />`
- Requires [authentication](./auth.md) to show user-specific data

### Reservation Options
- Different ways to book courts
- Component: `<ReservationOptions />`

---

## Page Structure

```tsx
export default function ReservePage() {
  const { t } = useTranslations()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>{t('reservations', 'title')}</h1>
      <div className="space-y-12">
        <Suspense fallback={<PageLoader />}>
          <UpcomingReservations />
        </Suspense>
        <ReservationOptions />
      </div>
    </div>
  )
}
```

---

## Upcoming Reservations Component

Displays reservations from [events table](../data/schema.md#events):
- Date and time
- Court name (from [event_courts](../data/schema.md#event_courts) → [courts](../data/schema.md#courts))
- Duration
- Cancel button

Data fetched from [events table](../data/schema.md#events) where:
- `event_type_id` = Court Reservation type (from [event_types](../data/schema.md#event_types))
- `user_id` = current user
- `start_time` > now
- `deleted_at` is null (see [soft deletes pattern](../data/schema.md#soft-deletes))

---

## Reservation Options Component

Provides different reservation types:
- Quick Reserve (single session)
- Recurring Reservation
- Group Reservation

Each option opens the appropriate wizard or booking flow.

---

## Court Reservation Wizard

When making a new reservation, the `<CourtReservationWizard />` is opened (same wizard available on [/play page](./play.md)):

**Steps:**
1. Select [location](../data/schema.md#locations)
2. Select date
3. Select time slot
4. Select court (from available [courts](../data/schema.md#courts))
5. Select duration
6. Review and confirm
7. Payment (via [Stripe](../integrations/stripe.md))

---

## Pricing

Court reservation pricing based on (see [pricing docs](../core_concepts/pricing.md)):
- [Membership tier](./membership.md)
- Duration
- Time of day (potential peak pricing)

Price lookup from [membership_event_discounts table](../data/schema.md#membership_event_discounts).

---

## Data Model

Court reservations are stored as events in [events table](../data/schema.md#events). Uses [admin client](../integrations/supabase.md#admin-vs-user-client) to bypass RLS:

```typescript
// Create reservation event
const { data: event } = await adminClient
  .from('events')
  .insert({
    name: 'Court Reservation',
    event_type_id: courtReservationTypeId,  // From [event_types table](../data/schema.md#event_types)
    start_time: selectedSlot.start,
    end_time: selectedSlot.end,
    capacity: 1,
    location_id: locationId,  // From [locations table](../data/schema.md#locations)
    created_by: userId,
    user_id: userId,  // Owner of reservation
  })

// Link to court via [event_courts table](../data/schema.md#event_courts)
await adminClient
  .from('event_courts')
  .insert({
    event_id: event.id,
    court_id: selectedCourtId,  // From [courts table](../data/schema.md#courts)
  })

// Create registration with denormalized participant fields
// (see [RLS policies](../data/rls_policies.md#participant-fields-pattern))
await adminClient
  .from('event_registrations')
  .insert({
    event_id: event.id,
    user_id: userId,
    participant_first_name: user.first_name,
    participant_last_initial: user.last_name?.charAt(0),
  })
```

---

## Court Availability

Checks for conflicts when selecting courts by querying [event_courts](../data/schema.md#event_courts):

```typescript
// Find booked courts for the time slot
const { data: bookedCourts } = await supabase
  .from('event_courts')
  .select('court_id, events!inner(start_time, end_time, deleted_at)')
  .is('events.deleted_at', null)  // Respect [soft deletes](../data/schema.md#soft-deletes)
  .gte('events.end_time', slotStart)
  .lte('events.start_time', slotEnd)
```

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `UpcomingReservations` | User's reservations list |
| `ReservationOptions` | Booking type selection |
| `CourtReservationWizard` | Multi-step booking wizard (also on [/play](./play.md)) |
| `PageLoader` | Loading state |

---

## Authentication

- Page viewable by all users
- Upcoming reservations requires [login](./auth.md)
- Creating reservations requires [login](./auth.md)
- Unauthenticated users redirected to [/login](./auth.md)
- Uses [Supabase auth](../integrations/supabase.md)

---

## Translation Keys

Uses `reservations` namespace:
- `reservations.title`
- `reservations.loadingReservations`
- etc.

---

## Related Documentation

- [./play.md](./play.md) - Play page (also has reservation wizard)
- [./calendar.md](./calendar.md) - Shows reservations on calendar
- [./auth.md](./auth.md) - Authentication required
- [./membership.md](./membership.md) - Membership affects reservation pricing
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Reservation pricing
- [../integrations/stripe.md](../integrations/stripe.md) - Payment processing
- [../integrations/supabase.md](../integrations/supabase.md) - Database and admin client
- [../data/schema.md](../data/schema.md) - Events, event_courts, courts, locations tables
- [../data/rls_policies.md](../data/rls_policies.md) - Participant fields pattern
- [../users/player.md](../users/player.md) - Player reservation journey
