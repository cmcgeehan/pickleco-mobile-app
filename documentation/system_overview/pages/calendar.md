# Calendar Page

This document covers the calendar page (`/calendar`) - full event calendar view.

## Overview

**File:** `app/calendar/page.tsx`
**URL:** `/calendar`

The calendar page provides a comprehensive view of all display events from the [events table](../data/schema.md#events), with filtering by date and skill level. Unlike [/play](./play.md) which shows only spotlight events, this page shows all events where `event_types.display_event = true`.

---

## Page Sections

### Spotlight Events Section
- Shows events with `spotlight = true` (same as [homepage](./homepage.md) and [/play](./play.md))
- Always visible at the top
- Component: `<EventSpotlight />`

### All Events Section
- Filterable list/calendar of all display events
- Shows events where [event_types](../data/schema.md#event_types).`display_event = true`
- Toggle between list view (card-based layout) and calendar view (weekly grid)

### View Toggle
Users can switch between:
- **List View**: Cards showing event details in chronological order
- **Calendar View**: Weekly calendar grid using `WeeklyCalendarView` component

### Filters
- **Skill Level:** All, Beginner, Intermediate, Advanced
- **Date Range:** Optional start and end date pickers (list view only)

---

## Filtering

### Date Range Filter
By default, the list view shows **all upcoming events** in chronological order. Users can optionally filter by date range using two date pickers:

```typescript
const [startDate, setStartDate] = useState<Date | null>(null)
const [endDate, setEndDate] = useState<Date | null>(null)
```

Events are filtered client-side:
```typescript
.filter((event: any) => {
  const eventDate = new Date(event.start_time)
  // Date range filter: show all if no dates set, otherwise filter by range
  let dateMatches = true
  if (startDate) {
    dateMatches = dateMatches && !isBefore(eventDate, startOfDay(startDate))
  }
  if (endDate) {
    dateMatches = dateMatches && !isAfter(eventDate, endOfDay(endDate))
  }
  const skillMatches = selectedSkillLevel === 'all' || event.skill_level === selectedSkillLevel
  return dateMatches && skillMatches
})
```

**Filter behaviors:**
- No dates set: Shows all future events
- Start date only: Shows events from that date forward
- End date only: Shows events up to that date
- Both dates: Shows events within the range

A "Clear Filter" button appears when any date filter is active.

### Skill Level Filter
```typescript
const [selectedSkillLevel, setSelectedSkillLevel] = useState("all")
```

Options:
- `all` - All levels
- `beginner` - Beginner events
- `intermediate` - Intermediate events
- `advanced` - Advanced events

---

## Data Fetching

Uses SWR with `/api/play?view=display_events` to fetch from [events table](../data/schema.md#events):

```typescript
const {
  data,
  error,
  isLoading,
  mutate: refreshEvents
} = useSWR(
  ['/api/play?view=display_events', selectedDate.toISOString(), selectedSkillLevel, currentLocation?.id],
  ([url]) => fetcher(url),
  { revalidateOnFocus: true }
)
```

---

## Event Transformation

Events from API are transformed to calendar format. Note how `isRegistered` is determined by checking [event_registrations](../data/schema.md#event_registrations):

```typescript
const mapped = data.events
  .map((event: any) => {
    const isRegistered = event.event_registrations && user
      ? event.event_registrations.some((reg: any) => reg.user_id === user.id && !reg.deleted_at)
      : false
    const eventType = event.event_types?.[0]?.name || 'other'
    return {
      ...event,
      title: event.name,
      start: event.start_time,
      end: event.end_time,
      type: eventType,
      isRegistered,
    }
  })
```

---

## Event Type Colors

Event types are defined in the [event_types table](../data/schema.md#event_types):

```typescript
const EVENT_TYPE_COLORS: Record<CalendarEvent['type'], { bg: string, text: string }> = {
  'clinic': { bg: 'bg-primary', text: 'text-white' },
  'tournament': { bg: 'bg-highlight', text: 'text-foreground' },
  'lesson': { bg: 'bg-secondary', text: 'text-white' },      // See [lessons page](./lessons.md)
  'social': { bg: 'bg-coral', text: 'text-white' },
  'league': { bg: 'bg-amber-500', text: 'text-white' },
  'other': { bg: 'bg-gray-500', text: 'text-white' },
  'court': { bg: 'bg-blue-500', text: 'text-white' },
  'reservation': { bg: 'bg-green-500', text: 'text-white' } // See [reserve page](./reserve.md)
}
```

---

## Event Types Mapping

```typescript
const getEventType = (eventType: { name: string } | null): CalendarEvent['type'] => {
  switch (eventType?.name?.toLowerCase()) {
    case 'lesson': return 'lesson'        // Booked via [/lessons](./lessons.md)
    case 'clinic': return 'clinic'
    case 'tournament': return 'tournament'
    case 'social event': return 'social'
    case 'league play': return 'league'
    case 'court': return 'court'
    case 'reservation': return 'reservation'  // Booked via [/reserve](./reserve.md)
    default: return 'other'
  }
}
```

---

## Event Card Display

Each event shows:
- Event title (name)
- Event type badge (colored by [event_types](../data/schema.md#event_types))
- Time range (start - end)
- Skill level (if set)

```tsx
<Card key={event.id} onClick={() => handleEventSelect(event)}>
  <CardHeader>
    <CardTitle>{event.title}</CardTitle>
    <Badge>{event.type}</Badge>
  </CardHeader>
  <CardContent>
    <div>{format(new Date(event.start), "h:mm a")} - {format(new Date(event.end), "h:mm a")}</div>
    <div>{t('common', 'skillLevel')}: {t('common', event.skill_level)}</div>
  </CardContent>
</Card>
```

---

## Registration Handling

Uses the same [event registration API](../api/events_registration.md) pattern as [homepage](./homepage.md) and [/play](./play.md):

```typescript
const handleEventRegister = async (eventId: string) => {
  await fetch(`/api/events/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, userId: user?.id }),
  })
  refreshEvents()
}
```

Registration creates records in [event_registrations](../data/schema.md#event_registrations) with participant fields (see [RLS policies](../data/rls_policies.md)).

---

## Event Modal

When clicking an event, the modal shows:
- Event details
- Participant list (using denormalized [participant fields](../data/rls_policies.md#participant-fields-pattern))
- [Pricing](../core_concepts/pricing.md) based on user's [membership](./membership.md) tier
- [DUPR ratings](../integrations/dupr.md) for participants if available
- Register/unregister buttons

---

## Waitlist Modal

For locations that support waitlists:
```typescript
{showWaitlist && currentLocation && user && (
  <WaitlistModal
    location={currentLocation.name}
    locationId={currentLocation.id}
    userId={user.id}
    onClose={() => setShowWaitlist(false)}
  />
)}
```

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `EventSpotlight` | Spotlight events section - displays handpicked featured events (no filters) |
| `WeeklyCalendarView` | Weekly grid calendar view for All Events section |
| `LazyEventModal` | Event detail modal with [pricing](../core_concepts/pricing.md) |
| `WaitlistModal` | Waitlist signup |
| `Calendar` (UI) | Date picker calendar for filtering |
| `Select` | Skill level dropdown |
| `PageLoader` | Loading state |

---

## Context Usage

| Context | Purpose |
|---------|---------|
| `useAuthStore()` | User state from [Supabase auth](../integrations/supabase.md) |
| `useLocation()` | Selected [location](../data/schema.md#locations) |
| `useLanguage()` | Language for date formatting |
| `useToast()` | Error notifications |
| `useTranslations()` | i18n |

---

## Authentication

- Page viewable by all users
- Registration requires [login](./auth.md)
- Unauthenticated users redirected to `/login` when trying to register

---

## Related Documentation

- [./play.md](./play.md) - Play page (spotlight events only)
- [./homepage.md](./homepage.md) - Homepage (also shows spotlight)
- [./lessons.md](./lessons.md) - Lesson booking
- [./reserve.md](./reserve.md) - Court reservations
- [./auth.md](./auth.md) - Authentication
- [../api/events_registration.md](../api/events_registration.md) - Registration API
- [../data/schema.md](../data/schema.md) - Database schema
- [../data/rls_policies.md](../data/rls_policies.md) - RLS and participant fields
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Event pricing
- [../integrations/dupr.md](../integrations/dupr.md) - DUPR ratings
