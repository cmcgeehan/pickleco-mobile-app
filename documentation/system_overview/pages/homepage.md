# Homepage

This document covers the homepage (`/`) - the main landing page.

## Overview

**File:** `app/page.tsx`
**URL:** `/` (root)

The homepage is the main marketing and entry point for the website. It showcases the club, features spotlight events, and provides navigation to key features like [/play](./play.md), [/calendar](./calendar.md), and [/membership](./membership.md).

---

## Page Sections

### Hero Section
- Full-width hero banner with background image
- Main call-to-action buttons linking to [/play](./play.md) and [/membership](./membership.md)
- Component: `<Hero />`

### Feature Highlights
- Three feature cards (Play, Learn, Connect)
- Overlaps hero section on desktop
- Component: `<FeatureHighlights />`
- Links to [/play](./play.md), [/lessons](./lessons.md)

### Founding Members Section
- Showcase founding members/investors
- Component: `<FoundingMembers />`

### Our Space Section
- Photos/info about the facility
- Component: `<OurSpace />`

### Location Section
- Google Maps embed showing club location
- Address: Av Moliere 46, Granada, Miguel Hidalgo, 11529 Ciudad de Mexico
- "Open in Google Maps" button

### FAQ Section
- Frequently asked questions about pickleball and the club
- Questions about [memberships](./membership.md) and pricing
- Component: `<HomeFAQ />`

### Event Spotlight Section
- Featured/spotlight events from the database (see [events table](../data/schema.md#events))
- Black background section
- Shows events where `spotlight = true`
- Component: `<EventSpotlight />` (same component used on [/play](./play.md) and [/calendar](./calendar.md))

### SEO Content Section
- Marketing content for different user types (padel lovers, tennis lovers, squash/racquet lovers)
- "Fastest Growing Sport" section with location-based keywords

### Blog Preview Section
- Recent blog posts preview
- Component: `<BlogPreview />`

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `Hero` | Main hero banner |
| `FeatureHighlights` | Feature cards |
| `FoundingMembers` | Founding member showcase |
| `OurSpace` | Facility showcase |
| `HomeFAQ` | FAQ accordion |
| `EventSpotlight` | Featured events carousel |
| `BlogPreview` | Recent blog posts |

---

## Data Fetching

### Spotlight Events

Uses the `useSpotlightEvents()` hook to fetch events from the [events table](../data/schema.md#events).

```typescript
const { events, isLoading, error, refreshEvents } = useSpotlightEvents()
```

Events are fetched from `/api/play?view=spotlight` and filtered to show only spotlight events.

---

## Event Interactions

When users interact with events, they use the same registration flow documented in [event registration API](../api/events_registration.md).

### Event Selection
When a user clicks an event:
1. `handleEventSelect(event)` is called
2. `selectedEvent` state is set
3. `LazyEventModal` is displayed (shows pricing based on [membership tier](../core_concepts/pricing.md))

### Registration
Calls the [event registration API](../api/events_registration.md):
```typescript
const handleEventRegister = async (eventId: any) => {
  await fetch(`/api/events/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, userId: user?.id }),
  })
  refreshEvents()
}
```

### Unregistration
```typescript
const handleEventUnregister = async (eventId: any) => {
  await fetch(`/api/events/unregister`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, userId: user?.id }),
  })
  refreshEvents()
}
```

---

## Authentication

Uses `useAuthStore()` from [Supabase integration](../integrations/supabase.md). Unauthenticated users can view the page but registration redirects to [/login](./auth.md).

---

## Translation Keys

Uses the `useTranslations()` hook with these namespaces:
- `homepageLocation` - Location section text
- `events` - Event-related text
- `seoSection` - SEO content

---

## Mobile Responsiveness

- Hero section adapts to mobile
- Feature cards stack vertically on mobile
- Location section shows map above text on mobile
- Event spotlight becomes scrollable carousel

---

## Performance Optimizations

- `LazyEventModal` - Lazy loaded to reduce initial bundle size
- Events fetched with SWR for caching

---

## Related Documentation

- [./play.md](./play.md) - Play page (similar event display)
- [./calendar.md](./calendar.md) - Calendar page
- [./membership.md](./membership.md) - Membership page
- [./auth.md](./auth.md) - Login/authentication
- [../api/events_registration.md](../api/events_registration.md) - Registration flow
- [../data/schema.md](../data/schema.md) - Database schema
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Event pricing
