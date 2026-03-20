# The Pickle Co - Mobile API Reference

> Complete API reference for mobile app development. All endpoints are hosted at `https://www.thepickleco.mx` (production) and `https://staging.thepickleco.mx` (staging).

**Last updated:** 2026-02-01

---

## Table of Contents

1. [Authentication & Sessions](#1-authentication--sessions)
2. [Users & Profiles](#2-users--profiles)
3. [Events & Play](#3-events--play)
4. [Event Registration](#4-event-registration)
5. [Courts & Reservations](#5-courts--reservations)
6. [Memberships](#6-memberships)
7. [Lessons](#7-lessons)
8. [Coaches](#8-coaches)
9. [Payments & Stripe](#9-payments--stripe)
10. [DUPR Integration](#10-dupr-integration)
11. [Locations](#11-locations)
12. [Common Patterns](#12-common-patterns)
13. [Error Reference](#13-error-reference)

---

## Common Headers

Most authenticated endpoints require:

```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

---

## 1. Authentication & Sessions

### POST /api/auth/sign-in

Sign in with email and password. Returns user profile data.

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member",
    "has_signed_waiver": true
  }
}
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | Email and password are required | Missing fields |
| 401 | Invalid email or password | Bad credentials |
| 500 | Failed to fetch user profile | Profile lookup error |

---

### POST /api/auth/logout

Sign out the current user.

**Auth:** Required (Bearer token)

**Request:** Empty body

**Response (200):**
```json
{ "success": true }
```

---

### POST /api/auth/reset-password

Send a password reset email. Always returns success to prevent email enumeration.

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{ "success": true }
```

**Notes:**
- Email is sent in the user's preferred language (EN/ES)
- Always returns `success: true` even if email doesn't exist

---

### GET /api/auth/session

Get the current session.

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "session": { /* Supabase session object */ }
}
```

---

### POST /api/auth/verify

Verify the current session and get enriched user data. This is the recommended endpoint for checking auth state on mobile.

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "member",
    "has_signed_waiver": true
  }
}
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | No session or invalid token |
| 401 | No session found | Expired session |

---

### GET /api/session

Get or create user profile. Auto-provisions new users on first login.

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2025-01-01T00:00:00Z",
    "role": "guest",
    "has_signed_waiver": false
  }
}
```

**Notes:**
- If user profile doesn't exist, it is auto-created with defaults:
  - `role: "guest"`
  - `has_signed_waiver: false`
  - `email_notifications: true`
  - `sms_notifications: false`
  - `whatsapp_notifications: false`
- Sends Slack notification when a new user account is created

---

## 2. Users & Profiles

### GET /api/users/profile

Get the authenticated user's profile.

**Auth:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string (UUID) | Yes | Must match authenticated user |

**Response (200):**
```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+52...",
    "gender": "male",
    "role": "member",
    "created_at": "2025-01-01T00:00:00Z",
    "email_notifications": true,
    "sms_notifications": false,
    "whatsapp_notifications": false,
    "email_verified": true,
    "active_membership": { /* membership object or null */ },
    "membership_history": []
  }
}
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | User ID is required | Missing userId param |
| 401 | Unauthorized | Token invalid or userId mismatch |

---

### PATCH /api/users/profile

Update profile fields.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "userId": "uuid",
  "updates": {
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+52...",
    "gender": "female"
  }
}
```

**Response (200):**
```json
{
  "profile": { /* updated profile object */ }
}
```

**Notes:**
- If `email` is included in updates, the auth email is also updated (with rollback on failure)
- User can only update their own profile

---

### PUT /api/users/profile

Update notification preferences.

**Auth:** Required (Bearer token or cookie)

**Request:**
```json
{
  "userId": "uuid",
  "preferences": {
    "email_notifications": true,
    "sms_notifications": false,
    "whatsapp_notifications": true
  }
}
```

**Response (200):**
```json
{
  "profile": { /* updated profile */ }
}
```

---

### POST /api/users/waiver

Sign the liability waiver. Required before booking events or courts.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response (200):**
```json
{
  "profile": {
    "has_signed_waiver": true
  }
}
```

---

### POST /api/users/avatar

Upload a profile photo.

**Auth:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Request:**
| Field | Type | Constraints |
|-------|------|-------------|
| file | File | JPEG, PNG, or WebP. Max 5MB |

**Response (200):**
```json
{
  "success": true,
  "url": "https://...",
  "path": "user-images/uuid.jpg"
}
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | No file provided | Missing file |
| 400 | Invalid file type | Not JPEG/PNG/WebP |
| 400 | File too large | Exceeds 5MB |

---

### POST /api/users/update-password

Change the authenticated user's password.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "password": "newPassword123"
}
```

**Response (200):**
```json
{ "success": true }
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | Password must be at least 6 characters | Too short |

---

### DELETE /api/users/delete-account

Permanently delete the user's account.

**Auth:** Required (Bearer token or cookie)

**Request:** Empty body

**Response (200):**
```json
{ "success": true }
```

---

### GET /api/users/search

Search for other users by name or email.

**Auth:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| q | string | Yes | Min 2 characters. Searches email, first_name, last_name |

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    }
  ]
}
```

**Notes:**
- Case-insensitive search
- Excludes the authenticated user from results
- Max 10 results, ordered by first_name

---

## 3. Events & Play

### GET /api/play

List events. Supports multiple views.

**Auth:** None (but `user_id` required for `my_registrations` view)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| view | string | `my_registrations` | `spotlight`, `display_events`, or `my_registrations` |
| type | string | `all` | `all`, `lessons`, `courts`, `events` |
| status | string | `all` | `upcoming`, `past`, `cancelled`, `all` |
| limit | number | 10 | Max 100 |
| offset | number | 0 | Pagination offset |
| coach_id | string | - | Filter by coach UUID |
| user_id | string | - | Required for `my_registrations` view |

**Response (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "name": "Open Play - Intermediate",
      "description_en": "...",
      "description_es": "...",
      "event_type_id": "uuid",
      "event_types": [{ "id": "uuid", "name": "Open Play" }],
      "skill_level": "intermediate",
      "start_time": "2025-06-15T10:00:00Z",
      "end_time": "2025-06-15T12:00:00Z",
      "cost_mxn": 150,
      "capacity": 16,
      "spotlight": false,
      "image_path": "...",
      "participants": [
        {
          "userId": "uuid",
          "firstName": "John",
          "lastInitial": "D"
        }
      ]
    }
  ]
}
```

**Views:**
- **`spotlight`** - Public featured events. Cached 5 minutes.
- **`display_events`** - Public events with `display_event=true` on event type. Future events only.
- **`my_registrations`** - Events the user is registered for. Requires `user_id`. Cached 1 minute. Includes `location` and `court_name`.

---

### GET /api/play/event/{eventId}

Get full event details including participants with DUPR ratings.

**Auth:** None

**Response (200):**
```json
{
  "event": {
    "id": "uuid",
    "name": "Open Play - Intermediate",
    "description_en": "...",
    "description_es": "...",
    "skill_level": "intermediate",
    "start_time": "2025-06-15T10:00:00Z",
    "end_time": "2025-06-15T12:00:00Z",
    "cost_mxn": 150,
    "capacity": 16,
    "spotlight": false,
    "private": false,
    "participants": [
      {
        "userId": "uuid",
        "firstName": "John",
        "lastInitial": "D",
        "duprSinglesRating": 4.5,
        "duprSinglesReliability": 0.8,
        "duprDoublesRating": 4.2,
        "duprDoublesReliability": 0.75
      }
    ]
  }
}
```

**Headers:** `Cache-Control: no-store, no-cache, must-revalidate`

---

### GET /api/events/{eventId}

Get event with court and registration details.

**Auth:** None

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Open Play",
  "start_time": "2025-06-15T10:00:00Z",
  "end_time": "2025-06-15T12:00:00Z",
  "cost_mxn": 150,
  "capacity": 16,
  "event_courts": [
    {
      "courts": { "id": "uuid", "name": "Court 1" }
    }
  ],
  "event_registrations": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "users": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

---

### GET /api/events/price

Get event pricing, including membership discounts.

**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| eventTypeId | string (UUID) | Yes | Event type to price |
| userId | string (UUID) | No | For membership-specific pricing |

**Response (200):**
```json
{
  "eventTypeId": "uuid",
  "eventTypeName": "Open Play",
  "basePrice": 200,
  "userPrice": 0,
  "membershipType": "Early Bird",
  "isDiscounted": true,
  "savings": 200
}
```

---

## 4. Event Registration

### POST /api/play/book

**Primary registration endpoint for mobile.** Register for an event with optional payment.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "type": "event",
  "eventId": "uuid",
  "locationId": 1,
  "paymentIntentId": "pi_xxx",
  "recurringRegistration": false,
  "guests": [
    {
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com"
    }
  ]
}
```

**Response (200):**
```json
{ "success": true }
```

**Errors:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | - | Event not found | Invalid eventId |
| 400 | - | Event is full | At capacity |
| 400 | - | Already registered | Duplicate registration |
| 400 | - | Payment failed | Stripe verification failed |
| 401 | - | Not authenticated | Missing/invalid token |
| 403 | DUPR_NOT_LINKED | DUPR not linked | Event requires DUPR |
| 403 | INSUFFICIENT_ENTITLEMENTS | Insufficient entitlements | Event requires DUPR Plus/Verified |
| 403 | DUPR_TOKEN_EXPIRED | DUPR token expired | Need to re-link DUPR |

**Notes:**
- `type` must be `"event"` - `court`, `lesson`, `reservation` are blocked
- Payment verification: amount must match `Math.round(eventPrice * 100)` in centavos
- Re-activates soft-deleted registrations (previously cancelled)
- Sends notification after successful registration

---

### POST /api/events/register

Alternative registration endpoint. Similar to `/api/play/book` but with different auth pattern.

**Auth:** None (but validates waiver via userId lookup)

**Request:**
```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "paymentIntentId": "pi_xxx"
}
```

**Response (200):**
```json
{
  "registration": {
    "id": "uuid",
    "event_id": "uuid",
    "user_id": "uuid",
    "participant_first_name": "John",
    "participant_last_initial": "D",
    "paid": true,
    "price_mxn": 150
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | WAIVER_REQUIRED | Waiver not signed |
| 403 | DUPR_NOT_LINKED | DUPR account not linked |
| 403 | INSUFFICIENT_ENTITLEMENTS | Missing DUPR entitlements |
| 403 | DUPR_TOKEN_EXPIRED | DUPR token expired |
| 404 | - | Event not found |

---

### POST /api/events/unregister

Unregister from an event (soft-delete).

**Auth:** None

**Request:**
```json
{
  "eventId": "uuid",
  "userId": "uuid"
}
```

**Response (200):**
```json
{ "status": "success" }
```

---

### POST /api/events/cancel

Cancel an event registration (soft-delete).

**Auth:** None

**Request:**
```json
{
  "eventId": "uuid",
  "userId": "uuid"
}
```

**Response (200):**
```json
{ "status": "success" }
```

---

### POST /api/play/cancel

Cancel with role-based permissions and cancellation policies.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "event_id": "uuid",
  "reason": "Schedule conflict"
}
```

**Response (200):**
```json
{
  "message": "Registration cancelled",
  "type": "registration_cancelled"
}
```

**Permission rules:**
- **Admin/Coach:** Can cancel entire event + all registrations at any time
- **Participant:** Can cancel only their own registration
- **Lessons:** Require 24-hour advance notice (unless admin)

**Response `type` values:** `lesson_cancelled`, `registration_cancelled`, `reservation_cancelled`

---

## 5. Courts & Reservations

### GET /api/courts

List all courts, optionally filtered by location.

**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| locationId | string | No | Filter by location |

**Response (200):**
```json
{
  "courts": [
    {
      "id": "uuid",
      "name": "Court 1",
      "description": "Outdoor court",
      "location_id": "uuid"
    }
  ],
  "count": 4
}
```

---

### GET /api/courts/availability

Get court availability for a date range.

**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| locationId | string | Yes | Location UUID |
| startDate | string | Yes | YYYY-MM-DD |
| days | number | Yes | Number of days to check |

**Response (200):**
```json
{
  "court-uuid-1": {
    "id": "uuid",
    "name": "Court 1",
    "events": [
      {
        "id": "uuid",
        "start_time": "2025-06-15T10:00:00Z",
        "end_time": "2025-06-15T12:00:00Z"
      }
    ]
  }
}
```

**Notes:** Response is keyed by court ID. Each court contains its booked events for the date range.

---

### POST /api/reserve-court

**Primary court reservation endpoint for mobile.** Full flow with payment handling.

**Auth:** Required (Bearer token)

**Request (Step 1 - Get price):**
```json
{
  "courtId": "uuid",
  "date": "2025-06-15",
  "startTime": "10:00",
  "endTime": "12:00"
}
```

**Response (200 - Payment required):**
```json
{
  "requirePayment": true,
  "cost": 500,
  "hasMembership": false,
  "eventDetails": {
    "courtId": "uuid",
    "date": "2025-06-15",
    "startTime": "10:00",
    "endTime": "12:00",
    "userId": "uuid"
  }
}
```

**Request (Step 2 - With payment):**
```json
{
  "courtId": "uuid",
  "date": "2025-06-15",
  "startTime": "10:00",
  "endTime": "12:00",
  "paymentIntentId": "pi_xxx"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "event": {
    "id": "uuid",
    "name": "Court Reservation",
    "start_time": "2025-06-15T16:00:00Z",
    "end_time": "2025-06-15T18:00:00Z"
  }
}
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | Missing required fields | courtId, date, startTime, or endTime missing |
| 400 | Cannot book courts before location opened | Location not yet open |
| 400 | This court is not yet available for booking | Court `is_active` is false |
| 400 | Court is not open on this day | Outside operating hours |
| 400 | Reservation time is outside court operating hours | Time outside hours |
| 400 | Court is already reserved for this time slot | Conflict |
| 400 | Payment has not been completed | paymentIntentId not succeeded |
| 400 | Payment amount does not match reservation cost | Amount mismatch |
| 403 | Waiver not signed (`requireWaiver: true`) | Need waiver |

**Notes:**
- Times are in **Mexico City local time** (America/Mexico_City). Stored as UTC.
- Members may get free reservations (cost = 0, no payment needed)
- Creates event + event_courts + event_registration atomically

---

### POST /api/courts/reserve

Get reservation pricing only (does not create the reservation).

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "courtId": "uuid",
  "date": "2025-06-15",
  "startTime": "10:00",
  "endTime": "12:00"
}
```

**Response (200):**
```json
{
  "success": true,
  "requirePayment": true,
  "cost": 500,
  "eventDetails": {
    "courtId": "uuid",
    "date": "2025-06-15",
    "startTime": "10:00",
    "endTime": "12:00",
    "userId": "uuid"
  }
}
```

---

### GET /api/reservations

List all display events with full details (participants, courts, DUPR ratings).

**Auth:** None

**Response (200):** Array of event objects with participants, courts, DUPR data. Only returns future events with `display_event=true`.

---

### POST /api/reservations/cancel

Cancel a reservation (soft-delete).

**Auth:** None (userId in body)

**Request:**
```json
{
  "userId": "uuid",
  "reservationId": "uuid"
}
```

**Response (200):**
```json
{ "status": "success" }
```

---

### GET /api/calendar

Alias for GET /api/reservations. Returns event data for calendar views.

---

## 6. Memberships

### GET /api/membership/types

List all available membership types.

**Auth:** None

**Response (200):**
```json
{
  "membershipTypes": [
    {
      "id": "uuid",
      "name": "Early Bird",
      "cost_mxn": 2500,
      "description": "Founding member rate"
    }
  ]
}
```

**Notes:** Ordered by `cost_mxn` ascending. Excludes soft-deleted types.

---

### POST /api/membership/activate

Activate a membership for a user.

**Auth:** Required (Bearer token or cookie)

**Request:**
```json
{
  "userId": "uuid",
  "locationId": "uuid",
  "membershipType": "Early Bird"
}
```

**Response (200):**
```json
{ "success": true }
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | Missing required fields | userId, locationId, or membershipType missing |
| 401 | Unauthorized | userId doesn't match authenticated user |
| 404 | Location/membership type not found | Invalid IDs |

**Side Effects:**
- Creates/upserts membership record with `status: 'active'`
- Updates user role to `'member'`
- Sends Slack notification

---

### GET /api/membership/history

Get membership history for a user.

**Auth:** None (uses admin client)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User UUID |

**Response (200):**
```json
[
  {
    "id": "uuid",
    "type": {
      "name": "Early Bird",
      "description": "Founding member rate"
    },
    "status": "active",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": null,
    "stripeSubscriptionId": "sub_xxx"
  }
]
```

---

### GET /api/membership/user-data

Get user profile with active membership and payment methods.

**Auth:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | Must match authenticated user |

**Response (200):**
```json
{
  "profile": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "member",
    "membership": {
      "id": "uuid",
      "status": "active",
      "start_date": "2025-01-01",
      "end_date": null,
      "type": { "id": "1", "name": "Early Bird", "description": "..." },
      "location": { "id": 1, "name": "Main Location" }
    }
  },
  "paymentMethods": [
    {
      "id": "pm_xxx",
      "last4": "4242",
      "brand": "visa",
      "exp_month": 12,
      "exp_year": 2026
    }
  ]
}
```

---

### GET /api/membership/location

Get the user's active membership with location info.

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "membership": {
    "id": "uuid",
    "location_id": "uuid",
    "membership_types": [{ "id": 1, "name": "Early Bird" }]
  }
}
```

**Notes:** Returns `null` membership if no active membership exists. Only returns memberships where `status='active'`, `start_date < now`, and (`end_date > now` OR `end_date IS NULL`).

---

## 7. Lessons

### GET /api/lessons

List lessons with role-based filtering.

**Auth:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | `all` | `upcoming`, `past`, `cancelled`, `all` |
| limit | number | 50 | 1-100 |
| offset | number | 0 | Pagination offset |
| coach_id | string | - | Filter by coach UUID |
| user_id | string | - | Admin only: filter by user |

**Response (200):**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "name": "Private Lesson",
      "start_time": "2025-06-15T10:00:00Z",
      "end_time": "2025-06-15T11:00:00Z",
      "status": null,
      "lesson_duration": 1,
      "coach": {
        "id": "uuid",
        "first_name": "Maria",
        "last_name": "Garcia",
        "coaching_rate": 500
      },
      "participants": [
        {
          "id": "uuid",
          "user_id": "uuid",
          "status": "confirmed",
          "user": {
            "id": "uuid",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com"
          }
        }
      ],
      "courts": [
        { "id": "uuid", "name": "Court 1", "location": "Main" }
      ]
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0,
  "status": "all"
}
```

**Role-based access:**
- **Admin:** Sees all lessons, can filter by `coach_id` and `user_id`
- **Coach:** Sees only their own lessons
- **User:** Sees only lessons they are registered for

---

### GET /api/lessons/availability

Get available time slots for booking a lesson.

**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| date | string (ISO 8601) | - | **Required.** Date to check |
| coach_id | string | - | Coach UUID or `"any"` |
| duration | number | 60 | Minutes (30-180) |

**Response (200):**
```json
{
  "date": "2025-06-15",
  "duration": 60,
  "coach_id": "uuid",
  "time_slots": [
    {
      "time": "10:00",
      "start_time_utc": "2025-06-15T16:00:00Z",
      "available": true,
      "coach_id": "uuid",
      "coach_name": "Maria Garcia",
      "rate": 500
    }
  ]
}
```

**When `coach_id` is `"any"`:**
```json
{
  "time_slots": [
    {
      "time": "10:00",
      "start_time_utc": "2025-06-15T16:00:00Z",
      "available": true,
      "available_coaches": [
        { "id": "uuid", "name": "Maria Garcia", "rate": 500 }
      ]
    }
  ]
}
```

**Restrictions:**
- Same-day bookings are **not allowed**. Returns `same_day_restriction: true` with a WhatsApp URL.
- Minimum 12-hour advance notice required.
- Cannot book before the location's `opened_at` date.
- Time slots generated from 6 AM - 10 PM local time (Mexico City).

---

### POST /api/lessons/book

Book a lesson.

**Auth:** Required (Bearer token or cookie)

**Request:**
```json
{
  "coach_id": "uuid",
  "start_time": "2025-06-15T16:00:00Z",
  "duration_hours": 1,
  "court_id": "uuid",
  "title": "Private Lesson",
  "description": "Working on volleys",
  "guests": [
    {
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com"
    }
  ]
}
```

**Response (201):**
```json
{
  "lesson": {
    "id": "uuid",
    "name": "Private Lesson",
    "start_time": "2025-06-15T16:00:00Z",
    "end_time": "2025-06-15T17:00:00Z",
    "lesson_duration": 1,
    "cost_mxn": 700,
    "coach": {
      "id": "uuid",
      "first_name": "Maria",
      "last_name": "Garcia",
      "coaching_rate": 500
    },
    "event_courts": [
      {
        "court": {
          "id": "uuid",
          "name": "Court 1",
          "location": { "name": "Main", "address": "..." }
        }
      }
    ]
  },
  "payment_id": "uuid"
}
```

**Pricing breakdown:**
- Court price (base or membership-discounted)
- Coach fee = `coaching_rate * duration_hours`
- Guest fee = `guest_count * 200 MXN * duration_hours`
- **Total = court + coach + guest fees**

**Validation:**
- Coach must exist and be active (`is_coach = true`, not soft-deleted)
- Duration: 0.5 - 4 hours
- Coach must have availability for the requested time
- No conflicting lessons for the coach
- Court must be active and available
- Lesson must fall within court operating hours

---

### GET /api/lessons/{id}

Get lesson details with role-based permissions.

**Auth:** Required (cookie session)

**Response (200):**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "Private Lesson",
    "start_time": "2025-06-15T16:00:00Z",
    "end_time": "2025-06-15T17:00:00Z",
    "status": null,
    "lesson_duration": 1,
    "coach": { "id": "uuid", "first_name": "Maria", "last_name": "Garcia" },
    "participants": [],
    "courts": [],
    "user_registration": {
      "id": "uuid",
      "status": "confirmed",
      "created_at": "2025-06-14T00:00:00Z"
    },
    "permissions": {
      "can_cancel": true,
      "can_edit": false,
      "can_view_participants": false
    }
  }
}
```

**Access control:**
- **Admin/Coach:** Full access, email visible
- **Participant:** Can view, email hidden
- **Others:** 403 Forbidden

---

### DELETE /api/lessons/{id}

Cancel a lesson.

**Auth:** Required (cookie session)

**Response (200):**
```json
{ "message": "Cancelled successfully" }
```

**Cancellation rules:**
- **Admin/Coach:** Can cancel entire lesson at any time
- **Participant:** Can cancel their registration only, must be 24+ hours in advance

---

## 8. Coaches

### GET /api/coaches

List all coaches.

**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| available | string | No | `"true"` to filter by availability |
| start_time | string | No | Start time for availability filter |
| end_time | string | No | End time for availability filter |

**Response (200):**
```json
{
  "coaches": [
    {
      "id": "uuid",
      "first_name": "Maria",
      "last_name": "Garcia",
      "coaching_rate": 500,
      "bio": "10 years experience...",
      "image_path": "...",
      "specialties": ["doubles", "beginners"],
      "dupr_singles_rating": 5.0,
      "dupr_doubles_rating": 4.8
    }
  ]
}
```

---

### GET /api/coaches/{id}

Get a single coach's profile.

**Auth:** None

**Response (200):**
```json
{
  "coach": {
    "id": "uuid",
    "first_name": "Maria",
    "last_name": "Garcia",
    "coaching_rate": 500,
    "bio": "...",
    "specialties": ["doubles"],
    "is_coach": true
  }
}
```

---

## 9. Payments & Stripe

### POST /api/stripe/create-payment-intent

Create a Stripe payment intent for event registration, court reservation, membership, or lesson.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "amount": 15000,
  "currency": "mxn",
  "paymentMethodId": "pm_xxx",
  "metadata": {
    "type": "event_registration",
    "eventId": "uuid"
  }
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 15000,
  "currency": "mxn",
  "status": "requires_confirmation"
}
```

**Notes:**
- Amount is in **centavos** (e.g., 15000 = $150 MXN)
- **Mobile flow:** Include `paymentMethodId` - uses manual `confirmation_method`
- **Web flow:** Omit `paymentMethodId` - uses automatic confirmation with `setup_future_usage`
- Creates Stripe customer automatically if needed

---

### POST /api/stripe/confirm-payment

Confirm a payment intent or create + confirm in one step.

**Auth:** Required (Bearer token)

**Request (Confirm existing):**
```json
{
  "paymentIntentId": "pi_xxx"
}
```

**Request (Create + confirm):**
```json
{
  "paymentMethodId": "pm_xxx",
  "amount": 15000,
  "currency": "mxn",
  "eventTypeId": "uuid",
  "metadata": {
    "userId": "uuid",
    "type": "event_registration",
    "eventId": "uuid"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "payment": {
    "id": "pi_xxx",
    "status": "succeeded",
    "amount": 15000,
    "currency": "mxn",
    "metadata": {}
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | PRICE_MISMATCH | Price validation failed. Please refresh and try again. |

**Metadata `type` values:** `membership`, `event_registration`, `court_reservation`, `lesson`, `pro_shop`

---

### GET /api/stripe/payment-methods

List saved payment methods.

**Auth:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| userId | string | Yes |

**Response (200):**
```json
{
  "paymentMethods": [
    {
      "id": "pm_xxx",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2026
      },
      "is_default": true
    }
  ]
}
```

---

### POST /api/stripe/payment-methods

Save a new payment method.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "userId": "uuid",
  "paymentMethodId": "pm_xxx"
}
```

**Response (200):**
```json
{
  "paymentMethod": {
    "id": "pm_xxx",
    "type": "card",
    "last4": "4242",
    "expiry": "12/26"
  }
}
```

---

### DELETE /api/stripe/payment-methods

Remove a saved payment method.

**Auth:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| paymentMethodId | string | Yes |

**Response (200):**
```json
{ "success": true }
```

---

### POST /api/stripe/setup-intent

Create a Stripe SetupIntent for saving a card without immediate payment.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "client_secret": "seti_xxx_secret_xxx",
  "setup_intent_id": "seti_xxx",
  "customer_id": "cus_xxx",
  "status": "requires_payment_method"
}
```

---

### GET /api/stripe/payment-history

Get payment history combining Stripe charges and pro shop orders.

**Auth:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| userId | string | Yes |

**Response (200):**
```json
{
  "payments": [
    {
      "id": "pi_xxx",
      "amount": 15000,
      "currency": "mxn",
      "status": "succeeded",
      "created": 1718400000,
      "description": "Event registration",
      "metadata": {},
      "receipt_url": "https://...",
      "invoice": {
        "id": "inv_xxx",
        "number": "INV-0001",
        "pdf": "https://..."
      }
    }
  ],
  "totalPayments": 5,
  "totalAmount": 75000
}
```

**Notes:**
- Amounts in **centavos**
- `created` is Unix timestamp
- Combines Stripe payment intents + invoices + pro shop orders
- Sorted newest first
- Up to 100 entries per type

---

### GET /api/stripe/invoice/{invoiceId}/pdf

Download an invoice PDF.

**Auth:** Required (Bearer token)

**Response:** Binary PDF with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-INV-0001.pdf"
```

**Notes:** Verifies the invoice belongs to the authenticated user's Stripe customer.

---

### GET /api/stripe/verify-mode

Check if Stripe is in test or live mode.

**Auth:** None

**Response (200):**
```json
{
  "success": true,
  "stripeMode": "LIVE",
  "isLiveMode": true,
  "environment": {
    "USE_TEST_STRIPE": "false",
    "NODE_ENV": "production"
  }
}
```

---

## 10. DUPR Integration

### GET /api/dupr/status

Get the user's DUPR link status and ratings.

**Auth:** Required (Bearer token)

**Response (200 - Linked):**
```json
{
  "linked": true,
  "duprId": "12345",
  "linkedAt": "2025-01-01T00:00:00Z",
  "ratings": {
    "singlesRating": 4.5,
    "singlesReliability": 0.8,
    "doublesRating": 4.2,
    "doublesReliability": 0.75
  },
  "updatedAt": "2025-06-15T00:00:00Z",
  "syncStatus": "synced"
}
```

**Headers:** `Cache-Control: no-store, must-revalidate`

---

### POST /api/dupr/link-oauth

Link a DUPR account via OAuth tokens.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "duprId": "12345",
  "userToken": "oauth_access_token",
  "refreshToken": "oauth_refresh_token",
  "stats": {
    "singlesRating": 4.5,
    "singlesReliability": 0.8,
    "doublesRating": 4.2,
    "doublesReliability": 0.75
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "DUPR account linked successfully via OAuth"
}
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | Missing required fields | duprId, userToken, or refreshToken missing |
| 409 | Conflict | DUPR account already linked to another user |

**Notes:** Tokens stored with 50-minute expiry.

---

### POST /api/dupr/unlink

Unlink a DUPR account.

**Auth:** Required (Bearer token)

**Request:** Empty body

**Response (200):**
```json
{
  "success": true,
  "message": "DUPR account unlinked successfully"
}
```

---

### GET /api/dupr/entitlements

Check DUPR subscription entitlements.

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "success": true,
  "hasDuprPlus": true,
  "isDuprVerified": false,
  "hasFreeTier": false,
  "entitlements": ["DUPR_PLUS"]
}
```

**Notes:** Returns empty entitlements with message if token expired.

---

### POST /api/dupr/sync

Sync latest DUPR ratings.

**Auth:** Required (Bearer token)

**Request:** Empty body

**Response (200):**
```json
{
  "success": true,
  "message": "Ratings synced successfully",
  "ratings": {
    "singlesRating": 4.5,
    "singlesReliability": 0.8,
    "doublesRating": 4.2,
    "doublesReliability": 0.75
  }
}
```

**Errors:**
| Status | Message | Cause |
|--------|---------|-------|
| 400 | No DUPR account linked | Need to link first |

---

### GET /api/dupr/clubs/my-memberships

Get the user's DUPR club memberships.

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "success": true,
  "memberships": [
    {
      "clubId": 123,
      "clubName": "The Pickle Co",
      "role": "PLAYER",
      "canManage": false
    }
  ]
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | - | DUPR account not linked |
| 403 | DUPR_TOKEN_EXPIRED | DUPR token expired |

---

### POST /api/dupr/matches/create

Submit a match result to DUPR.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "matchType": "doubles",
  "winnerTeam": {
    "player1DuprId": "12345",
    "player2DuprId": "67890"
  },
  "loserTeam": {
    "player1DuprId": "11111",
    "player2DuprId": "22222"
  },
  "scores": [
    { "winnerScore": 11, "loserScore": 5 },
    { "winnerScore": 11, "loserScore": 8 }
  ],
  "matchDate": "2025-06-15T16:00:00Z",
  "eventId": "uuid",
  "location": "The Pickle Co",
  "notes": "Tournament final"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Match created and submitted to DUPR successfully",
  "matchId": "uuid",
  "duprMatchId": "12345",
  "duprMatchCode": "ABC123",
  "duprHashedMatchCode": "xyz..."
}
```

**Notes:**
- For `singles`: only `player1DuprId` per team (no `player2DuprId`)
- For `doubles`: both `player1DuprId` and `player2DuprId` required

---

## 11. Locations

### GET /api/locations

List all locations.

**Auth:** None

**Response (200):**
```json
{
  "locations": [
    {
      "id": "uuid",
      "name": "The Pickle Co - Main"
    }
  ]
}
```

**Notes:** Alphabetically ordered. Excludes soft-deleted locations.

---

## 12. Common Patterns

### Authentication

Most endpoints accept a Bearer token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

Some endpoints also accept cookie-based sessions (primarily for web). For mobile, always use Bearer tokens.

### Soft Deletes

Records are never hard-deleted. A `deleted_at` timestamp is set instead. All queries filter by `deleted_at IS NULL` unless specifically accessing deleted records.

### Timezone

All times are stored in UTC. Court reservation endpoints (`/api/reserve-court`) accept **Mexico City local time** and convert to UTC. Lesson availability returns times in local HH:MM format with UTC equivalents.

**Timezone:** `America/Mexico_City`

### Pagination

Endpoints that support pagination use `limit` and `offset` query parameters:

```
GET /api/lessons?limit=10&offset=20
```

### DUPR Entitlement Checks

Some events require DUPR entitlements. When registering, the API checks:
- `requires_dupr_plus` - Requires DUPR Plus subscription
- `requires_dupr_verified` - Requires verified DUPR rating

If the check fails, a 403 is returned with codes: `DUPR_NOT_LINKED`, `INSUFFICIENT_ENTITLEMENTS`, or `DUPR_TOKEN_EXPIRED`.

### Waiver Requirement

Users must sign the waiver before:
- Registering for events
- Reserving courts
- Booking lessons

The waiver is signed via `POST /api/users/waiver`. Check `has_signed_waiver` on the user profile.

### Payment Flow (Mobile)

1. **Create payment intent:** `POST /api/stripe/create-payment-intent` with `paymentMethodId` for mobile flow
2. **Confirm payment:** Use Stripe React Native SDK or `POST /api/stripe/confirm-payment`
3. **Complete booking:** Pass `paymentIntentId` to the booking endpoint (`/api/play/book`, `/api/reserve-court`, etc.)

For free events or members with free access, skip steps 1-2 and call the booking endpoint without `paymentIntentId`.

---

## 13. Error Reference

### Standard Error Shape

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": "Additional context (optional)"
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| WAIVER_REQUIRED | 403 | User must sign waiver first |
| INSUFFICIENT_ENTITLEMENTS | 403 | Event requires DUPR Plus or Verified |
| DUPR_TOKEN_EXPIRED | 403 | DUPR OAuth token expired, re-link needed |
| PRICE_MISMATCH | 400 | Server-side price doesn't match submitted amount |

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created (lessons, registrations) |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden / insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate DUPR link) |
| 500 | Server error |
