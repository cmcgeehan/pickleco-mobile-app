# Mobile Event Registration: Waiver & Payment Flow

**Created:** 2025-12-14
**For:** Mobile Development Team
**Reference Implementation:** Web (`components/event-modal.tsx`)

## Overview

This document describes the complete flow for event registration in the mobile app, including waiver verification and payment processing. The mobile app must implement the same flow as the web to ensure consistent behavior.

---

## Complete Registration Flow

```
User taps "Register" for event
         │
         ▼
1. Verify user is authenticated
   ├── If not → Show login screen
         │
         ▼
2. Check capacity (event not full)
   ├── If full → Show "Event Full" message, disable button
         │
         ▼
3. Check waiver status (userProfile.has_signed_waiver)
   ├── If not signed → Show Waiver Screen
   ├── On accept → POST /api/users/waiver
   ├── Continue after waiver accepted
         │
         ▼
4. Fetch membership-aware pricing
   ├── GET /api/events/price?eventTypeId={id}&userId={id}
   ├── Returns userPrice based on membership tier
         │
         ▼
5. Check if payment required (userPrice > 0)
   ├── If price = 0 → Skip to step 7
   ├── If price > 0 → Show Payment Screen
         │
         ▼
6. Process payment
   ├── Fetch saved payment methods
   ├── User selects method or adds new one
   ├── POST /api/stripe/confirm-payment
   ├── On success → Continue to step 7
         │
         ▼
7. Create registration
   ├── POST /api/play/book
         │
         ▼
8. Show success confirmation
```

---

## Step-by-Step Implementation

### Step 1: Authentication Check

```typescript
// Before any registration action
if (!user) {
  navigateToLogin()
  return
}
```

### Step 2: Capacity Check

The event object includes `capacity` and `participants` (or registration count). Check before allowing registration:

```typescript
const isEventFull = event.participants?.length >= event.capacity

if (isEventFull) {
  showAlert('Event Full', 'This event has reached capacity')
  return
}
```

### Step 3: Waiver Check & Signing

**Check waiver status from user profile:**

```typescript
// User profile includes has_signed_waiver boolean
if (!userProfile.has_signed_waiver) {
  showWaiverScreen()
  return
}
```

**Waiver Screen Requirements:**
- Display full waiver text (scrollable)
- Checkbox: "I have read and understand this waiver"
- "Accept" button (disabled until checkbox checked)

**API Endpoint:** `POST /api/users/waiver`

```typescript
// Request
const response = await fetch(`${API_URL}/api/users/waiver`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    userId: user.id
  })
})

// Response (success)
{
  "profile": {
    "id": "uuid",
    "has_signed_waiver": true,
    // ... other profile fields
  }
}
```

**After waiver accepted:** Update local user profile and continue with registration flow.

### Step 4: Fetch Membership-Aware Pricing

**API Endpoint:** `GET /api/events/price`

```typescript
// Request
const params = new URLSearchParams({
  eventTypeId: event.event_type_id,
  userId: user.id  // Include for membership pricing
})

const response = await fetch(`${API_URL}/api/events/price?${params}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})

// Response
{
  "basePrice": 350,        // Non-member price
  "userPrice": 0,          // User's price (0 if Ultimate member for retas)
  "membershipType": "Ultimate",  // User's membership tier or null
  "isDiscounted": true,    // Whether user gets a discount
  "savings": 350           // Amount saved
}
```

**Pricing Logic:**
| Event Type | No Membership | Standard | Ultimate |
|------------|---------------|----------|----------|
| Reta       | $350 MXN      | $150 MXN | $0 MXN   |
| Reservation| $600 MXN      | $450 MXN | $350 MXN |
| Lesson     | $400 MXN      | $300 MXN | $200 MXN |

### Step 5: Payment Required Check

```typescript
const isPaymentRequired = pricingInfo.userPrice > 0

if (isPaymentRequired) {
  showPaymentScreen()
} else {
  // Skip payment, go directly to registration
  await completeRegistration()
}
```

### Step 6: Payment Processing

#### 6a. Fetch Saved Payment Methods

**API Endpoint:** `GET /api/stripe/payment-methods`

```typescript
const response = await fetch(
  `${API_URL}/api/stripe/payment-methods?userId=${user.id}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
)

// Response
{
  "paymentMethods": [
    {
      "id": "pm_1234...",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025
      },
      "is_default": true
    }
  ]
}
```

#### 6b. Payment Screen UI

Display saved payment methods as selectable cards:
- Show card brand icon
- Show last 4 digits: "VISA •••• 4242"
- Show expiry: "12/25"
- Radio button or checkmark for selection
- "Add New Card" button at bottom

If no saved methods:
- Show "No saved payment methods" message
- Show "Add Payment Method" button

#### 6c. Adding New Payment Method

Use Stripe React Native SDK with SetupIntent:

**API Endpoint:** `POST /api/stripe/setup-intent`

```typescript
// Request
const response = await fetch(`${API_URL}/api/stripe/setup-intent`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    // customer_id is optional - will be created if missing
  })
})

// Response
{
  "success": true,
  "client_secret": "seti_xxx_secret_xxx",
  "setup_intent_id": "seti_xxx",
  "customer_id": "cus_xxx",
  "status": "requires_payment_method"
}
```

**Mobile Implementation (React Native):**

```typescript
import { useStripe } from '@stripe/stripe-react-native'

const { initPaymentSheet, presentPaymentSheet } = useStripe()

// Initialize with SetupIntent
await initPaymentSheet({
  setupIntentClientSecret: setupIntentResponse.client_secret,
  merchantDisplayName: 'The Pickle Co',
  // ... other options
})

// Present payment sheet
const { error } = await presentPaymentSheet()

if (!error) {
  // Card saved successfully
  // Re-fetch payment methods
  await fetchPaymentMethods()
}
```

#### 6d. Confirm Payment with Saved Method

**API Endpoint:** `POST /api/stripe/confirm-payment`

```typescript
// IMPORTANT: Amount must be in centavos (smallest currency unit)
// $500 MXN = 50000 centavos
const amountInCentavos = pricingInfo.userPrice * 100

const response = await fetch(`${API_URL}/api/stripe/confirm-payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    paymentMethodId: selectedPaymentMethod.id,
    amount: amountInCentavos,
    currency: 'mxn',
    metadata: {
      userId: user.id,
      type: 'event_registration',
      eventId: event.id,
      description: event.name || event.title
    }
  })
})

// Response (success)
{
  "success": true,
  "payment": {
    "id": "pi_xxx",
    "status": "succeeded",
    "amount": 50000,
    "currency": "mxn",
    "metadata": { ... }
  }
}
```

**Error Handling:**

```typescript
if (!response.ok) {
  const error = await response.json()

  if (error.error === 'Customer not found') {
    // User's Stripe customer needs to be created
    // This is handled automatically, but handle gracefully
  } else if (error.error === 'Payment method not authorized') {
    // Payment method doesn't belong to this customer
    // Refresh payment methods and try again
  } else {
    showAlert('Payment Failed', error.error || 'Unable to process payment')
  }
  return
}
```

### Step 7: Complete Registration

**API Endpoint:** `POST /api/play/book`

```typescript
const response = await fetch(`${API_URL}/api/play/book`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    type: event.type || 'event',  // e.g., 'open_play', 'round_robin'
    eventId: event.id,
    locationId: selectedLocation.id  // Number
  })
})

// Response (success)
{
  "success": true
}

// Response (error examples)
{
  "error": "Event not found"
}
{
  "error": "Event is full",
  "code": "EVENT_FULL"
}
{
  "error": "Already registered"
}
{
  "error": "Waiver not signed",
  "code": "WAIVER_REQUIRED",
  "requireWaiver": true
}
```

**Handling WAIVER_REQUIRED error:**

If the API returns `WAIVER_REQUIRED`, the client-side check was bypassed. Show the waiver modal and retry:

```typescript
if (error.code === 'WAIVER_REQUIRED' || error.requireWaiver) {
  showWaiverScreen()
  // After waiver accepted, retry registration
}
```

---

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/users/waiver` | POST | Sign waiver |
| `/api/events/price` | GET | Get membership-aware pricing |
| `/api/stripe/payment-methods` | GET | List saved payment methods |
| `/api/stripe/setup-intent` | POST | Create SetupIntent for adding card |
| `/api/stripe/confirm-payment` | POST | Process payment with saved card |
| `/api/play/book` | POST | Create event registration |

---

## Data Models

### User Profile (relevant fields)

```typescript
interface UserProfile {
  id: string
  has_signed_waiver: boolean
  stripe_customer_id: string | null
  membership_type_id: string | null
  // ... other fields
}
```

### Payment Method

```typescript
interface PaymentMethod {
  id: string            // Stripe payment method ID (pm_xxx)
  type: 'card'
  card: {
    brand: string       // 'visa', 'mastercard', 'amex', etc.
    last4: string       // '4242'
    exp_month: number   // 12
    exp_year: number    // 2025
  }
  is_default?: boolean
}
```

### Pricing Info

```typescript
interface PricingInfo {
  basePrice: number       // Non-member price in MXN pesos
  userPrice: number       // User's price (after membership discount)
  membershipType: string | null  // 'Standard', 'Ultimate', or null
  isDiscounted: boolean   // true if user gets a discount
  savings: number         // Amount saved in MXN pesos
}
```

---

## Currency Handling

**IMPORTANT:** Stripe expects amounts in the smallest currency unit.

- MXN uses centavos (1 peso = 100 centavos)
- `$500 MXN` → send `50000` to Stripe
- Prices from API are in pesos, multiply by 100 before sending to Stripe

```typescript
// Converting for Stripe
const stripeAmount = priceInPesos * 100

// Converting from Stripe for display
const displayPrice = stripeAmount / 100
```

---

## Error Codes

| Code | HTTP Status | Meaning | Action |
|------|-------------|---------|--------|
| `WAIVER_REQUIRED` | 403 | User hasn't signed waiver | Show waiver screen |
| `EVENT_FULL` | 400 | Event at capacity | Show full message |
| `ALREADY_REGISTERED` | 400 | User already registered | Show registered state |
| `DUPR_NOT_LINKED` | 403 | DUPR account not linked | Prompt DUPR linking |
| - | 401 | Not authenticated | Redirect to login |

---

## Testing

### Test Cards (Stripe Test Mode)

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | 3D Secure required |

**Use any future expiry date and any 3-digit CVC.**

### Test Scenarios

- [ ] Register as non-member (should pay full price)
- [ ] Register as Standard member (should pay discounted price)
- [ ] Register as Ultimate member for reta (should be free)
- [ ] Attempt registration without signed waiver
- [ ] Attempt registration when event is full
- [ ] Payment with saved card
- [ ] Adding new payment method
- [ ] Re-register after unregistering

---

## Stripe SDK Setup (React Native)

```typescript
// App.tsx or equivalent
import { StripeProvider } from '@stripe/stripe-react-native'

<StripeProvider
  publishableKey={STRIPE_PUBLISHABLE_KEY}
  merchantIdentifier="merchant.com.thepickleco"
>
  <App />
</StripeProvider>
```

**Environment Variables:**

```env
# Development/Staging
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Production
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Related Documentation

- [Waiver System](../system_overview/core_concepts/waiver.md)
- [Pricing System](../system_overview/core_concepts/pricing.md)
- [Stripe Integration](../system_overview/integrations/stripe.md)
- [Event Registration API](../system_overview/api/events_registration.md)
