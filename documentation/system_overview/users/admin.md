# Admin/Staff User Journey

This document covers the admin experience and management functionality.

## Overview

Admins and staff manage day-to-day operations at the club. They need to:
- View and manage court schedules
- Create, edit, and delete events
- Manage users (registrations, memberships)
- Process walk-in payments
- Handle customer service issues

## Admin Access

Admins have `role = 'admin'` or `role = 'staff'` in the users table.

**Checking admin access:**
```typescript
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('id', userId)
  .single()

const isAdmin = user?.role === 'admin' || user?.role === 'staff'
```

---

## Key Pages

### `/admin` - Admin Dashboard
**File:** `app/admin/page.tsx`

Main admin interface showing:
- Court grid (what's happening on each court)
- Quick stats (registrations, revenue)
- Navigation to sub-pages

### `/admin/events` - Event Management
Create, edit, delete events:
- Set event details (name, time, capacity)
- Set pricing and skill level
- Assign courts
- View registrations

### `/admin/users` - User Management
**Note:** Currently partially broken.

Intended functionality:
- Search/browse users
- View user details
- Add users to events
- Manage memberships
- Have users sign waivers

---

## Court Grid

The admin dashboard shows a real-time view of all courts:

```
┌─────────────────────────────────────────────┐
│         9:00   10:00   11:00   12:00        │
├─────────────────────────────────────────────┤
│ Court 1 │ Reta │      Open Play      │ Free │
│ Court 2 │ Free │ Reservation │ Free │ Free │
│ Court 3 │     Lesson (Coach Maria)    │ Free │
│ Court 4 │ Free │ Free │ Round Robin │ Free │
└─────────────────────────────────────────────┘
```

Clicking a slot allows:
- Creating new events
- Viewing event details
- Adding walk-in registrations

---

## Event Management

### Creating Events

1. Navigate to `/admin/events`
2. Click "Create Event"
3. Fill in details:
   - Name
   - Event type (Reta, Round Robin, etc.)
   - Date/time
   - Duration
   - Capacity
   - Skill level
   - Court assignment
   - Description (EN/ES)
   - Price (or use event type default)
   - DUPR requirements (optional)

### Recurring Events

Can create recurring event series:
- Daily, weekly, or monthly
- Specify days of week
- Set end date
- All instances linked via `recurring_event_id`

### Event Types

Managed in database (`event_types` table):

| Type | Display on Calendar | Purpose |
|------|-------------------|---------|
| Reta | Yes | Open play sessions |
| Round Robin | Yes | Organized play |
| Court Reservation | No | Player reservations |
| Lesson | No | Coach lessons |
| Tournament | Yes | Special events |

`display_event = false` hides type from public calendar.

---

## User Operations

### Walk-in Registration

When a player walks in without pre-registering:

1. Admin finds the event on court grid
2. Clicks event to open details
3. Searches for user (or creates new)
4. Adds user to event registration
5. Processes payment

### Managing Memberships

1. Find user in admin panel
2. View membership status
3. Add/modify/cancel membership
4. Process payment if needed

### Waiver Management

If user hasn't signed waiver:
1. Admin can show waiver on tablet
2. User reads and signs
3. Admin updates `has_signed_waiver = true`

---

## Admin API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/admin/users` | List users |
| `GET /api/admin/users/[id]` | Get user details |
| `POST /api/admin/events` | Create event |
| `PUT /api/admin/events/[id]` | Update event |
| `DELETE /api/admin/events/[id]` | Delete event |
| `POST /api/admin/registrations` | Add registration |

---

## Permissions

### Role Hierarchy

| Role | Capabilities |
|------|-------------|
| `user` | Standard player access |
| `staff` | Admin panel access, limited actions |
| `admin` | Full admin access |

### RLS for Admin

Admin operations typically use the service role client to bypass RLS:

```typescript
const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Common Operations

### Add User to Event

```typescript
await adminClient
  .from('event_registrations')
  .insert({
    event_id: eventId,
    user_id: userId,
    participant_first_name: user.first_name,
    participant_last_initial: user.last_name?.charAt(0),
    created_at: new Date().toISOString()
  })
```

### Cancel Registration

```typescript
await adminClient
  .from('event_registrations')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', registrationId)
```

### Create Event

```typescript
await adminClient
  .from('events')
  .insert({
    name: 'Open Play',
    event_type_id: eventTypeId,
    start_time: startTime,
    end_time: endTime,
    capacity: 16,
    location_id: locationId,
    created_by: adminUserId,
    // ...
  })
```

---

## Missing Functionality

- [ ] Users page not working properly
- [ ] Bulk operations on events
- [ ] Drag-and-drop event scheduling
- [ ] Revenue reports
- [ ] Attendance tracking
- [ ] Refund processing
- [ ] Email templates management

---

## Related Documentation

- [../data/schema.md](../data/schema.md) - Database tables
- [../data/rls_policies.md](../data/rls_policies.md) - Security policies
- [../integrations/supabase.md](../integrations/supabase.md) - Admin client usage
