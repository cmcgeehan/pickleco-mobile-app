# Account Pages

This document covers the account section (`/account/*`) - user profile and settings.

## Overview

**Base URL:** `/account`
**Layout Component:** `<AccountLayout />`

The account section provides authenticated users with profile management, settings, and account-related features. Users must be [authenticated](./auth.md) to access these pages.

---

## Page Structure

```
/account
├── page.tsx                 # Redirect to /account/personal
├── personal/
│   └── page.tsx             # Personal information
├── dupr/
│   └── page.tsx             # DUPR integration
├── membership/
│   └── page.tsx             # Membership management
├── billing/
│   └── page.tsx             # Billing/payment methods
├── payment-history/
│   └── page.tsx             # Payment history
├── notifications/
│   └── page.tsx             # Notification preferences
└── [id]/
    └── page.tsx             # Public profile view
```

---

## `/account` (Index)

**File:** `app/account/page.tsx`

Simple redirect page:
- Checks [authentication](./auth.md)
- Handles post-payment redirects (from [Stripe](../integrations/stripe.md))
- Redirects to `/account/personal`

```typescript
if (user) {
  router.push('/account/personal')
}
```

### Post-Payment Handling

Detects [Stripe](../integrations/stripe.md) redirect params and refreshes user state:
```typescript
const isPostPayment = searchParams.get('payment_intent') ||
                      searchParams.get('payment_intent_client_secret') ||
                      searchParams.get('redirect_status')

if (isPostPayment && !hasCheckedAuth) {
  await refreshUser()
}
```

---

## `/account/personal` - Personal Information

**File:** `app/account/personal/page.tsx`
**Component:** `<PersonalInformation />`

Allows users to update fields in the [users table](../data/schema.md#users):
- First name
- Last name
- Email (display only)
- Phone number
- Profile photo

---

## `/account/dupr` - DUPR Integration

**File:** `app/account/dupr/page.tsx`
**Component:** `<DUPRConnection />`

[DUPR](../integrations/dupr.md) account connection:
- Link/unlink DUPR account via OAuth
- View DUPR ratings (stored in [users table](../data/schema.md#users) fields like `dupr_singles_rating`, `dupr_doubles_rating`)
- Sync DUPR data

See [../integrations/dupr.md](../integrations/dupr.md) for full DUPR OAuth flow details.

---

## `/account/membership` - Membership Management

**File:** `app/account/membership/page.tsx`

Displays data from [membership_types](../data/schema.md#membership_types) and user's [memberships table](../data/schema.md#memberships) record:
- Current membership tier (Pay to Play, Standard, Ultimate)
- Membership benefits
- Upgrade/downgrade options (redirects to [/membership](./membership.md) checkout)
- Cancel membership (via [Stripe](../integrations/stripe.md) subscription cancellation)

See [../core_concepts/pricing.md](../core_concepts/pricing.md) for how membership affects pricing.

---

## `/account/billing` - Billing

**File:** `app/account/billing/page.tsx`

Payment method management via [Stripe API](../integrations/stripe.md):
- View saved payment methods (from Stripe customer)
- Add new payment method (via [/api/stripe/setup-intent](../integrations/stripe.md#api-endpoints))
- Set default payment method
- Remove payment methods

---

## `/account/payment-history` - Payment History

**File:** `app/account/payment-history/page.tsx`

Shows data from [payments table](../data/schema.md#payments) and [Stripe](../integrations/stripe.md):
- Past payments
- Payment dates
- Payment amounts
- Payment types (lesson, event_registration, membership, pro_shop)
- Receipt links (Stripe receipt URLs)

API: [/api/stripe/payment-history](../integrations/stripe.md#api-endpoints)

---

## `/account/notifications` - Notification Preferences

**File:** `app/account/notifications/page.tsx`

Configure notification settings in [users table](../data/schema.md#users):
- Email notifications
- Marketing emails
- Event reminders

---

## `/account/[id]` - Public Profile

**File:** `app/account/[id]/page.tsx`

Public view of a user's profile (fetches from [users table](../data/schema.md#users)):
- Name
- Profile photo
- [DUPR ratings](../integrations/dupr.md) (if linked)
- Membership tier (optional)

Used when viewing other [players'](../users/player.md) profiles from event participant lists.

---

## Account Layout

All account pages use `<AccountLayout>`:

```tsx
<AccountLayout>
  <PersonalInformation />
</AccountLayout>
```

The layout provides:
- Sidebar navigation between account sections
- Consistent header
- [Authentication](./auth.md) check

---

## Authentication

All account pages require [authentication](./auth.md):
- Unauthenticated users redirected to [/login](./auth.md)
- Auth state from `useAuthStore()` (see [Supabase integration](../integrations/supabase.md))

---

## Navigation

Sidebar links:
- Personal Information → `/account/personal`
- DUPR Integration → `/account/dupr` (see [DUPR docs](../integrations/dupr.md))
- Membership → `/account/membership` (see [membership page](./membership.md))
- Billing → `/account/billing` (see [Stripe docs](../integrations/stripe.md))
- Payment History → `/account/payment-history`
- Notifications → `/account/notifications`

---

## Related Documentation

- [./auth.md](./auth.md) - Login/authentication
- [./membership.md](./membership.md) - Membership purchase
- [../integrations/stripe.md](../integrations/stripe.md) - Billing integration
- [../integrations/dupr.md](../integrations/dupr.md) - DUPR integration
- [../integrations/supabase.md](../integrations/supabase.md) - Database and auth
- [../data/schema.md](../data/schema.md) - Users, memberships, payments tables
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Membership pricing
- [../users/player.md](../users/player.md) - Player journey
