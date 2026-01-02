# Membership Comparison Section

Documentation for the mobile team on how the web membership comparison feature works.

---

## Overview

The membership page displays three membership tiers: **Pay to Play**, **Standard**, and **Ultimate**. The page uses a hybrid approach:
- **Structure and features**: Hardcoded in the web app
- **Monthly prices**: Fetched dynamically from the database

---

## Page Structure

**Route:** `/membership`
**Page file:** `apps/web/app/membership/page.tsx`

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `HowMembershipsWork` | `components/membership-hero.tsx` | Hero section explaining membership benefits |
| `MembershipComparison` | `components/membership-comparison.tsx` | Card grid showing 3 membership tiers |
| `MembershipPricingDetails` | `components/membership-pricing-details.tsx` | Detailed pricing for open play, reservations, lessons |
| `MembershipFAQ` | `components/membership-faq.tsx` | Frequently asked questions |

---

## Data Sources

### 1. Hardcoded Membership Structure

The membership tiers and their features are defined in `apps/web/app/membership/page.tsx`:

```typescript
const MEMBERSHIPS = [
  {
    nameKey: 'payToPlayName',
    priceKey: 'payToPlayPrice',
    descriptionKey: 'payToPlayDescription',
    featureKeys: [
      'payToPlayFeatureOpenPlay',
      'payToPlayFeatureLeaguePlay',
      'payToPlayFeatureReservations',
      'payToPlayFeatureLessons',
      'payToPlayFeatureClinics',
      'payToPlayFeatureGuestPasses',
      'payToPlayFeatureAccess'
    ]
  },
  {
    nameKey: 'standardName',
    priceKey: 'standardPrice',
    descriptionKey: 'standardDescription',
    featureKeys: [
      'standardFeatureOpenPlay',
      'standardFeatureLeaguePlay',
      'standardFeatureReservations',
      'standardFeatureLessons',
      'standardFeatureClinics',
      'standardFeatureGuestPasses',
      'standardFeatureAccess'
    ]
  },
  {
    nameKey: 'ultimateName',
    priceKey: 'ultimatePrice',
    descriptionKey: 'ultimateDescription',
    featureKeys: [
      'ultimateFeatureOpenPlay',
      'ultimateFeatureLeaguePlay',
      'ultimateFeatureReservations',
      'ultimateFeatureLessons',
      'ultimateFeatureClinics',
      'ultimateFeatureGuestPasses',
      'ultimateFeaturePreLaunch'
    ]
  }
]
```

All text content (names, descriptions, features) comes from **translation keys** in `en.json` and `es.json` under the `membership` namespace.

### 2. Hardcoded Membership IDs

Database IDs for checkout are hardcoded:

```typescript
const MEMBERSHIP_IDS = {
  standardName: 15,   // standard membership
  ultimateName: 1,    // ultimate membership
  payToPlayName: 16   // pay to play membership
}
```

### 3. Dynamic Pricing from Database

Monthly membership costs are fetched from the `membership_types` table:

```typescript
const { data: membershipTypes, error } = await supabase
  .from('membership_types')
  .select('name, cost_mxn')
  .is('deleted_at', null)
```

**Name mapping** (frontend key → database name):

```typescript
const MEMBERSHIP_NAME_MAP = {
  standardName: 'standard',
  ultimateName: 'ultimate',
  payToPlayName: 'pay_to_play'
}
```

### 4. Hardcoded Activity Pricing

Pricing for open play, reservations, and lessons is **hardcoded** in `components/membership-pricing-details.tsx`:

```typescript
// Open Play prices (per session)
const openPlayPrices = [
  { tier: 'flexible', amount: 350 },  // Pay to Play
  { tier: 'standard', amount: 150 },
  { tier: 'ultimate', amount: 0 }     // Free
]

// Court Reservation prices (per hour)
const reservationPrices = [
  { tier: 'flexible', amount: 600 },  // Pay to Play
  { tier: 'standard', amount: 450 },
  { tier: 'ultimate', amount: 350 }
]

// Lesson Court prices (per hour, coach fee separate)
const lessonPrices = [
  { tier: 'flexible', amount: 400 },  // Pay to Play
  { tier: 'standard', amount: 300 },
  { tier: 'ultimate', amount: 200 }
]
```

---

## Database Schema

### `membership_types` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Membership name (`standard`, `ultimate`, `pay_to_play`) |
| `description` | string | What's included |
| `cost_mxn` | number | Monthly cost in MXN |
| `deleted_at` | timestamp | Soft delete marker |

**API Query:**
```sql
SELECT name, cost_mxn
FROM membership_types
WHERE deleted_at IS NULL
```

---

## Translation Keys

All displayed text uses translation keys from the `membership` namespace. Here are the key patterns:

### Membership Names & Descriptions
- `membership.payToPlayName` → "Pay to Play" / "Pago por uso"
- `membership.standardName` → "Standard" / "Estándar"
- `membership.ultimateName` → "Ultimate" / "Ultimate"
- `membership.[tier]Description` → Description text

### Feature Lists
Pattern: `membership.[tier]Feature[FeatureName]`

Example keys for Standard:
- `membership.standardFeatureOpenPlay`
- `membership.standardFeatureLeaguePlay`
- `membership.standardFeatureReservations`
- `membership.standardFeatureLessons`
- `membership.standardFeatureClinics`
- `membership.standardFeatureGuestPasses`
- `membership.standardFeatureAccess`

### Pricing Section
- `membership.pricingOpenPlayTitle`
- `membership.pricingReservationsTitle`
- `membership.lessonCourtPricingTitle`
- `membership.free` → "Free" / "Gratis"
- `membership.perMonth` → "/month" / "/mes"

### UI Elements
- `membership.choosePlan` → CTA button text
- `membership.playNow` → CTA for Pay to Play tier
- `membership.mostPopular` → Badge on Ultimate tier

---

## Mobile Implementation Notes

### What to Fetch from Backend

1. **Monthly membership prices** from `membership_types` table
   - Query: `SELECT name, cost_mxn FROM membership_types WHERE deleted_at IS NULL`
   - Map `name` field to frontend tier names using `MEMBERSHIP_NAME_MAP`

2. **Membership IDs** for checkout
   - Use the hardcoded `MEMBERSHIP_IDS` map
   - These are used when navigating to checkout

### What to Hardcode

1. **Membership structure** - The three tiers and their feature lists
2. **Activity pricing** - Open play, reservation, and lesson court prices
3. **Translation keys** - All text content via i18n

### Display Logic

1. **Pay to Play** button navigates to `/play` (no checkout)
2. **Standard/Ultimate** buttons navigate to `/membership/checkout?id=[membershipId]`
3. **Ultimate** tier is marked as "Most Popular" with special styling
4. If prices are loading, show "Loading..." placeholder

### Price Display Format

```typescript
// For Standard/Ultimate (dynamic price from DB)
`$${price.toLocaleString()} mxn`  // e.g., "$1,500 mxn"

// For Pay to Play (static text)
t('membership', 'payToPlayPrice')  // Uses translation key
```

---

## API Endpoints

There is no dedicated API endpoint for membership data. The web app:
1. Fetches from `membership_types` table directly via Supabase client
2. Uses hardcoded values for everything else

For mobile, you may want to create an API endpoint that returns:
```json
{
  "memberships": [
    {
      "id": 1,
      "name": "ultimate",
      "displayName": { "en": "Ultimate", "es": "Ultimate" },
      "monthlyPriceMxn": 1500,
      "features": [...]
    },
    // ... other tiers
  ],
  "activityPricing": {
    "openPlay": { "payToPlay": 350, "standard": 150, "ultimate": 0 },
    "reservations": { "payToPlay": 600, "standard": 450, "ultimate": 350 },
    "lessonCourt": { "payToPlay": 400, "standard": 300, "ultimate": 200 }
  }
}
```

---

## Summary

| Data | Source | Notes |
|------|--------|-------|
| Membership tiers & features | Hardcoded | Array of objects with translation keys |
| Membership monthly prices | Database | `membership_types.cost_mxn` |
| Membership IDs for checkout | Hardcoded | Map of nameKey → database ID |
| Activity pricing (open play, etc.) | Hardcoded | Defined in `MembershipPricingDetails` component |
| All displayed text | Translation files | `en.json` / `es.json` under `membership` namespace |
