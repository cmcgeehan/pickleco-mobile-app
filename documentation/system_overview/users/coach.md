# Coach System

This document covers the complete coaching system - how coaches are marked, set availability, and manage lessons.

## Overview

Coaches are users who teach pickleball lessons. The system includes:
- Coach identification and roles
- Weekly availability templates
- Availability overrides (time blocks, vacations)
- Coach dashboard for managing schedule
- Integration with the [lesson booking wizard](../pages/lessons.md)

---

## How Users Are Marked as Coaches

### Database Fields

Coaches are stored in the [users table](../data/schema.md#users) with additional fields:

| Field | Type | Description |
|-------|------|-------------|
| `is_coach` | boolean | Primary flag - true for coaches |
| `role` | varchar | User role ('coach', 'admin', 'member', 'guest') |
| `coaching_rate` | decimal(10,2) | Hourly rate in MXN |
| `bio` | text | Coach biography/description |
| `specialties` | text[] | Array of coaching specialties |

### Role System

**File:** `lib/roles.ts`

```typescript
export type UserRole = 'admin' | 'coach' | 'member' | 'guest'

export function isCoach(role?: string | null): boolean {
  return role === 'coach'
}

export function hasAdminAccess(role?: string | null): boolean {
  return isAdmin(role) || isCoach(role)  // Coaches have admin access
}
```

### Checking if User is Coach

```typescript
// In components
const { profile } = useAuthStore()
if (profile?.is_coach || profile?.role === 'coach') {
  // Show coach features
}

// In API routes
const { data: user } = await supabase
  .from('users')
  .select('is_coach, role')
  .eq('id', userId)
  .single()

if (!user?.is_coach) {
  return NextResponse.json({ error: 'Not a coach' }, { status: 403 })
}
```

---

## Coach Availability System

The availability system uses three tables working together:

### 1. Weekly Templates

**Table:** `coach_weekly_templates`

Recurring availability patterns that repeat weekly.

| Field | Type | Description |
|-------|------|-------------|
| `coach_id` | uuid | FK to users |
| `day_of_week` | int | 1-7 (Monday=1, Sunday=7) |
| `start_time` | time | Start time (e.g., '09:00') |
| `end_time` | time | End time (e.g., '17:00') |
| `is_active` | boolean | Whether template is active |

**Example:** Coach available Mon/Wed/Fri 9am-5pm:
```sql
INSERT INTO coach_weekly_templates (coach_id, day_of_week, start_time, end_time)
VALUES
  ('coach-uuid', 1, '09:00', '17:00'),  -- Monday
  ('coach-uuid', 3, '09:00', '17:00'),  -- Wednesday
  ('coach-uuid', 5, '09:00', '17:00');  -- Friday
```

### 2. Generated Availability

**Table:** `coach_availability`

Slots generated from templates, with booking status tracking.

| Field | Type | Description |
|-------|------|-------------|
| `coach_id` | uuid | FK to users |
| `start_time` | timestamptz | Slot start (UTC) |
| `end_time` | timestamptz | Slot end (UTC) |
| `booking_status` | varchar | Status (see below) |
| `generation_week` | date | Which week this was generated for |
| `auto_approved` | boolean | Whether auto-approved |

**Booking statuses:**
- `template_generated` - Just generated from template
- `coach_reviewed` - Coach has reviewed/approved
- `open_for_booking` - Available for players to book
- `past` - Time has passed

### 3. Availability Overrides

**Table:** `coach_availability_overrides`

Exceptions to the weekly template (blocks, vacations).

| Field | Type | Description |
|-------|------|-------------|
| `coach_id` | uuid | FK to users |
| `override_date` | date | Date of override |
| `override_type` | varchar | 'time_block' or 'full_day' |
| `start_time` | time | Block start (for time_block) |
| `end_time` | time | Block end (for time_block) |
| `reason` | text | Reason for block |
| `is_active` | boolean | Whether override is active |

### 4. Coach Preferences

**Table:** `coach_preferences`

Settings for automation and notifications.

| Field | Type | Description |
|-------|------|-------------|
| `coach_id` | uuid | FK to users |
| `auto_approve_enabled` | boolean | Auto-approve generated slots |
| `vacation_mode` | boolean | Disable generation during vacation |
| `vacation_start` | date | Vacation start date |
| `vacation_end` | date | Vacation end date |
| `notification_email` | varchar | Email for notifications |
| `notification_preferences` | jsonb | Notification settings |

---

## Coach Dashboard

**URL:** `/coach-dashboard`
**File:** `app/coach-dashboard/page.tsx`

### Three Tabs

#### 1. Weekly Template Tab
**Component:** `components/coach/weekly-template-editor.tsx`

Features:
- Set recurring weekly availability
- Enable/disable each day
- Define time slots (7 AM - 10 PM, 30-min increments)
- Add multiple time slots per day
- Copy schedule between days
- View 5-week ahead preview
- Stats: active days, time blocks, total hours

#### 2. Weekly Schedule Tab
**Component:** `components/coach/daily-schedule-view.tsx`

Features:
- Navigate between weeks
- View current week schedule
- See booked lessons (green)
- See available slots (blue)
- See pending review slots (yellow)
- See blocked times (red)
- Create/delete time overrides
- Weekly stats: lessons, available slots, pending, blocked

#### 3. Settings Tab
**Component:** `components/coach/coach-preferences.tsx`

Features:
- Auto-approval toggle
- Vacation mode toggle
- Vacation date range picker
- Notification email
- Notification preferences (generation, reminders, auto-approval)

---

## Setting Availability (Coach Flow)

### 1. Create Weekly Template

```typescript
// POST /api/coaches/[id]/template
{
  templates: [
    { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
    { day_of_week: 1, start_time: '14:00', end_time: '17:00' },
    { day_of_week: 3, start_time: '09:00', end_time: '17:00' }
  ]
}
```

### 2. Create Overrides (Block Time)

```typescript
// POST /api/coaches/[id]/overrides

// Time block (specific hours)
{
  override_date: '2025-01-15',
  override_type: 'time_block',
  start_time: '12:00',
  end_time: '14:00',
  reason: 'Lunch meeting'
}

// Full day block
{
  override_date: '2025-01-20',
  override_type: 'full_day',
  reason: 'Personal day'
}
```

### 3. Availability Generation (Automated)

A cron job runs weekly to generate availability from templates:

**Endpoint:** `GET /api/coaches/availability/generate-weekly`

1. Gets all coaches with active templates
2. For each coach (not in vacation mode):
   - Generates slots for the next 5 weeks
   - Creates `coach_availability` records
   - Status = `template_generated` (or `open_for_booking` if auto-approve)
3. Excludes dates with overrides

### 4. Auto-Approval (Automated)

**Endpoint:** `GET /api/coaches/availability/auto-approve`

For coaches with `auto_approve_enabled`:
- Changes `template_generated` → `open_for_booking`

---

## Lesson Booking (Player Flow)

### How Availability is Used

When a player books a lesson on [/lessons](../pages/lessons.md):

**1. Get Available Slots**

```typescript
// GET /api/lessons/availability?date=2025-01-15&coach_id=xxx&duration=60
```

The API:
- Generates 30-minute slots from 6 AM - 10 PM (Mexico City time)
- Checks coach has availability window covering the slot
- Excludes slots with existing lessons
- "Setup mode": If coach has NO availability records, all slots available

**Response:**
```typescript
{
  time_slots: [
    {
      time: '09:00',           // Local time display
      start_time_utc: '...',   // For booking
      available: true,
      coach_id: 'xxx',
      coach_name: 'John Doe',
      rate: 500                // MXN per hour
    }
  ]
}
```

**2. Book Lesson**

```typescript
// POST /api/lessons/book
{
  coach_id: 'xxx',
  start_time: '2025-01-15T15:00:00Z',
  duration: 60,
  court_id: 'yyy'
}
```

**Validations:**
1. Coach exists and `is_coach=true`
2. Coach has availability covering requested time
3. No conflicting lessons for coach
4. No conflicting court bookings
5. User has signed [waiver](../core_concepts/waiver.md)

**Creates:**
- Event record (lesson type)
- Event registration
- Payment record (pending)
- Event-court association

---

## How Coaches See Booked Lessons

The **Daily Schedule View** shows lessons:

```typescript
// Query in daily-schedule-view.tsx
const { data: lessons } = await supabase
  .from('events')
  .select(`
    *,
    event_types(name),
    event_registrations(
      participant_first_name,
      participant_last_initial
    ),
    event_courts(court:courts(name))
  `)
  .eq('coach_id', coachId)
  .gte('start_time', weekStart)
  .lte('start_time', weekEnd)
  .is('deleted_at', null)
```

Displays:
- Lesson time and duration
- Student name (from denormalized [participant fields](../data/rls_policies.md#participant-fields-pattern))
- Court assigned
- Lesson cost
- Green color coding

---

## Coach API Routes

### Coach Management

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/coaches` | GET | List all coaches |
| `/api/coaches` | POST | Create coach (admin) |
| `/api/coaches/[id]` | GET | Get coach details |
| `/api/coaches/[id]` | PUT | Update coach |
| `/api/coaches/[id]` | DELETE | Remove coach status |

### Templates

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/coaches/[id]/template` | GET | Get weekly template |
| `/api/coaches/[id]/template` | POST | Save weekly template |
| `/api/coaches/[id]/template` | DELETE | Clear template |

### Overrides

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/coaches/[id]/overrides` | GET | Get overrides |
| `/api/coaches/[id]/overrides` | POST | Create override |
| `/api/coaches/[id]/overrides/[overrideId]` | PUT | Update override |
| `/api/coaches/[id]/overrides/[overrideId]` | DELETE | Delete override |

### Availability

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/coaches/[id]/availability` | GET | Get availability slots |
| `/api/coaches/[id]/availability/review` | GET | Get slots for review |
| `/api/coaches/[id]/availability/review` | PUT | Approve slots |

### Lesson Booking

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/lessons/availability` | GET | Get bookable slots |
| `/api/lessons/book` | POST | Book a lesson |

### Automation (Cron)

| Route | Purpose |
|-------|---------|
| `/api/coaches/availability/generate-weekly` | Generate from templates |
| `/api/coaches/availability/auto-approve` | Auto-approve pending |
| `/api/coaches/availability/send-reminders` | Send notifications |

---

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| WeeklyTemplateEditor | `components/coach/weekly-template-editor.tsx` | Set recurring availability |
| DailyScheduleView | `components/coach/daily-schedule-view.tsx` | View/manage schedule |
| CoachPreferences | `components/coach/coach-preferences.tsx` | Coach settings |
| LessonBookingWizard | `components/lesson-booking-wizard.tsx` | Player booking flow |

---

## Database Relationships

```
users (is_coach=true)
├── coach_weekly_templates (recurring schedule)
├── coach_availability (generated slots)
├── coach_availability_overrides (blocks/exceptions)
├── coach_preferences (settings)
└── events (lessons where coach_id = user.id)
    ├── event_registrations (students)
    ├── event_courts (assigned courts)
    └── payments (lesson payments)
```

---

## Related Documentation

- [../pages/lessons.md](../pages/lessons.md) - Lesson booking page
- [../pages/play.md](../pages/play.md) - Play page (also has lesson booking)
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Lesson pricing
- [../core_concepts/waiver.md](../core_concepts/waiver.md) - Required before booking
- [../data/schema.md](../data/schema.md) - Database tables
- [../data/rls_policies.md](../data/rls_policies.md) - Participant fields pattern
- [../integrations/supabase.md](../integrations/supabase.md) - Database client usage
- [./player.md](./player.md) - Player lesson booking journey
