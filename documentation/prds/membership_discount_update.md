# Date: december 8, 2025

# Problem:
We have built a structure for pricing as follows:
1. All events have an event_type. Those types have a default pricing. The events themselves have a manual pricing override
2. All membership_types have related membership_event_discounts. Right now, those carry a membership_type_id and an event_type_id, and then a discount_percentage.

So when we have a member checking out today, they pay the event's default (or override) pricing * (1 - the relevant discount_pecentage). But we've decided we want to change how the pricing model works.

# New Pricing Model:
see the following csv - 
Membership,None,Standard,Ultimate
Membership Price,$0,"$1,000","$2,000"
Retas Price,$350,$150,$0
Reservation Price,$600,$450,$350
Lesson Price (court only),$400,$300,$200

As you can see, we're now looking at flat pricing for everything. I want us to update our system so that we can use these fixed prices rather than the discount percentages we were using before. For lessons, we will add the coach's hourly rate (which will not get discounted) to the court price to come up with the total lesson price.

I'd like you to add below a PRD on how we are going to accomplish this pricing structure change and hopefully simplify our systems some.

---

# PRD: Flat Pricing Model Implementation

## Overview

This PRD outlines the migration from a percentage-based discount system to a flat pricing model where each membership tier has fixed prices for each event type.

## Current State Analysis

### Database Schema (Current)
1. **event_types** - Has `cost_mxn` (default price for non-members)
2. **membership_types** - Has `cost_mxn` (membership subscription price)
3. **membership_event_discounts** - Links membership_type_id + event_type_id with `discount_percentage`

### Current Pricing Flow
```
Final Price = event_type.cost_mxn * (1 - membership_event_discounts.discount_percentage / 100)
```

### Problem Areas
- Code is inconsistent: some places use old `membership_event_costs` table, others use `membership_event_discounts`
- Percentage-based discounts are inflexible for promotional pricing
- Lesson pricing uses `discount_amount` (flat), everything else uses percentages

## New Pricing Model

### Target Prices (MXN)

| Event Type | None (Pay to Play) | Standard | Ultimate |
|------------|-------------------|----------|----------|
| Membership | $0 | $1,000 | $2,000 |
| Retas (Open Play) | $350 | $150 | $0 |
| Reservation | $600 | $450 | $350 |
| Lesson (court only) | $400 | $300 | $200 |

**Note:** Lesson total = court price + coach hourly rate (coach rate is NOT discounted)

## Implementation Plan

### Phase 1: Database Schema Update

**Option A: Modify existing `membership_event_discounts` table (Recommended)**

Add a new column `price_mxn` and deprecate `discount_percentage`:

```sql
-- Migration: Add flat price column
ALTER TABLE membership_event_discounts
ADD COLUMN price_mxn INTEGER;

-- Populate with calculated values based on current percentages
-- Then deprecate discount_percentage usage
```

**Option B: Simpler - Just use the existing column differently**

Actually, the `membership_event_discounts` table can be replaced entirely. We can:
1. Add `price_mxn` column
2. Keep `discount_percentage` for backward compatibility during migration
3. Update all pricing logic to use `price_mxn` first, fallback to percentage calculation

### Phase 2: Create Migration Script

```sql
-- Migration: 20241209_flat_pricing_model.sql

-- 1. Add price_mxn column to membership_event_discounts
ALTER TABLE membership_event_discounts
ADD COLUMN IF NOT EXISTS price_mxn INTEGER;

-- 2. Update prices for each membership/event combination

-- Pay to Play (None) - use event_types.cost_mxn directly (no discounts)
-- These don't need entries in membership_event_discounts since they pay full price

-- Standard Membership
UPDATE membership_event_discounts
SET price_mxn = 150
WHERE membership_type_id = (SELECT id FROM membership_types WHERE name = 'Standard')
AND event_type_id = (SELECT id FROM event_types WHERE name = 'Reta' OR name = 'Open Play' OR name = 'League Play');

UPDATE membership_event_discounts
SET price_mxn = 450
WHERE membership_type_id = (SELECT id FROM membership_types WHERE name = 'Standard')
AND event_type_id = (SELECT id FROM event_types WHERE name = 'Court Reservation' OR name = 'Reservation');

UPDATE membership_event_discounts
SET price_mxn = 300
WHERE membership_type_id = (SELECT id FROM membership_types WHERE name = 'Standard')
AND event_type_id = (SELECT id FROM event_types WHERE name = 'Lesson');

-- Ultimate Membership
UPDATE membership_event_discounts
SET price_mxn = 0
WHERE membership_type_id = (SELECT id FROM membership_types WHERE name = 'Ultimate')
AND event_type_id = (SELECT id FROM event_types WHERE name = 'Reta' OR name = 'Open Play' OR name = 'League Play');

UPDATE membership_event_discounts
SET price_mxn = 350
WHERE membership_type_id = (SELECT id FROM membership_types WHERE name = 'Ultimate')
AND event_type_id = (SELECT id FROM event_types WHERE name = 'Court Reservation' OR name = 'Reservation');

UPDATE membership_event_discounts
SET price_mxn = 200
WHERE membership_type_id = (SELECT id FROM membership_types WHERE name = 'Ultimate')
AND event_type_id = (SELECT id FROM event_types WHERE name = 'Lesson');

-- 3. Update event_types with base prices for non-members
UPDATE event_types SET cost_mxn = 350 WHERE name IN ('Reta', 'Open Play', 'League Play');
UPDATE event_types SET cost_mxn = 600 WHERE name IN ('Court Reservation', 'Reservation');
UPDATE event_types SET cost_mxn = 400 WHERE name = 'Lesson';

-- 4. Update membership costs
UPDATE membership_types SET cost_mxn = 0 WHERE name = 'Pay to Play' OR name = 'None' OR name = 'Flexible';
UPDATE membership_types SET cost_mxn = 1000 WHERE name = 'Standard';
UPDATE membership_types SET cost_mxn = 2000 WHERE name = 'Ultimate';
```

### Phase 3: Update Pricing Logic

#### Files to Update:

1. **`app/api/courts/reserve/route.ts`** (Court Reservations)
   - Current: Uses old `membership_event_costs` table
   - Change: Query `membership_event_discounts.price_mxn`, fallback to `event_types.cost_mxn`

2. **`app/api/lessons/book/route.ts`** (Lesson Booking)
   - Current: Uses `calculate_lesson_price` RPC function
   - Change: Update RPC to use `price_mxn` for court portion + coach rate

3. **Database function `calculate_lesson_price`**
   - Current: Uses `discount_amount` from `membership_event_costs`
   - Change: Use `price_mxn` from `membership_event_discounts` for court cost

4. **`components/membership-pricing-details.tsx`** (Pricing Display)
   - Current: Hardcoded values
   - Change: Pull from database or use centralized constants

5. **`app/membership/checkout/page.tsx`** (Checkout)
   - Current: Queries `discount_percentage`
   - Change: Query `price_mxn` instead

6. **`components/lesson-booking-wizard.tsx`** (Lesson Price Display)
   - Uses `calculate_lesson_price` RPC - will be updated automatically

### Phase 4: Update Database Function

```sql
-- Update calculate_lesson_price function
CREATE OR REPLACE FUNCTION calculate_lesson_price(
    p_user_id UUID,
    p_coach_rate DECIMAL,
    p_duration_hours INTEGER DEFAULT 1
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
    court_price DECIMAL;
    coach_total DECIMAL;
BEGIN
    -- Get membership-specific court price for lessons
    SELECT COALESCE(med.price_mxn, et.cost_mxn) INTO court_price
    FROM event_types et
    LEFT JOIN memberships m ON m.user_id = p_user_id
        AND m.status = 'active'
        AND m.deleted_at IS NULL
    LEFT JOIN membership_event_discounts med ON med.membership_type_id = m.membership_type_id
        AND med.event_type_id = et.id
    WHERE et.name = 'Lesson'
    LIMIT 1;

    -- If no price found, use default
    IF court_price IS NULL THEN
        SELECT cost_mxn INTO court_price FROM event_types WHERE name = 'Lesson';
    END IF;

    -- Coach rate is NOT discounted, multiply by duration
    coach_total := p_coach_rate * p_duration_hours;

    -- Court price is per booking (not per hour)
    RETURN court_price + coach_total;
END;
$$;
```

### Phase 5: Create Centralized Pricing Helper

Create `lib/pricing.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export async function getEventPrice(
  supabase: SupabaseClient<Database>,
  eventTypeId: string,
  userId?: string
): Promise<number> {
  // If no user, return base price
  if (!userId) {
    const { data: eventType } = await supabase
      .from('event_types')
      .select('cost_mxn')
      .eq('id', eventTypeId)
      .single();
    return eventType?.cost_mxn ?? 0;
  }

  // Check for active membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('membership_type_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (!membership) {
    // No membership - return base price
    const { data: eventType } = await supabase
      .from('event_types')
      .select('cost_mxn')
      .eq('id', eventTypeId)
      .single();
    return eventType?.cost_mxn ?? 0;
  }

  // Get membership-specific price
  const { data: discount } = await supabase
    .from('membership_event_discounts')
    .select('price_mxn')
    .eq('membership_type_id', membership.membership_type_id)
    .eq('event_type_id', eventTypeId)
    .maybeSingle();

  if (discount?.price_mxn !== null && discount?.price_mxn !== undefined) {
    return discount.price_mxn;
  }

  // Fallback to base price
  const { data: eventType } = await supabase
    .from('event_types')
    .select('cost_mxn')
    .eq('id', eventTypeId)
    .single();
  return eventType?.cost_mxn ?? 0;
}

export async function getLessonPrice(
  supabase: SupabaseClient<Database>,
  userId: string | undefined,
  coachRate: number,
  durationHours: number = 1
): Promise<number> {
  const courtPrice = await getEventPrice(
    supabase,
    'lesson-event-type-id', // Will need to query by name instead
    userId
  );

  // Court price + (coach rate * hours)
  return courtPrice + (coachRate * durationHours);
}
```

## Testing Plan

1. **Unit Tests**
   - Test `getEventPrice` with no membership
   - Test `getEventPrice` with Standard membership
   - Test `getEventPrice` with Ultimate membership
   - Test lesson pricing calculation

2. **Integration Tests**
   - Court reservation checkout flow
   - Lesson booking flow
   - Membership pricing display

3. **Staging Validation**
   - Create test users with each membership type
   - Verify correct prices displayed and charged

## Rollback Plan

If issues arise:
1. `discount_percentage` column is preserved - can revert pricing logic
2. Original `event_types.cost_mxn` values remain
3. Database migration can be rolled back

## Success Metrics

- [ ] All event types show correct flat prices per membership tier
- [ ] Lesson pricing correctly adds court price + coach rate
- [ ] No more percentage calculations in checkout flow
- [ ] Cleaner, more maintainable pricing code

## Timeline

1. Database migration: 1 step
2. Update pricing functions: 1 step
3. Update API routes: 1 step
4. Update frontend components: 1 step
5. Testing: 1 step