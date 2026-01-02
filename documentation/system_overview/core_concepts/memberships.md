# Membership System

This document covers how memberships work, including tiers, pricing, and subscription management.

## Overview

Memberships give players discounted rates on:
- Open play (Reta)
- Court reservations
- Lesson court fees

## Membership Tiers

| Tier | Monthly Cost | Target User |
|------|-------------|-------------|
| Pay to Play | $0 | Casual players, tourists |
| Standard | TBD | Regular players |
| Ultimate | TBD | Frequent players, best value |

See [pricing.md](./pricing.md) for specific price discounts.

---

## Database Schema

### `membership_types`

Available membership tiers.

| Field | Description |
|-------|-------------|
| `id` | UUID |
| `name` | Tier name ("Standard", "Ultimate") |
| `description` | What's included |
| `cost_mxn` | Monthly price |

### `memberships`

User subscriptions.

| Field | Description |
|-------|-------------|
| `id` | UUID |
| `user_id` | FK to users |
| `membership_type_id` | FK to membership_types |
| `stripe_subscription_id` | Stripe subscription ID |
| `created_at` | When membership started |
| `end_date` | When membership expires (null = perpetual) |
| `deleted_at` | Soft delete (cancelled) |

### `membership_event_discounts`

Price lookup table.

| Field | Description |
|-------|-------------|
| `membership_type_id` | FK to membership_types |
| `event_type_id` | FK to event_types |
| `price_mxn` | Price for this combination |

---

## Membership Status Logic

A membership is **active** if:
1. `deleted_at` is null (not cancelled)
2. `created_at` is in the past (started)
3. `end_date` is null (perpetual) OR `end_date` is in the future

**Query:**
```typescript
const now = new Date().toISOString()

const { data: membership } = await supabase
  .from('memberships')
  .select('membership_type_id')
  .eq('user_id', userId)
  .is('deleted_at', null)
  .lt('created_at', now)
  .or(`end_date.is.null,end_date.gt.${now}`)
  .maybeSingle()
```

---

## Purchase Flow

### Via Website

```
1. User goes to /membership
2. Views available tiers
3. Clicks "Subscribe" on chosen tier
4. Redirected to Stripe Checkout
5. Enters payment details
6. Stripe creates subscription
7. Webhook creates membership record
8. User sees confirmation
```

### Via Admin

Admin can manually add membership:
1. Find user in admin panel
2. Select membership tier
3. Process payment (if needed)
4. Create membership record

---

## Stripe Subscription

### Creating Subscription

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [{
    price: membershipPriceId,  // Stripe Price ID
    quantity: 1,
  }],
  success_url: `${baseUrl}/membership?success=true`,
  cancel_url: `${baseUrl}/membership`,
})
```

### Webhook Events

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create membership record |
| `customer.subscription.updated` | Update membership status |
| `customer.subscription.deleted` | Set `deleted_at` on membership |
| `invoice.payment_succeeded` | Extend membership period |
| `invoice.payment_failed` | Handle failed payment |

---

## Price Calculation

When calculating event price:

1. Get base price from `event_types.cost_mxn`
2. Check if user has active membership
3. If yes, look up price in `membership_event_discounts`
4. Return discounted price or base price

**Function:** `lib/pricing.ts:getEventPrice()`

```typescript
export async function getEventPrice(
  supabase: any,
  eventTypeId: string,
  userId?: string
): Promise<number> {
  // Get base price
  const { data: eventType } = await supabase
    .from('event_types')
    .select('cost_mxn')
    .eq('id', eventTypeId)
    .single()

  const basePrice = eventType?.cost_mxn ?? 0

  if (!userId) return basePrice

  // Check membership
  const membership = await getActiveMembership(supabase, userId)
  if (!membership) return basePrice

  // Get discounted price
  const { data: discount } = await supabase
    .from('membership_event_discounts')
    .select('price_mxn')
    .eq('membership_type_id', membership.membership_type_id)
    .eq('event_type_id', eventTypeId)
    .maybeSingle()

  return discount?.price_mxn ?? basePrice
}
```

---

## UI Integration

### Membership Page

`/membership` shows:
- Current membership status
- Available tiers with pricing
- Comparison table
- Subscribe/upgrade buttons

### Event Pricing Display

Event modal shows personalized pricing:
```typescript
const price = await getEventPrice(supabase, event.event_type_id, userId)
// Shows "$150" for Standard member vs "$350" for non-member
```

### Account Page

Shows membership info:
- Current tier
- Renewal date
- Cancel option
- Upgrade option

---

## Cancellation

### User-initiated

1. Go to /account
2. Click "Cancel Membership"
3. Confirm cancellation
4. API calls Stripe to cancel subscription
5. Membership marked with `end_date` (end of billing period)
6. User keeps benefits until `end_date`

### Admin-initiated

Admin can cancel immediately:
1. Find user in admin panel
2. Click "Cancel Membership"
3. Set `deleted_at` to now (immediate cancellation)

---

## API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/membership` | Get current user's membership |
| `POST /api/membership/subscribe` | Start subscription |
| `POST /api/membership/cancel` | Cancel subscription |
| `GET /api/membership/types` | List available tiers |

---

## Missing Functionality

- [ ] Trial periods
- [ ] Promotional pricing
- [ ] Family/group memberships
- [ ] Corporate memberships
- [ ] Membership pause/hold
- [ ] Referral discounts
- [ ] Upgrade/downgrade prorations

---

## Related Documentation

- [./pricing.md](./pricing.md) - Pricing model details
- [../integrations/stripe.md](../integrations/stripe.md) - Stripe integration
- [../data/schema.md](../data/schema.md) - Database tables
