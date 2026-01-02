# Play Page

This document covers the play page (`/play`) - the main hub for booking activities.

## Overview

**File:** `app/play/page.tsx`
**URL:** `/play`

The play page is the central hub for players to find and book activities. It displays spotlight events (same as [homepage](./homepage.md)), the user's registered events, [coaches](../users/coach.md), and provides quick access to booking flows for [lessons](./lessons.md) and [court reservations](./reserve.md).

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Event Spotlight (70%)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [List View] [Calendar View]                                │   │
│  │  Event cards / Weekly calendar                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                          Sidebar (30%)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  My Events (UserRegistrations)                              │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Our Coaches (CoachesSection)                               │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  [View Events] [Book Lesson]                                │   │
│  │  [Reserve Court]                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Page Sections

### Event Spotlight (Main Content - 70%)

Displays handpicked spotlight events (see [events table](../data/schema.md#events) - events with `spotlight = true`). Featured events are always shown without filtering. Users can toggle between:
- **List View:** `<EventSpotlight />` - Cards showing events
- **Calendar View:** `<WeeklyCalendarView />` - Weekly calendar grid

**Note:** The EventSpotlight component has no date filters. Spotlight events are handpicked and should always be visible.

### Sidebar (30%)

#### My Events
- Shows user's registered events from [event_registrations table](../data/schema.md#event_registrations)
- Component: `<UserRegistrations />`
- Requires [authentication](./auth.md)

#### Our Coaches
- Displays available [coaches](../users/coach.md)
- Component: `<CoachesSection />`
- Links to [lesson booking](./lessons.md)

#### Action Buttons
- **View Events:** Links to [/calendar](./calendar.md)
- **Book Lesson:** Opens `<LessonBookingWizard />` (see [lessons page](./lessons.md))
- **Reserve Court:** Opens `<CourtReservationWizard />` (see [reserve page](./reserve.md))

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `EventSpotlight` | Displays handpicked spotlight events as cards (no filters - featured events always show) |
| `WeeklyCalendarView` | Calendar grid view |
| `UserRegistrations` | User's registered events |
| `CoachesSection` | [Coach](../users/coach.md) listings |
| `LessonBookingWizard` | Multi-step [lesson](./lessons.md) booking |
| `CourtReservationWizard` | [Court reservation](./reserve.md) wizard |
| `LazyEventModal` | Event detail modal with [pricing](../core_concepts/pricing.md) |

---

## View Modes

### List View (Default)
- Shows events as cards
- Events sorted by date
- Quick glance at event details

### Calendar View
- Weekly calendar grid
- Events displayed in time slots
- Better for scheduling overview

```typescript
const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
```

---

## Data Fetching

Uses `useSpotlightEvents()` hook to fetch from [events table](../data/schema.md#events):

```typescript
const {
  events,
  isLoading,
  error,
  refreshEvents
} = useSpotlightEvents()
```

This hook:
- Fetches from `/api/play?view=spotlight`
- Uses SWR for caching
- Auto-refreshes on focus

---

## Event Interactions

### Registration Flow
Uses the [event registration API](../api/events_registration.md). Note: Registration creates records in [event_registrations table](../data/schema.md#event_registrations) with denormalized participant fields due to [RLS constraints](../data/rls_policies.md).

```typescript
const handleEventRegister = async (eventId: string) => {
  if (!user) {
    toast({ ... })
    router.push('/login')  // Redirects to [login page](./auth.md)
    return
  }
  try {
    await fetch(`/api/events/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, userId: user.id }),
    })
    refreshEvents()
  } catch (error) {
    toast({ variant: 'destructive', ... })
  }
}
```

### Event Selection
Clicking an event opens the event modal which displays [pricing based on membership](../core_concepts/pricing.md):
```typescript
setSelectedEvent(event) // Opens LazyEventModal
```

---

## Modals

### Event Modal
- Opened when clicking any event
- Shows event details, participants, [pricing](../core_concepts/pricing.md)
- Register/unregister buttons using [registration API](../api/events_registration.md)
- Lazy loaded: `LazyEventModal`
- Shows [DUPR ratings](../integrations/dupr.md) for participants if available

### Court Reservation Wizard
- Multi-step wizard for [court reservations](./reserve.md)
- Opens via "Reserve Court" button
- Component: `LazyCourtReservationWizard`
- [Pricing](../core_concepts/pricing.md) based on membership tier

### Lesson Booking Wizard
- Multi-step wizard for booking [lessons](./lessons.md)
- Opens via "Book Lesson" button
- Component: `LessonBookingWizard`
- Selects from available [coaches](../users/coach.md)

---

## Authentication

Uses [Supabase authentication](../integrations/supabase.md):
- Page accessible to all users
- Registration requires [login](./auth.md)
- Redirects unauthenticated users to `/login` when trying to book

```typescript
if (!user) {
  toast({
    title: t('auth', 'signInRequired'),
    description: t('events', 'signInToRegister'),
    variant: 'destructive',
  })
  router.push('/login')  // See [auth page](./auth.md)
  return
}
```

---

## Context Usage

| Context | Purpose |
|---------|---------|
| `useAuthStore()` | User [authentication](../integrations/supabase.md) state |
| `useLocation()` | Selected [location](../data/schema.md#locations) |
| `useSupabase()` | [Supabase](../integrations/supabase.md) client |
| `useTranslations()` | Internationalization |
| `useToast()` | Toast notifications |

---

## Related Pages

- [/](./homepage.md) - Homepage (also shows spotlight events)
- [/calendar](./calendar.md) - Full calendar view
- [/lessons](./lessons.md) - Dedicated lessons page
- [/reserve](./reserve.md) - Court reservations
- [/login](./auth.md) - Authentication

---

## Related Documentation

- [../users/player.md](../users/player.md) - Player journey
- [../users/coach.md](../users/coach.md) - Coach information
- [../api/events_registration.md](../api/events_registration.md) - Registration API
- [../data/schema.md](../data/schema.md) - Database schema
- [../data/rls_policies.md](../data/rls_policies.md) - RLS and participant fields
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Event pricing
- [../integrations/supabase.md](../integrations/supabase.md) - Supabase integration
