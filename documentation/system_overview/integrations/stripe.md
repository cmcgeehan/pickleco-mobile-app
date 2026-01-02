# Stripe Integration

This document covers Stripe integration for payments, memberships, and the pro shop.

## Overview

We use Stripe for:
- **Event/court/lesson payments** - One-time payments via Payment Intents
- **Membership subscriptions** - Recurring payments
- **Pro shop purchases** - E-commerce checkout

## Environment Configuration

### Test vs Live Mode

| Environment | Mode | Keys Used |
|-------------|------|-----------|
| Local | Test | `STRIPE_TEST_SECRET_KEY`, `NEXT_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY` |
| Staging | Test | `STRIPE_TEST_SECRET_KEY`, `NEXT_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY` |
| Production | **Live** | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |

**How mode is determined:**

```typescript
// lib/stripe.ts
function shouldUseLiveMode(): boolean {
  const envValue = (process.env.NEXT_PUBLIC_USE_LIVE_STRIPE || '').trim()
  return envValue === 'true'
}
```

The `NEXT_PUBLIC_USE_LIVE_STRIPE=true` env var is set **only on the production Vercel project**.

### Environment Variables

```bash
# Test keys (staging & local)
STRIPE_TEST_SECRET_KEY=sk_test_...
NEXT_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_...

# Live keys (production only)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mode switch (production only)
NEXT_PUBLIC_USE_LIVE_STRIPE=true
```

---

## Payment Flows

### 1. Event/Court/Lesson Payments

**Flow:**
1. User selects event/court/lesson and clicks pay
2. Frontend calls `/api/stripe/create-payment-intent`
3. Backend creates Stripe PaymentIntent with amount and metadata
4. Frontend shows Stripe Elements payment form
5. User enters card details and confirms
6. Stripe processes payment
7. Webhook confirms payment and updates database

**API Endpoint:** `POST /api/stripe/create-payment-intent`

```typescript
// Request
{
  amount: number,           // Amount in MXN (smallest unit: centavos)
  currency: 'mxn',
  metadata: {
    user_id: string,
    event_id?: string,
    type: 'event' | 'reservation' | 'lesson'
  }
}

// Response
{
  clientSecret: string,     // For Stripe Elements
  paymentIntentId: string
}
```

**Key file:** `app/api/stripe/create-payment-intent/route.ts`

### 2. Membership Subscriptions

**Flow:**
1. User goes to `/membership` and selects a plan
2. User clicks subscribe
3. Frontend calls membership API to create Stripe Checkout Session
4. User redirected to Stripe Checkout
5. User completes payment
6. Webhook creates membership record in database

**Key tables:**
- `membership_types` - Available plans
- `memberships` - User subscriptions

### 3. Pro Shop Checkout

**Flow:**
1. User adds items to cart (`/shop/cart`)
2. User proceeds to checkout (`/shop/checkout`)
3. Stripe Checkout session created
4. User completes payment
5. Order confirmation shown (`/shop/order-success`)

---

## Stripe Customer Management

Each user gets a Stripe customer ID stored in `users.stripe_customer_id`.

**Customer creation:**
```typescript
// If no customer exists, create one
if (!profile.stripe_customer_id) {
  const customer = await stripe.customers.create({
    email: profile.email,
    metadata: { user_id: sessionUser.id }
  })
  customerId = customer.id

  // Save to database
  await adminClient
    .from('users')
    .update({ stripe_customer_id: customerId })
    .eq('id', sessionUser.id)
}
```

**Test vs Live customer mismatch:**
Customers created in test mode don't exist in live mode. The code handles this:
```typescript
try {
  await stripe.customers.retrieve(customerId)
} catch (error: any) {
  if (error.code === 'resource_missing') {
    // Customer exists in different Stripe environment, create new one
    customerId = null
  }
}
```

---

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/stripe/create-payment-intent` | Create PaymentIntent for one-time payments |
| `POST /api/stripe/setup-intent` | Create SetupIntent for saving cards |
| `POST /api/stripe/confirm-payment` | Confirm a payment |
| `GET /api/stripe/payment-methods` | Get user's saved payment methods |
| `GET /api/stripe/payment-history` | Get user's payment history |
| `POST /api/webhook` | Stripe webhook handler |
| `GET /api/stripe/verify-mode` | Debug: check which Stripe mode is active |

---

## Webhooks

**Endpoint:** `POST /api/webhook`

**Events handled:**
- `payment_intent.succeeded` - Payment completed
- `customer.subscription.created` - New membership
- `customer.subscription.deleted` - Membership cancelled
- `checkout.session.completed` - Checkout completed

**Webhook secrets:**
- Staging: `STRIPE_TEST_WEBHOOK_SECRET`
- Production: `STRIPE_WEBHOOK_SECRET`

**Setting up webhooks in Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Add endpoint: `https://www.thepickleco.mx/api/webhook` (production)
3. Add endpoint: `https://staging.thepickleco.mx/api/webhook` (staging)
4. Select events to listen for
5. Copy webhook secret to env vars

---

## Frontend Integration

### Loading Stripe

```typescript
// lib/stripe.ts
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(getStripePublishableKey())
```

### Payment Form

Uses Stripe Elements for PCI compliance:
```tsx
import { Elements, PaymentElement } from '@stripe/react-stripe-js'

<Elements stripe={stripePromise} options={{ clientSecret }}>
  <PaymentElement />
</Elements>
```

---

## Currency

All amounts are in **MXN** (Mexican Pesos).

Stripe uses the smallest currency unit (centavos), so:
- $100 MXN = `10000` in Stripe

**Conversion in code:**
```typescript
const amountInCentavos = priceInPesos * 100
```

---

## Testing

### Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | 3D Secure required |

**Expiry:** Any future date
**CVC:** Any 3 digits

### Checking Stripe Mode

Visit `/api/stripe/verify-mode` or check console logs:
```
🔑 Stripe: NEXT_PUBLIC_USE_LIVE_STRIPE="true", useLive=true
🔑 Stripe Client: Using LIVE mode (production domain)
```

---

## Troubleshooting

### "Payments not working in production"

1. Check `NEXT_PUBLIC_USE_LIVE_STRIPE=true` is set
2. Check live keys are set (not test keys)
3. Check webhook secret is for live mode

### "Customer not found"

Customer IDs are environment-specific. A customer created in test mode won't exist in live mode. The code creates a new customer if needed.

### "Payment declined"

1. Check if using test card in live mode (won't work)
2. Check Stripe Dashboard for decline reason
3. Verify webhook is receiving events

### "Webhook signature verification failed"

Wrong webhook secret. Check:
- Staging uses `STRIPE_TEST_WEBHOOK_SECRET`
- Production uses `STRIPE_WEBHOOK_SECRET`

---

## Payments Table

All payments are stored in a unified `payments` table for tracking across all payment types.

### Schema

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stripe references
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT,
    stripe_charge_id TEXT,
    stripe_invoice_id TEXT,
    stripe_subscription_id TEXT,

    -- Payment details
    amount_mxn DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'mxn',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_type payment_type NOT NULL,

    -- User reference
    user_id UUID NOT NULL REFERENCES users(id),

    -- Polymorphic references to what was paid for
    event_id UUID REFERENCES events(id),
    event_registration_id UUID REFERENCES event_registrations(id),
    membership_id UUID REFERENCES memberships(id),

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

### Payment Types (Enum)

| Type | Description |
|------|-------------|
| `lesson` | Lesson booking payments |
| `event_registration` | Event/reta registration |
| `membership` | Membership subscription |
| `pro_shop` | Pro shop purchases |
| `other` | Miscellaneous |

### Payment Status (Enum)

| Status | Description |
|--------|-------------|
| `pending` | Payment created, awaiting completion |
| `processing` | Payment in progress |
| `succeeded` | Payment completed successfully |
| `failed` | Payment failed |
| `refunded` | Fully refunded |
| `partially_refunded` | Partially refunded |
| `cancelled` | Payment cancelled |

### RLS Policies

- Users can only view their own payments
- Insert/update restricted to service role (API only)

---

## Full API Endpoint Reference

These endpoints are used by both web and mobile clients.

### Customer Management

**`POST /api/stripe/customers`**

Create or retrieve Stripe customer for a user.

```typescript
// Request
{
  userId: string,
  email: string
}

// Response
{
  id: "cus_...",
  email: string,
  metadata: { user_id: string }
}
```

### Setup Intent (Save Payment Methods)

**`POST /api/stripe/setup-intent`**

Create setup intent for adding new payment methods.

```typescript
// Request
{
  customer_id?: string  // Optional - auto-creates customer if missing
}

// Response
{
  success: true,
  client_secret: "seti_..._secret_...",
  setup_intent_id: "seti_...",
  customer_id: "cus_...",
  status: "requires_payment_method"
}
```

### Payment Methods

**`GET /api/stripe/payment-methods?userId={uuid}`**

Get user's saved payment methods.

```typescript
// Response
{
  paymentMethods: [{
    id: "pm_...",
    type: "card",
    card: {
      brand: "visa",
      last4: "4242",
      exp_month: 12,
      exp_year: 2025
    },
    is_default: true
  }]
}
```

**`POST /api/stripe/payment-methods/default`**

Set default payment method.

```typescript
// Request
{
  user_id: string,
  payment_method_id: string
}
```

**`DELETE /api/stripe/payment-methods?paymentMethodId={pm_id}`**

Remove payment method.

### Payment Processing

**`POST /api/stripe/create-payment-intent`**

Create payment intent for purchases.

```typescript
// Request
{
  amount: number,              // Amount in centavos
  currency: "mxn",
  paymentMethodId?: string,    // For saved cards
  metadata: {
    user_id: string,
    event_id?: string,
    membership_type?: string,
    type: "event" | "reservation" | "lesson" | "membership"
  },
  automatic_payment_methods?: {
    enabled: true,
    allow_redirects: "never"
  },
  payment_method_types?: ["card"],
  confirmation_method?: "manual",
  confirm?: boolean
}

// Response
{
  clientSecret: string,
  paymentIntentId: string
}
```

**`POST /api/stripe/confirm-payment`**

Confirm payment and activate services.

```typescript
// Request
{
  paymentIntentId: string,
  metadata: {
    membership_type?: string,
    user_id: string,
    description: string
  }
}

// Response
{
  success: true,
  status: "succeeded",
  payment_intent: { ... }
}
```

### Payment History

**`GET /api/stripe/payment-history?userId={uuid}`**

Get user's payment history.

```typescript
// Response
{
  success: true,
  payments: [{
    id: "pi_...",
    amount: 299000,
    currency: "mxn",
    status: "succeeded",
    description: "Standard Membership",
    created: 1640995200,
    receipt_url: "https://pay.stripe.com/receipts/...",
    metadata: {},
    invoice: {
      id: "in_...",
      number: "ABC-001",
      pdf: "https://..."
    },
    payment_method: {
      card: {
        brand: "visa",
        last4: "4242"
      }
    }
  }],
  totalPayments: number,
  totalAmount: number
}
```

### Invoice Management

**`GET /api/stripe/invoice/{invoiceId}/pdf`**

Download invoice PDF.

```typescript
// Response
{
  success: true,
  invoice: {
    id: "in_...",
    number: "ABC-001",
    pdf_url: "https://...",
    invoice_pdf: "https://..."
  }
}
```

### Debug/Verification

**`GET /api/stripe/verify-mode`**

Check which Stripe mode is active (test vs live).

---

## Mobile App Integration

The mobile app uses `@stripe/stripe-react-native` SDK and communicates with these backend endpoints.

### Mobile Payment Flow (Adding Card)

1. Mobile app calls `POST /api/stripe/setup-intent`
2. Backend creates Stripe SetupIntent and customer (if needed)
3. Mobile app uses SetupIntent with Stripe Payment Sheet
4. User enters card details securely in Stripe UI
5. Payment method automatically attached to customer

### Mobile Payment Flow (Purchasing)

1. Mobile app calls `POST /api/stripe/create-payment-intent`
2. Backend creates PaymentIntent with metadata
3. Mobile app calls `POST /api/stripe/confirm-payment`
4. Backend confirms payment and activates service (membership, etc.)
5. Mobile app shows success and refreshes user data

### Mobile Environment

```env
# Mobile app .env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=https://www.thepickleco.mx
```

---

## Database Queries

### Create payment record

```typescript
await adminClient
  .from('payments')
  .insert({
    stripe_payment_intent_id: paymentIntent.id,
    amount_mxn: amount / 100,  // Convert centavos to pesos
    status: 'succeeded',
    payment_type: 'event_registration',
    user_id: userId,
    event_registration_id: registrationId,
    paid_at: new Date().toISOString()
  })
```

### Get user's payment history

```typescript
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .eq('user_id', userId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

### Update payment status

```typescript
await adminClient
  .from('payments')
  .update({
    status: 'succeeded',
    paid_at: new Date().toISOString()
  })
  .eq('stripe_payment_intent_id', paymentIntentId)
```

---

## Related Documentation

- [../core_concepts/pricing.md](../core_concepts/pricing.md) - How prices are calculated
- [../core_concepts/memberships.md](../core_concepts/memberships.md) - Membership system
- [../pages/shop.md](../pages/shop.md) - Pro shop
- [../data/schema.md](../data/schema.md) - Database schema
