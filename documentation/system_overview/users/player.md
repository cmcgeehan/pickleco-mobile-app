# Player User Journey

This document covers the player experience - our primary user type.

## Overview

Players are people who want to play pickleball. Their goals:
- Find and join events (open play, round robins, tournaments)
- Reserve courts to play with friends
- Book lessons with coaches
- Purchase memberships for discounts

## Player Capabilities

| Action | Where | Payment |
|--------|-------|---------|
| Browse events | /calendar | Free |
| Register for events | /calendar (modal) | Per event pricing |
| Reserve courts | /play | Per reservation |
| Book lessons | /lessons | Court + coach rate |
| Buy membership | /membership | Monthly subscription |
| Link DUPR account | /account | Free |
| View bookings | /play | Free |
| Sign waiver | /account | Free (required) |

---

## Key Pages

### `/play` - Booking Hub
**File:** `app/play/page.tsx`

The player's home base showing:
- Featured/upcoming events
- Their upcoming reservations
- Quick actions (reserve court, book lesson)

### `/calendar` - Event Calendar
**File:** `app/calendar/page.tsx`

Browse all events:
- Filter by date
- Filter by skill level
- Click event to see details/register

**Event modal shows:**
- Event name, time, description
- Price (adjusted for membership)
- Current participants (with DUPR ratings)
- Register/unregister buttons

### `/membership` - Membership Purchase
**File:** `app/membership/page.tsx`

- View membership tiers and pricing
- Compare benefits
- Purchase/manage subscription

### `/account` - Account Settings
**File:** `app/account/page.tsx`

Sub-pages:
- Profile info (name, email, phone)
- DUPR account linking
- Waiver signing
- Notification preferences
- Payment methods

### `/lessons` - Lesson Booking
**File:** `app/lessons/page.tsx`

- View available coaches
- See coach availability
- Book lesson slots

---

## Registration Flow

### Prerequisites
1. User must be logged in
2. User must have signed waiver (`has_signed_waiver = true`)

### Event Registration
```
1. Player browses /calendar
2. Clicks on event → modal opens
3. Modal shows event details and price
4. Player clicks "Register"
5. API call to /api/play/book
6. System validates:
   - User authenticated
   - Waiver signed
   - Event not full
   - Not already registered
   - DUPR requirements met (if any)
7. Registration created with participant_* fields
8. Modal updates to show "Registered"
9. Player's name appears in participant list
```

**Key file:** `app/api/play/book/route.ts`

### Court Reservation
```
1. Player goes to /play or /reserve
2. Selects date and time
3. Selects court(s)
4. Selects duration
5. Sees price (membership-adjusted)
6. Completes payment via Stripe
7. Reservation created
```

### Lesson Booking
```
1. Player goes to /lessons
2. Selects coach
3. Views coach's availability calendar
4. Selects time slot
5. Selects duration (30min, 1hr, etc.)
6. Sees price: court fee + (coach rate × hours)
7. Completes payment
8. Lesson event created
```

---

## Membership Benefits

| Feature | No Membership | Standard | Ultimate |
|---------|--------------|----------|----------|
| Reta (Open Play) | $350 | $150 | $0 |
| Court Reservation | $600 | $450 | $350 |
| Lesson (court fee) | $400 | $300 | $200 |

See [../core_concepts/pricing.md](../core_concepts/pricing.md) for details.

---

## DUPR Integration

Players can link their DUPR account to:
- Display ratings on profile
- Show ratings next to name in participant lists
- Access DUPR+ or DUPR Verified-only events

**Linking flow:**
1. Go to /account
2. Click "Link DUPR Account"
3. Redirected to DUPR OAuth
4. Authorize access
5. Redirected back with tokens
6. DUPR ID and ratings stored on user record

**Data stored:**
```
users.dupr_id
users.dupr_access_token
users.dupr_refresh_token
users.dupr_singles_rating
users.dupr_doubles_rating
```

---

## Waiver Requirement

Players must sign a waiver before registering for events.

**Check location:** `app/api/events/register/route.ts:153`
```typescript
if (!userData?.has_signed_waiver) {
  return NextResponse.json({
    error: 'Waiver not signed',
    code: 'WAIVER_REQUIRED',
  }, { status: 403 });
}
```

**Signing waiver:**
- Go to /account
- Click "Sign Waiver"
- Read and accept terms
- `has_signed_waiver` set to `true`

---

## Missing Functionality

- [ ] Push notifications for upcoming bookings
- [ ] In-app messaging with coaches
- [ ] Cancellation of registrations (partially implemented)
- [ ] Waitlist for full events
- [ ] Package deals (multi-class discounts)

---

## Related Documentation

- [../pages/play.md](../pages/play.md) - Play page details
- [../pages/calendar.md](../pages/calendar.md) - Calendar page details
- [../api/events_registration.md](../api/events_registration.md) - Registration API
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Pricing system
