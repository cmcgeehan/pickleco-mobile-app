# Membership Page

This document covers the membership pages (`/membership/*`) - membership tiers and checkout.

## Overview

**Base URL:** `/membership`

The membership section allows users to view, compare, and purchase membership plans. Membership data is stored in the [membership_types](../data/schema.md#membership_types) and [memberships](../data/schema.md#memberships) tables.

---

## Page Structure

```
/membership
├── page.tsx                 # Membership comparison/selection
└── checkout/
    └── page.tsx             # Membership checkout
```

---

## `/membership` - Membership Selection

**File:** `app/membership/page.tsx`

### Page Sections

1. **How Memberships Work** - `<HowMembershipsWork />`
   - Explains membership benefits
   - Visual hero section

2. **Membership Comparison** - `<MembershipComparison />`
   - Side-by-side tier comparison
   - Dynamic pricing from [membership_types table](../data/schema.md#membership_types)
   - Subscribe buttons

3. **Pricing Details** - `<MembershipPricingDetails />`
   - Detailed pricing breakdown
   - Per-activity pricing (see [pricing docs](../core_concepts/pricing.md))

4. **FAQ** - `<MembershipFAQ />`
   - Frequently asked questions

---

## Membership Tiers

Three tiers defined in [membership_types table](../data/schema.md#membership_types):

| Tier | Database Name | ID | Description |
|------|---------------|-----|-------------|
| Pay to Play | `pay_to_play` | 16 | No monthly fee, pay per activity |
| Standard | `standard` | 15 | Regular membership |
| Ultimate | `ultimate` | 1 | Best value, most savings |

```typescript
const MEMBERSHIPS = [
  { nameKey: 'payToPlayName', ... },
  { nameKey: 'standardName', ... },
  { nameKey: 'ultimateName', ... }
]

const MEMBERSHIP_IDS = {
  standardName: 15,
  ultimateName: 1,
  payToPlayName: 16
}
```

See [../core_concepts/pricing.md](../core_concepts/pricing.md) for how each tier affects event and lesson pricing via the [membership_event_discounts table](../data/schema.md#membership_event_discounts).

---

## Dynamic Pricing

Prices are fetched from [membership_types table](../data/schema.md#membership_types):

```typescript
const fetchMembershipPricing = async () => {
  const { data: membershipTypes, error } = await supabase
    .from('membership_types')
    .select('name, cost_mxn')
    .is('deleted_at', null)

  // Map database names to UI keys
  const pricingMap: Record<string, number> = {}
  membershipTypes?.forEach(type => {
    const key = Object.entries(MEMBERSHIP_NAME_MAP)
      .find(([_, dbName]) => dbName === type.name)?.[0]
    if (key) pricingMap[key] = type.cost_mxn
  })

  setMembershipPricing(pricingMap)
}
```

---

## Selection Flow

When user clicks "Subscribe":

```typescript
const handleMembershipSelect = useCallback((membershipNameKey: string) => {
  // Require login - redirect to [/login](./auth.md)
  if (!user) {
    router.push('/login')
    return
  }

  // Get membership ID
  const membershipId = MEMBERSHIP_IDS[membershipNameKey]

  // Navigate to checkout
  router.push(`/membership/checkout?id=${membershipId}`)
}, [router, user])
```

---

## `/membership/checkout` - Checkout

**File:** `app/membership/checkout/page.tsx`

### Flow

1. User arrives with membership ID in query params
2. Page fetches membership details from [membership_types](../data/schema.md#membership_types)
3. Creates [Stripe](../integrations/stripe.md) checkout session
4. User completes payment on Stripe
5. [Webhook](../integrations/stripe.md#webhooks) creates [memberships](../data/schema.md#memberships) record
6. User redirected to confirmation (then to [/account](./account.md))

### Key Components

- Membership summary
- [Stripe Elements](../integrations/stripe.md) payment form
- Price confirmation

---

## Early Bird Modal

Special promotional modal:
```tsx
<EarlyBirdModalProvider>
  {/* Page content */}
</EarlyBirdModalProvider>
```

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `HowMembershipsWork` | Hero/explainer section |
| `MembershipComparison` | Tier comparison cards |
| `MembershipPricingDetails` | Detailed pricing (see [pricing docs](../core_concepts/pricing.md)) |
| `MembershipFAQ` | FAQ accordion |
| `EarlyBirdModalProvider` | Promotional modal |

---

## Translation Keys

Uses `membership` namespace:
- `membership.title`
- `membership.payToPlayName`
- `membership.standardName`
- `membership.ultimateName`
- Feature descriptions, prices, etc.

---

## Authentication

- Page viewable by all users
- Subscribe button requires [login](./auth.md)
- Unauthenticated users redirected to [/login](./auth.md)
- Uses [Supabase auth](../integrations/supabase.md)

---

## Related Documentation

- [./account.md](./account.md) - Account membership management
- [./auth.md](./auth.md) - Login/authentication
- [./play.md](./play.md) - Where membership pricing applies
- [./calendar.md](./calendar.md) - Event pricing based on membership
- [./lessons.md](./lessons.md) - Lesson pricing based on membership
- [./reserve.md](./reserve.md) - Court reservation pricing
- [../core_concepts/pricing.md](../core_concepts/pricing.md) - Full pricing model
- [../integrations/stripe.md](../integrations/stripe.md) - Payment processing
- [../integrations/supabase.md](../integrations/supabase.md) - Database and auth
- [../data/schema.md](../data/schema.md) - membership_types, memberships, membership_event_discounts tables
