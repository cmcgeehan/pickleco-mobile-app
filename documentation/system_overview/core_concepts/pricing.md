# Pricing System

This document explains how pricing works, including membership discounts and the flat pricing model.

## Overview

We use a **flat pricing model** where prices are determined by:
1. The **event type** (Reta, Reservation, Lesson)
2. The user's **membership tier** (None, Standard, Ultimate)

Prices are stored in the database, not hardcoded.

---

## Pricing Table

| Event Type       | Pay to Play (No Membership) | Standard | Ultimate |
|------------------|----------------------------|----------|----------|
| Reta (Open Play) | $350 MXN                   | $150 MXN | $0 MXN   |
| Court Reservation| $600 MXN                   | $450 MXN | $350 MXN |
| Lesson (court)   | $400 MXN                   | $300 MXN | $200 MXN |

**Note:** Lesson total = court price + (coach rate × hours)

---

## Database Schema

### `event_types`
Stores base prices for each event type.

| Column | Description |
|--------|-------------|
| `id` | UUID |
| `name` | Event type name (e.g., "Reta", "Court Reservation", "Lesson") |
| `cost_mxn` | Base price (pay-to-play price) |
| `cost_type` | "per_person" or "flat" |

### `membership_types`
Available membership tiers.

| Column | Description |
|--------|-------------|
| `id` | UUID |
| `name` | Tier name (e.g., "Standard", "Ultimate") |
| `cost_mxn` | Monthly membership cost |

### `membership_event_discounts`
Lookup table for membership-specific prices.

| Column | Description |
|--------|-------------|
| `membership_type_id` | FK to membership_types |
| `event_type_id` | FK to event_types |
| `price_mxn` | Discounted price for this combination |

### `memberships`
User's active memberships.

| Column | Description |
|--------|-------------|
| `id` | UUID |
| `user_id` | FK to users |
| `membership_type_id` | FK to membership_types |
| `created_at` | When membership started |
| `end_date` | When membership expires (null = perpetual) |
| `deleted_at` | Soft delete |

---

## Price Calculation Logic

**File:** `apps/web/lib/pricing.ts`

### `getEventPrice(supabase, eventTypeId, userId)`

1. Get base price from `event_types.cost_mxn`
2. If no userId, return base price
3. Check for active membership in `memberships` table
4. If membership found, look up price in `membership_event_discounts`
5. Return discounted price if found, else base price

```typescript
export async function getEventPrice(
  supabase: any,
  eventTypeId: string,
  userId?: string
): Promise<number> {
  // Get base price from event_types
  const { data: eventType } = await supabase
    .from('event_types')
    .select('cost_mxn')
    .eq('id', eventTypeId)
    .single();

  const basePrice = eventType?.cost_mxn ?? 0;

  if (!userId) return basePrice;

  // Check for active membership
  const now = new Date().toISOString();
  const { data: membership } = await supabase
    .from('memberships')
    .select('membership_type_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(`end_date.is.null,end_date.gt.${now}`)
    .maybeSingle();

  if (!membership?.membership_type_id) return basePrice;

  // Get membership-specific price
  const { data: discount } = await supabase
    .from('membership_event_discounts')
    .select('price_mxn')
    .eq('membership_type_id', membership.membership_type_id)
    .eq('event_type_id', eventTypeId)
    .maybeSingle();

  return discount?.price_mxn ?? basePrice;
}
```

### Active Membership Check

A membership is considered **active** if:
- `deleted_at` is null (not cancelled)
- `created_at` is in the past (already started)
- `end_date` is null (perpetual) OR `end_date` is in the future

```typescript
.or(`end_date.is.null,end_date.gt.${now}`)
```

---

## Lesson Pricing

Lessons have two components:
1. **Court fee** - Based on event type "Lesson", affected by membership
2. **Coach fee** - Coach's hourly rate × duration (NOT discounted by membership)

```typescript
export async function getLessonPrice(
  supabase: any,
  userId: string | undefined,
  coachRate: number,
  durationHours: number = 1
): Promise<number> {
  const courtPrice = await getEventPriceByName(supabase, 'Lesson', userId);
  return courtPrice + (coachRate * durationHours);
}
```

**Example:**
- User: Standard member ($300 court price)
- Coach: $500/hour rate
- Duration: 1 hour
- **Total:** $300 + $500 = $800 MXN

---

## Helper Functions

### `getEventPriceByName(supabase, eventTypeName, userId)`
Same as `getEventPrice` but looks up event type by name instead of ID.

### `hasActiveMembership(supabase, userId)`
Returns boolean indicating if user has an active membership.

### `getMembershipTypeName(supabase, userId)`
Returns the name of user's current membership tier (e.g., "Standard", "Ultimate") or null.

### `getAllPricesForUser(supabase, userId)`
Returns all prices for a user in one call - useful for pricing tables:

```typescript
const prices = await getAllPricesForUser(supabase, userId);
// {
//   reta: 150,
//   reservation: 450,
//   lesson: 300,
//   membershipType: "Standard"
// }
```

---

## Where Pricing is Used

| Location | Usage |
|----------|-------|
| Event modal | Display price based on user's membership |
| Checkout | Calculate amount to charge |
| Lesson booking | Calculate court + coach total |
| Membership page | Show pricing comparison table |

---

## Adding New Event Types or Membership Tiers

### New Event Type
1. Add row to `event_types` with base price
2. Add rows to `membership_event_discounts` for each membership tier

### New Membership Tier
1. Add row to `membership_types`
2. Add rows to `membership_event_discounts` for each event type

---

## Migrations

**Flat pricing model migration:** `documentation/migrations/20251209_flat_pricing_model.sql`

This migration:
1. Created `membership_event_discounts` table
2. Populated initial pricing data

---

## Troubleshooting

### User not getting membership discount

1. Check if membership is active:
   ```sql
   SELECT * FROM memberships
   WHERE user_id = 'xxx'
     AND deleted_at IS NULL
     AND (end_date IS NULL OR end_date > NOW());
   ```

2. Check if discount row exists:
   ```sql
   SELECT * FROM membership_event_discounts
   WHERE membership_type_id = 'xxx'
     AND event_type_id = 'yyy';
   ```

### Wrong price displayed

1. Check `event_types.cost_mxn` for base price
2. Check `membership_event_discounts.price_mxn` for discounted price
3. Verify user's membership is correctly linked to the right tier

---

## Related Documentation

- [../data/schema.md](../data/schema.md) - Database tables
- [../api/stripe.md](../api/stripe.md) - Payment processing
