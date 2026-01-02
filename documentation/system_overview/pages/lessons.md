# Lessons Page

This document covers the lessons page (`/lessons`) - coach browsing and lesson booking.

## Overview

**File:** `app/lessons/page.tsx`
**URL:** `/lessons`

The lessons page allows users to browse [coaches](../users/coach.md), view their upcoming lessons, and book new lessons. Lessons are stored as events in the [events table](../data/schema.md#events) with a specific event type.

---

## Page Sections

### Hero Section
- Page title and subtitle
- "Book a Lesson" CTA button
- "View My Lessons" button ([authenticated](./auth.md) users)

### Tabs
- **Browse Coaches:** View available [coaches](../users/coach.md)
- **My Lessons:** User's upcoming lessons (requires [authentication](./auth.md))

---

## Browse Coaches Tab

Shows available [coaches](../users/coach.md) from the [users table](../data/schema.md#users) where `role = 'coach'`:
- "Any Available Coach" option
- Individual coach cards

### Coach Card
Each coach displays (data from [users table](../data/schema.md#users)):
- Avatar (initials fallback)
- Name
- Hourly rate (`$X/hr`) - `coaching_rate` field
- Bio (truncated)
- Specialties badges
- "Book with [Name]" button

```tsx
<Card>
  <CardHeader>
    <Avatar>{coach.first_name[0]}{coach.last_name[0]}</Avatar>
    <CardTitle>{coach.first_name} {coach.last_name}</CardTitle>
    <span>${coach.coaching_rate}/hr</span>
  </CardHeader>
  <CardContent>
    <p>{coach.bio}</p>
    {coach.specialties.map(s => <Badge>{s}</Badge>)}
    <Button>Book with {coach.first_name}</Button>
  </CardContent>
</Card>
```

### Any Available Coach
First option - matches user with best available coach:
```tsx
<Card className="border-dashed">
  <Users icon />
  <CardTitle>Any Available Coach</CardTitle>
  <Button onClick={handleBookLesson}>Book Now</Button>
</Card>
```

---

## My Lessons Tab

Shows user's upcoming lessons from [events table](../data/schema.md#events) joined with [event_registrations](../data/schema.md#event_registrations):
- Date and time
- Coach name
- Court location (from [event_courts](../data/schema.md#event_courts))
- "View Details" button

Empty state when no lessons booked.

---

## Data Fetching

### Load Coaches
Fetches from `/api/coaches` which queries [users table](../data/schema.md#users):
```typescript
const loadCoaches = useCallback(async () => {
  const response = await fetch('/api/coaches')
  if (response.ok) {
    const data = await response.json()
    setCoaches(data.coaches || [])
  }
}, [])
```

### Load Upcoming Lessons
Fetches from `/api/lessons` which queries [events](../data/schema.md#events) with lesson event type:
```typescript
const loadUpcomingLessons = useCallback(async () => {
  const url = new URL('/api/lessons', window.location.origin)
  url.searchParams.set('status', 'upcoming')
  url.searchParams.set('limit', '5')

  const response = await fetch(url.toString())
  if (response.ok) {
    const data = await response.json()
    setUpcomingLessons(data.lessons || [])
  }
}, [])
```

---

## Booking Flow

### Book Lesson Button
Requires [authentication](./auth.md):
```typescript
const handleBookLesson = useCallback(() => {
  if (!user) {
    toast({ title: 'Sign In Required', ... })
    router.push('/login')  // Redirect to [login page](./auth.md)
    return
  }
  setShowLessonWizard(true)
}, [user, router])
```

### Book with Specific Coach
```typescript
onClick={() => {
  router.push(`/lessons/book?coach=${encodeURIComponent(coach.id)}`)
}}
```

---

## Lesson Booking Wizard

Modal dialog with multi-step wizard (same wizard available on [/play page](./play.md)):

```tsx
<Dialog open={showLessonWizard} onOpenChange={setShowLessonWizard}>
  <DialogContent>
    <DialogTitle>{t('lessons', 'bookLesson')}</DialogTitle>
    <LessonBookingWizard onClose={() => setShowLessonWizard(false)} />
  </DialogContent>
</Dialog>
```

Wizard steps:
1. Select [coach](../users/coach.md) (or any available)
2. Select date/time
3. Select duration
4. Confirm and pay (via [Stripe](../integrations/stripe.md))

---

## Coach Data Model

Coach data from [users table](../data/schema.md#users):
```typescript
interface Coach {
  id: string
  first_name: string
  last_name: string
  coaching_rate: number  // Hourly rate in MXN
  bio?: string
  specialties?: string[]
}
```

See [../users/coach.md](../users/coach.md) for full coach capabilities.

---

## Lesson Data Model

Lessons are events in the [events table](../data/schema.md#events):
```typescript
interface Lesson {
  id: string
  start_time: string
  coach: {
    first_name: string
    last_name: string
  }
  event_courts: Array<{  // From [event_courts table](../data/schema.md#event_courts)
    court: {
      name: string
      location: string
    }
  }>
}
```

---

## Pricing

Lesson pricing based on:
- Coach's hourly rate (`coaching_rate` in [users table](../data/schema.md#users))
- User's [membership tier](./membership.md) (see [pricing docs](../core_concepts/pricing.md))
- Duration selected

Price lookup from [membership_event_discounts table](../data/schema.md#membership_event_discounts).

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `LessonBookingWizard` | Multi-step booking wizard (also on [/play](./play.md)) |
| `Tabs` | Browse/My Lessons toggle |
| `Card` | Coach cards |
| `Avatar` | Coach photos |
| `Badge` | Specialties |

---

## Authentication

- Page viewable by all users
- "My Lessons" tab requires [auth](./auth.md)
- Booking requires [login](./auth.md)
- Unauthenticated users redirected to [/login](./auth.md)
- Uses [Supabase auth](../integrations/supabase.md)

---

## API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/coaches` | List all [coaches](../users/coach.md) |
| `GET /api/lessons?status=upcoming` | Get user's upcoming lessons |
| `POST /api/lessons/book` | Book a lesson (creates [event](../data/schema.md#events) and [registration](../data/schema.md#event_registrations)) |

---

## Related Documentation

- [./play.md](./play.md) - Play page (also has lesson booking wizard)
- [./calendar.md](./calendar.md) - Events calendar (shows lessons)
- [./auth.md](./auth.md) - Authentication
- [./membership.md](./membership.md) - Membership affects lesson pricing
- [../users/coach.md](../users/coach.md) - Coach user journey and capabilities
- [../users/player.md](../users/player.md) - Player lesson booking journey
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Lesson pricing
- [../integrations/stripe.md](../integrations/stripe.md) - Payment processing
- [../integrations/supabase.md](../integrations/supabase.md) - Database and auth
- [../data/schema.md](../data/schema.md) - Events, event_registrations, users tables
