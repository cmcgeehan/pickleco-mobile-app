# Waiver System

This document covers how the liability waiver works across the application.

## Overview

All users must sign a liability waiver before they can:
- Register for [events](../pages/calendar.md)
- Book [lessons](../pages/lessons.md)
- Make [court reservations](../pages/reserve.md)

The waiver is a legal agreement that releases The Pickle Co from liability for injuries.

---

## Database Schema

The waiver status is stored in the [users table](../data/schema.md#users):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `has_signed_waiver` | boolean | `false` | Whether user has signed the waiver |

```sql
-- From users table
has_signed_waiver BOOLEAN DEFAULT false
```

---

## Waiver Flow

```
1. User signs up → has_signed_waiver = false
2. User tries to register for event/book lesson/reserve court
3. Client checks userProfile.has_signed_waiver
4. If false → WaiverModal displayed
5. User reads waiver, checks agreement checkbox
6. User clicks "Accept" → POST /api/users/waiver
7. Backend sets has_signed_waiver = true
8. User can now proceed with booking
```

---

## Client-Side Enforcement

Before allowing any booking action, check the waiver status:

### In React Components

```typescript
import { useAuthStore } from '@/contexts/auth'

function BookingComponent() {
  const { profile } = useAuthStore()
  const [showWaiverModal, setShowWaiverModal] = useState(false)

  const handleBooking = () => {
    // Check waiver before proceeding
    if (!profile?.has_signed_waiver) {
      setShowWaiverModal(true)
      return  // Stop here until waiver is signed
    }

    // Proceed with booking...
  }

  return (
    <>
      <Button onClick={handleBooking}>Book Now</Button>

      {showWaiverModal && (
        <WaiverModal
          isOpen={showWaiverModal}
          onClose={() => setShowWaiverModal(false)}
          onAccept={handleWaiverAccept}
          user={user}
        />
      )}
    </>
  )
}
```

### WaiverModal Component

**File:** `components/waiver-modal.tsx`

The modal displays:
- Full waiver text (from [translations](./translations.md))
- Scrollable content area
- Checkbox: "I have read and understand this waiver"
- Accept button (disabled until checkbox is checked)

```typescript
export const WaiverModal: React.FC<WaiverModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  user
}) => {
  const [hasAgreed, setHasAgreed] = useState(false)
  const { t } = useTranslations()

  const handleAccept = () => {
    if (hasAgreed) {
      onAccept()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>{t('waiver', 'title')}</DialogTitle>
        <ScrollArea className="h-64">
          <p>{t('waiver', 'content')}</p>
        </ScrollArea>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={hasAgreed}
            onCheckedChange={setHasAgreed}
          />
          <label>{t('waiver', 'agreement')}</label>
        </div>
        <Button onClick={handleAccept} disabled={!hasAgreed}>
          Accept
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

---

## API Endpoint

### Sign Waiver

**`POST /api/users/waiver`**

**File:** `app/api/users/waiver/route.ts`

```typescript
// Request
{
  userId: string
}

// Headers
Authorization: Bearer <jwt>

// Response (success)
{
  profile: { /* updated user profile */ }
}

// Response (error)
{ error: 'Authorization required' }  // 401
```

**Implementation:**
```typescript
export async function POST(request: Request) {
  const { userId } = await request.json()

  // 1. Verify authorization
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization required' },
      { status: 401 }
    )
  }

  // 2. Update user record
  const { data: profile } = await supabase
    .from('users')
    .upsert({
      id: userId,
      has_signed_waiver: true
    })
    .select()
    .single()

  return NextResponse.json({ profile })
}
```

---

## Server-Side Enforcement

All booking API routes MUST check waiver status and return 403 if not signed.

### Pattern for API Routes

```typescript
export async function POST(request: NextRequest) {
  // ... authenticate user first (see [auth docs](../pages/auth.md))

  // Check waiver status using admin client
  const { data: userProfile } = await adminClient
    .from('users')
    .select('has_signed_waiver, first_name, last_name')
    .eq('id', userId)
    .single()

  if (!userProfile?.has_signed_waiver) {
    return NextResponse.json(
      {
        error: 'Waiver not signed',
        code: 'WAIVER_REQUIRED',
        requireWaiver: true,
        message: 'You must sign the waiver before registering'
      },
      { status: 403 }
    )
  }

  // Proceed with booking...
}
```

### Routes That Enforce Waiver

| Route | File |
|-------|------|
| Event registration | `app/api/events/register/route.ts` |
| Court reservation | `app/api/courts/reserve/route.ts` |
| Court reservation | `app/api/reserve-court/route.ts` |
| Reservation create | `app/api/reservations/create/route.ts` |
| Play booking | `app/api/play/book/route.ts` |

---

## Waiver Content

The waiver text is stored in [translation files](./translations.md) at `messages/en.json` and `messages/es.json`:

```json
{
  "waiver": {
    "title": "Liability Waiver",
    "content": "I understand and acknowledge that playing pickleball involves risks of serious bodily injury, including permanent disability, paralysis, and death...",
    "agreement": "I have read and understand this waiver and agree to its terms"
  }
}
```

The content covers:
- Acknowledgment of risks (injury, disability, death)
- Assumption of all risks and responsibility
- Release of liability for The Pickle Co and related parties
- Indemnification agreement

---

## Handling Waiver Errors

When an API returns `WAIVER_REQUIRED`, the client should:

1. Show the WaiverModal
2. Wait for user acceptance
3. Retry the original action

```typescript
const handleBooking = async () => {
  try {
    const response = await fetch('/api/events/register', { ... })
    const data = await response.json()

    if (data.code === 'WAIVER_REQUIRED' || data.requireWaiver) {
      setShowWaiverModal(true)
      return
    }

    // Success...
  } catch (error) {
    // Handle error...
  }
}

const handleWaiverAccept = async () => {
  // Sign waiver
  await fetch('/api/users/waiver', {
    method: 'POST',
    body: JSON.stringify({ userId: user.id })
  })

  // Refresh user profile
  await refreshUser()

  // Retry the original booking
  handleBooking()
}
```

---

## Adding Waiver Check to New Features

When creating new booking/registration features:

1. **Client-side:** Check `profile.has_signed_waiver` before calling API
2. **Server-side:** Query users table for `has_signed_waiver`, return 403 if false
3. **Response:** Include `code: 'WAIVER_REQUIRED'` and `requireWaiver: true` in error
4. **Client handling:** Show WaiverModal when receiving waiver error

---

## Related Documentation

- [./translations.md](./translations.md) - Waiver text translations
- [../pages/auth.md](../pages/auth.md) - Authentication (required before waiver)
- [../pages/calendar.md](../pages/calendar.md) - Event registration (requires waiver)
- [../pages/lessons.md](../pages/lessons.md) - Lesson booking (requires waiver)
- [../pages/reserve.md](../pages/reserve.md) - Court reservation (requires waiver)
- [../data/schema.md](../data/schema.md) - Users table with has_signed_waiver field
- [../integrations/supabase.md](../integrations/supabase.md) - Admin client for checking waiver
