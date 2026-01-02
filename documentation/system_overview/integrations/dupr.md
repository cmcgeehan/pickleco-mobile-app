# DUPR Integration

This document covers the DUPR (Dynamic Universal Pickleball Rating) integration.

## Overview

DUPR is the premier pickleball rating system. Our integration allows users to:
- Link their DUPR account via OAuth
- Display their DUPR ratings
- Enforce DUPR requirements on events
- Submit match results to DUPR

---

## Current Status

**All environments currently use DUPR test credentials.** DUPR doesn't have production API keys available yet.

| Environment | DUPR Mode |
|-------------|-----------|
| Local | Test |
| Staging | Test |
| Production | Test* |

*Production will switch to live when DUPR provides production keys.

---

## Environment Variables

```bash
# DUPR OAuth credentials
DUPR_CLIENT_ID=your_client_id
DUPR_CLIENT_SECRET=your_client_secret

# Redirect URI (must match environment)
NEXT_PUBLIC_DUPR_REDIRECT_URI=http://localhost:3000/api/dupr/callback
# Staging: https://staging.thepickleco.mx/api/dupr/callback
# Production: https://www.thepickleco.mx/api/dupr/callback
```

---

## Database Fields (users table)

| Field | Type | Description |
|-------|------|-------------|
| `dupr_id` | string | User's DUPR ID |
| `dupr_access_token` | string | OAuth access token |
| `dupr_refresh_token` | string | OAuth refresh token |
| `dupr_token_expires_at` | timestamp | Token expiration time |
| `dupr_linked_at` | timestamp | When account was linked |
| `dupr_updated_at` | timestamp | Last sync time |
| `dupr_sync_status` | string | 'linked', 'error', etc. |
| `dupr_singles_rating` | number | Singles DUPR rating |
| `dupr_singles_reliability` | number | Singles reliability score |
| `dupr_doubles_rating` | number | Doubles DUPR rating |
| `dupr_doubles_reliability` | number | Doubles reliability score |

---

## API Endpoints

### Status

**`GET /api/dupr/status`**

Get user's DUPR account status and ratings.

```typescript
// Response (linked)
{
  linked: true,
  duprId: "123456",
  linkedAt: "2024-01-15T...",
  ratings: {
    singlesRating: 4.5,
    singlesReliability: 85,
    doublesRating: 4.2,
    doublesReliability: 90
  },
  updatedAt: "2024-01-15T...",
  syncStatus: "linked"
}

// Response (not linked)
{
  linked: false
}
```

### Link Account (OAuth)

**`POST /api/dupr/link-oauth`**

Link DUPR account using OAuth tokens from "Login with DUPR" iframe.

```typescript
// Request
{
  duprId: string,
  userToken: string,      // OAuth access token
  refreshToken: string,
  stats?: {               // Optional initial stats
    singlesRating?: number,
    singlesReliability?: number,
    doublesRating?: number,
    doublesReliability?: number
  }
}

// Response
{
  success: true,
  message: "DUPR account linked successfully via OAuth"
}
```

### Unlink Account

**`POST /api/dupr/unlink`**

Remove DUPR account link.

```typescript
// Response
{
  success: true,
  message: "DUPR account unlinked"
}
```

### Sync Ratings

**`POST /api/dupr/sync`**

Refresh DUPR ratings from DUPR API.

```typescript
// Response
{
  success: true,
  ratings: {
    singlesRating: 4.5,
    doublesRating: 4.2
  }
}
```

### Entitlements

**`GET /api/dupr/entitlements`**

Check user's DUPR entitlements (DUPR+ subscription, verified status).

```typescript
// Response
{
  success: true,
  entitlements: {
    duprPlus: true,
    verified: true
  }
}
```

---

## OAuth Flow

### Login with DUPR Iframe

1. User clicks "Link DUPR Account" on `/account/dupr`
2. DUPR OAuth iframe is displayed
3. User logs into their DUPR account
4. DUPR returns OAuth tokens via postMessage
5. Frontend calls `/api/dupr/link-oauth` with tokens
6. Backend stores tokens and fetches initial ratings
7. User sees linked status with ratings

### Token Refresh

DUPR access tokens expire after ~1 hour. Token refresh happens:
- Automatically when making DUPR API calls
- Via `/api/dupr/sync` endpoint

---

## Event DUPR Requirements

Events can require:
- DUPR account linked
- Minimum rating
- DUPR+ subscription
- DUPR verified status

### Database Fields (events table)

| Field | Type | Description |
|-------|------|-------------|
| `requires_dupr_plus` | boolean | Requires DUPR+ subscription |
| `requires_dupr_verified` | boolean | Requires DUPR verified status |
| `min_dupr_rating` | number | Minimum rating to register |
| `max_dupr_rating` | number | Maximum rating to register |
| `match_type` | string | 'singles' or 'doubles' |

### Registration Check

When registering for an event with DUPR requirements:

```typescript
// Check DUPR requirements
if (event.requires_dupr_plus) {
  const { data: entitlements } = await checkDuprEntitlements(userId)
  if (!entitlements?.duprPlus) {
    return { error: 'DUPR+ subscription required' }
  }
}

if (event.min_dupr_rating) {
  const rating = event.match_type === 'singles'
    ? user.dupr_singles_rating
    : user.dupr_doubles_rating

  if (!rating || rating < event.min_dupr_rating) {
    return { error: `Minimum ${event.min_dupr_rating} DUPR rating required` }
  }
}
```

---

## Match Submission

### Create Match

**`POST /api/dupr/matches/create`**

Submit a match result to DUPR.

```typescript
// Request
{
  eventId: string,
  teams: [
    { players: [userId1, userId2], score: 11 },
    { players: [userId3, userId4], score: 9 }
  ],
  matchType: 'doubles'
}
```

### Get Match

**`GET /api/dupr/matches/[matchId]`**

Get match details from DUPR.

---

## Club Integration

### My Club Memberships

**`GET /api/dupr/clubs/my-memberships`**

Get user's DUPR club memberships.

### Verify Club Permission

**`GET /api/dupr/clubs/[clubId]/verify-permission`**

Check if user has permission for a specific club.

---

## Webhook

**`POST /api/dupr/webhook`**

Receives webhooks from DUPR for:
- Match result updates
- Rating changes
- Entitlement changes

---

## UI Components

### Account DUPR Page

**File:** `app/account/dupr/page.tsx`

Shows:
- DUPR link status
- Current ratings
- Link/unlink buttons
- Sync button

### DUPR Connection Component

**Component:** `components/account/dupr-connection.tsx`

Main component for DUPR account management.

---

## Displaying Ratings

Ratings are shown on:
- User profiles
- Event participant lists
- Calendar event details

```typescript
// Get user with DUPR ratings
const { data: user } = await supabase
  .from('users')
  .select('first_name, last_name, dupr_singles_rating, dupr_doubles_rating')
  .eq('id', userId)
  .single()
```

---

## Troubleshooting

### "DUPR linking not working"

1. Check `NEXT_PUBLIC_DUPR_REDIRECT_URI` matches current domain
2. Check `DUPR_CLIENT_ID` and `DUPR_CLIENT_SECRET` are set
3. Check browser console for iframe postMessage errors

### "Ratings not updating"

1. Check `dupr_sync_status` field
2. Try manual sync via `/api/dupr/sync`
3. Check DUPR access token hasn't expired

### "DUPR account already linked"

DUPR ID can only be linked to one user account. User must:
1. Unlink from the other account first, OR
2. Contact support to resolve

---

## Related Documentation

- [./supabase.md](./supabase.md) - Database and auth
- [../pages/account.md](../pages/account.md) - Account pages
- [../data/schema.md](../data/schema.md) - Database schema
