# Event Registration API

This document covers the API endpoints for registering users for events, including the critical participant fields pattern.

## Overview

There are two main registration endpoints:

| Endpoint | File | Used By |
|----------|------|---------|
| `POST /api/play/book` | `app/api/play/book/route.ts` | Event modal on /calendar page |
| `POST /api/events/register` | `app/api/events/register/route.ts` | Alternative registration flow |

Both endpoints serve similar purposes but have slightly different implementations. `/api/play/book` is the primary endpoint used by the frontend.

---

## POST /api/play/book

**File:** `apps/web/app/api/play/book/route.ts`

### Request

```typescript
{
  type: string,              // Event type (e.g., "open_play", "round_robin")
  eventId: string,           // UUID of the event
  locationId: number,        // Location ID
  recurringRegistration?: boolean,  // Register for future events in series
}
```

**Note:** `type` of "court", "lesson", or "reservation" is blocked - those use different flows.

### Authentication

JWT token in `Authorization: Bearer <token>` header or via cookies.

### Response

**Success:**
```json
{ "success": true }
```

**Error:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",  // Optional
  // Additional context fields
}
```

### Flow

```
1. Extract JWT and verify user
         │
         ▼
2. Validate request body with Zod
         │
         ▼
3. Block court/lesson/reservation types
         │
         ▼
4. Parallel validation checks:
   ├── Event exists and is valid
   ├── Check capacity (not full)
   └── Check user not already registered
         │
         ▼
5. Check DUPR requirements (if applicable)
   ├── Get user's DUPR data (admin client)
   ├── Check DUPR link status
   └── Verify entitlements via DUPR API
         │
         ▼
6. Get user's name (admin client)
         │
         ▼
7. Insert registration with participant fields (admin client)
         │
         ▼
8. Return success
```

### Critical Code: Participant Fields

**Location:** Lines 249-280

```typescript
// Get user's name for participant display fields
const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: userData, error: userDataError } = await adminClient
  .from('users')
  .select('first_name, last_name')
  .eq('id', user.id)
  .single();

if (userDataError) {
  console.error('Error fetching user data for registration:', userDataError);
  throw new Error('Failed to fetch user data');
}

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

**Why admin client?**
1. Need to read user's name from users table (RLS would block reading other users)
2. Need to write registration that other users can read (with denormalized name fields)

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| - | 401 | Not authenticated |
| - | 400 | Court/lesson/reservation type blocked |
| `DUPR_NOT_LINKED` | 403 | User hasn't linked DUPR account |
| `DUPR_TOKEN_EXPIRED` | 403 | DUPR OAuth token expired |
| `INSUFFICIENT_ENTITLEMENTS` | 403 | User lacks required DUPR+ or Verified |
| `DUPR_CHECK_FAILED` | 500 | Error checking DUPR API |
| - | 500 | Generic error (event not found, full, already registered, etc.) |

---

## POST /api/events/register

**File:** `apps/web/app/api/events/register/route.ts`

### Request

```typescript
{
  eventId: string,  // UUID of the event
  userId: string,   // UUID of the user to register
}
```

### Flow

Similar to `/api/play/book` but:
1. Uses `createAdminClient()` from supabase-server (async, with cookies)
2. Checks waiver status (`has_signed_waiver`)
3. Sends notification after successful registration
4. Returns the registration object

### Key Differences from /api/play/book

| Aspect | /api/play/book | /api/events/register |
|--------|----------------|---------------------|
| Auth | JWT in header | Trusts provided userId |
| Admin client | Inline `createClient()` | `createAdminClient()` |
| Waiver check | No | Yes |
| Notification | No | Yes (via /api/notify) |
| Response | `{ success: true }` | `{ registration: {...} }` |

---

## How Participant Names Are Displayed

### At Registration Time (Write)

Both endpoints populate `participant_first_name` and `participant_last_initial`:

```typescript
.insert({
  event_id: eventId,
  user_id: user.id,
  participant_first_name: userData?.first_name || 'Unknown',
  participant_last_initial: userData?.last_name?.charAt(0) || '?',
})
```

### At Display Time (Read)

**File:** `apps/web/app/api/calendar/route.ts:133-143`

```typescript
participants: (event.event_registrations || [])
  .filter((reg: any) =>
    !reg.deleted_at &&
    reg.participant_first_name &&
    reg.participant_last_initial
  )
  .map((reg: any) => ({
    userId: reg.user_id,
    firstName: reg.participant_first_name,
    lastInitial: reg.participant_last_initial,
    // DUPR ratings from joined user data
    duprSinglesRating: reg.user?.dupr_singles_rating || null,
    // ...
  })),
```

**Important:** The filter requires both `participant_first_name` AND `participant_last_initial`. Registrations without these fields won't show in the participant list.

---

## Debugging Registration Issues

### Symptoms and Causes

| Symptom | Likely Cause |
|---------|--------------|
| 500 error on registration | Using user client instead of admin client for insert |
| Registration succeeds but name doesn't show | `participant_first_name/last_initial` not populated |
| "Already registered" error | Existing registration (check `deleted_at` filter) |
| "Event is full" error | Capacity reached |
| DUPR errors | Token expired or user not linked |

### Checking Registration Data

```sql
-- Check if registration exists with participant fields
SELECT
  id,
  event_id,
  user_id,
  participant_first_name,
  participant_last_initial,
  deleted_at,
  created_at
FROM event_registrations
WHERE event_id = 'xxx' AND user_id = 'yyy';
```

### Fixing Missing Participant Fields

If registrations exist but names aren't showing, the fields weren't populated. You can backfill:

```sql
-- Backfill participant fields from users table
UPDATE event_registrations er
SET
  participant_first_name = u.first_name,
  participant_last_initial = LEFT(u.last_name, 1)
FROM users u
WHERE er.user_id = u.id
  AND (er.participant_first_name IS NULL OR er.participant_last_initial IS NULL);
```

---

## Related Documentation

- [../data/schema.md](../data/schema.md) - `event_registrations` table structure
- [../data/rls_policies.md](../data/rls_policies.md) - Why we need participant fields
- [../integrations/supabase.md](../integrations/supabase.md) - Admin vs user client patterns
