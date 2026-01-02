# Event Registration Flow Implementation

**Started:** 2025-12-12
**Status:** In Progress

## Overview

Fix the event registration flow to properly handle:
0. Capacity check (event not full)
1. Waiver check (require signed waiver)
2. Payment (charge user based on membership tier)
3. Create registration record

## Related Documentation

- [api/events_registration.md](../system_overview/api/events_registration.md) - Current registration endpoints
- [core_concepts/waiver.md](../system_overview/core_concepts/waiver.md) - Waiver system
- [core_concepts/pricing.md](../system_overview/core_concepts/pricing.md) - Pricing model
- [integrations/stripe.md](../system_overview/integrations/stripe.md) - Payment processing
- [data/schema.md](../system_overview/data/schema.md) - Database tables

## Goal Flow

```
User clicks "Register" on event modal
         │
         ▼
1. Check capacity (event not full)
   ├── If full → Button disabled
         │
         ▼
2. Check waiver status
   ├── If not signed → Show WaiverModal
   ├── On accept → Save waiver, continue
         │
         ▼
3. Check price (membership-aware)
   ├── Uses pricingInfo.userPrice from /api/events/price
   ├── If price > 0 → Show CheckoutModal
   ├── If price = 0 → Skip to registration
         │
         ▼
4. If payment required → CheckoutModal
   ├── Collect payment via Stripe
   ├── On success → Continue to registration
         │
         ▼
5. Create event_registration record
   ├── Calls /api/play/book
   ├── Handles soft-deleted registrations (reactivates)
         │
         ▼
6. Show success message
```

## Changes Made

### Bug Fix: Soft-deleted registration reactivation
**File:** `app/api/play/book/route.ts`

**Problem:** Users who unregistered and tried to re-register got a unique constraint error because:
- Unregister uses soft delete (sets `deleted_at`)
- Register tried to insert new row
- Unique constraint on `(event_id, user_id)` blocked the insert

**Fix:** Before inserting, check for soft-deleted registration and reactivate it instead:
```typescript
// Check if there's a soft-deleted registration we can reactivate
const { data: existingSoftDeleted } = await adminClient
  .from('event_registrations')
  .select('id')
  .eq('event_id', eventId)
  .eq('user_id', user.id)
  .not('deleted_at', 'is', null)
  .maybeSingle();

if (existingSoftDeleted) {
  // Reactivate by clearing deleted_at
  await adminClient
    .from('event_registrations')
    .update({ deleted_at: null, ... })
    .eq('id', existingSoftDeleted.id);
} else {
  // Insert new registration
}
```

### Payment Flow Integration
**File:** `components/event-modal.tsx`

**Changes:**
1. **`checkPaymentRequired()`** - Now uses `pricingInfo.userPrice` (membership-aware) instead of `event.cost`
2. **`handleRegister()`** - Now checks payment requirement before proceeding
3. **`completeRegistration()`** - New function with the actual registration logic
4. **`handlePaymentSuccess()`** - Calls `completeRegistration()` after payment
5. **`CheckoutModal` amount** - Uses `pricingInfo.userPrice * 100` for correct Stripe format (centavos)

**Flow:**
```
handleRegister()
  → Check auth
  → Check waiver → WaiverModal if needed
  → Check payment → CheckoutModal if pricingInfo.userPrice > 0
  → completeRegistration() → /api/play/book
```

### Bug Fix: Stripe amount conversion
**File:** `components/event-modal.tsx`

**Problem:** `pricingInfo.userPrice` returns price in pesos (e.g., 500), but Stripe expects amounts in the smallest currency unit (centavos for MXN, e.g., 50000). This caused the error:
```
Amount must convert to at least 50 cents. $5.00 MXN converts to approximately $0.28 USD.
```

**Fix:** Multiply the amount by 100 before passing to `CheckoutModal`:
```typescript
amount={event.recurring_event_id && event.recurring_registrations ?
  ((recurringEvent?.cost_mxn || event.cost_mxn || 0) * 100) :
  ((pricingInfo?.userPrice || 0) * 100)}
```

### Error Logging
**File:** `app/api/play/book/route.ts`

Added detailed logging for:
- Request body parsing
- Capacity checks
- Registration errors with full payload

## Testing

- [ ] Register as non-member (pay full price)
- [ ] Register as Standard member (discounted price)
- [ ] Register as Ultimate member (free for retas)
- [ ] Attempt registration when event is full
- [ ] Registration without signed waiver → waiver modal appears
- [ ] Successful payment creates registration
- [ ] Re-register after unregistering (soft-delete reactivation)
