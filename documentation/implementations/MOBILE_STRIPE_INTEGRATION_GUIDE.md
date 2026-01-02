# Mobile Stripe Payment Integration Guide

**Last Updated**: 2025-01-27
**Status**: Production Ready
**Web Implementation Reference**: `apps/web/components/checkout-modal.tsx`, `apps/web/app/membership/checkout/page.tsx`

## Overview

This guide provides step-by-step instructions for integrating Stripe payments in the mobile app using the **exact same flow as the web application**. The web flow is working perfectly in production, and mobile should replicate it.

## ⚠️ Critical: Use the Same Flow as Web

The mobile app should use Stripe's Payment Sheet, which is the React Native equivalent of Stripe Elements on web. Both flows work the same way:

1. Backend creates a Payment Intent (no payment method attached yet)
2. Client SDK (Payment Sheet/Elements) collects payment method and confirms payment
3. Backend receives webhook notification of successful payment

**DO NOT** try to attach payment methods server-side or confirm on the backend. Let Stripe's client SDK handle it.

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│                 │         │                  │         │             │
│  Mobile App     │────────▶│  Backend API     │────────▶│   Stripe    │
│  (React Native) │         │  (Next.js)       │         │   API       │
│                 │         │                  │         │             │
└─────────────────┘         └──────────────────┘         └─────────────┘
        │                            │                           │
        │   1. Create Payment        │                           │
        │      Intent Request        │                           │
        │───────────────────────────▶│                           │
        │                            │  2. Create Payment Intent │
        │                            │──────────────────────────▶│
        │                            │                           │
        │                            │  3. Return Client Secret  │
        │  4. Client Secret          │◀──────────────────────────│
        │◀───────────────────────────│                           │
        │                                                        │
        │  5. Present Payment Sheet                             │
        │        (User enters card)                             │
        │                                                        │
        │  6. Confirm Payment                                   │
        │───────────────────────────────────────────────────────▶│
        │                                                        │
        │  7. Payment Success                                   │
        │◀───────────────────────────────────────────────────────│
```

---

## 📦 Required Packages

```bash
npm install @stripe/stripe-react-native
```

---

## 🔧 Setup

### 1. Initialize Stripe Provider

Wrap your app with the Stripe Provider:

```typescript
// App.tsx or _layout.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

export default function App() {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.thepickleco" // Required for Apple Pay
    >
      {/* Your app components */}
    </StripeProvider>
  );
}
```

### 2. Environment Variables

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Test mode
# EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # Production mode

EXPO_PUBLIC_API_URL=https://www.thepickleco.mx
```

---

## 💳 Payment Flow Implementation

### Flow 1: New Payment Method (First-time Purchase)

This is the primary flow that matches how web works with Stripe Elements.

#### Step 1: Create Payment Intent

```typescript
import { useStripe, usePaymentSheet } from '@stripe/stripe-react-native';

const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

async function purchaseMembership(membershipType: string, amount: number) {
  try {
    // 1. Get auth token
    const session = await supabase.auth.getSession();
    if (!session?.data?.session?.access_token) {
      throw new Error('Not authenticated');
    }

    // 2. Create payment intent on backend
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify({
        amount: amount, // Amount in centavos (e.g., 299000 for 2990 MXN)
        currency: 'mxn',
        metadata: {
          type: 'membership',
          userId: session.data.session.user.id,
          membershipType: membershipType,
          locationId: '5', // Your location ID
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment intent');
    }

    const { clientSecret } = await response.json();

    // 3. Initialize Payment Sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'The Pickle Co.',
      paymentIntentClientSecret: clientSecret,
      defaultBillingDetails: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      },
      allowsDelayedPaymentMethods: false,
      returnURL: 'thepickleco://payment-return', // Deep link for your app
    });

    if (initError) {
      throw new Error(initError.message);
    }

    // 4. Present Payment Sheet to user
    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      // User canceled or error occurred
      throw new Error(presentError.message);
    }

    // 5. Payment successful! 🎉
    console.log('Payment succeeded');

    // 6. Activate membership
    await activateMembership(session.data.session.access_token);

    return { success: true };

  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
}
```

#### Step 2: Activate Membership After Payment

```typescript
async function activateMembership(accessToken: string) {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/membership/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId: user.id,
      locationId: '5',
      membershipType: membershipType,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to activate membership');
  }

  return await response.json();
}
```

---

### Flow 2: Existing Payment Method (Saved Card)

For users who already have a payment method saved, use the confirm-payment endpoint.

```typescript
async function purchaseWithSavedCard(
  paymentMethodId: string,
  amount: number,
  membershipType: string
) {
  try {
    const session = await supabase.auth.getSession();
    if (!session?.data?.session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Call confirm-payment endpoint directly
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify({
        paymentMethodId: paymentMethodId,
        amount: amount,
        currency: 'mxn',
        metadata: {
          type: 'membership',
          userId: session.data.session.user.id,
          membershipType: membershipType,
          locationId: '5',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payment failed');
    }

    const result = await response.json();
    console.log('Payment succeeded with saved card');

    return { success: true };

  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
}
```

---

## 💾 Managing Payment Methods

### Add New Payment Method

```typescript
import { useStripe } from '@stripe/stripe-react-native';

async function addPaymentMethod() {
  try {
    const session = await supabase.auth.getSession();
    if (!session?.data?.session?.access_token) {
      throw new Error('Not authenticated');
    }

    // 1. Create setup intent
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create setup intent');
    }

    const { client_secret } = await response.json();

    // 2. Initialize Payment Sheet in setup mode
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'The Pickle Co.',
      setupIntentClientSecret: client_secret,
      defaultBillingDetails: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      },
      returnURL: 'thepickleco://payment-return',
    });

    if (initError) {
      throw new Error(initError.message);
    }

    // 3. Present Payment Sheet
    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      throw new Error(presentError.message);
    }

    console.log('Payment method added successfully');
    return { success: true };

  } catch (error) {
    console.error('Add payment method error:', error);
    throw error;
  }
}
```

### List Saved Payment Methods

```typescript
async function getPaymentMethods() {
  try {
    const session = await supabase.auth.getSession();
    if (!session?.data?.session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/stripe/payment-methods?userId=${user.id}`,
      {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch payment methods');
    }

    const { paymentMethods } = await response.json();
    return paymentMethods;

  } catch (error) {
    console.error('Get payment methods error:', error);
    throw error;
  }
}
```

---

## 🎯 Complete Example Component

```typescript
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import { useStripe, usePaymentSheet } from '@stripe/stripe-react-native';
import { useAuth } from '@/hooks/useAuth'; // Your auth hook

export function MembershipPurchaseScreen() {
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);

  const membershipTypes = {
    standard: { id: 15, name: 'Standard', price: 299000 },
    ultimate: { id: 1, name: 'Ultimate', price: 499000 },
  };

  async function handlePurchase(membershipKey: 'standard' | 'ultimate') {
    setLoading(true);

    try {
      const membership = membershipTypes[membershipKey];

      // 1. Create Payment Intent
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/stripe/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: membership.price,
            currency: 'mxn',
            metadata: {
              type: 'membership',
              userId: user.id,
              membershipType: membership.name.toLowerCase(),
              locationId: '5',
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // 2. Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'The Pickle Co.',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
        },
        returnURL: 'thepickleco://payment-return',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Present Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          Alert.alert('Canceled', 'Payment was canceled');
          return;
        }
        throw new Error(presentError.message);
      }

      // 4. Success!
      Alert.alert(
        'Success',
        `${membership.name} membership activated!`,
        [{ text: 'OK', onPress: () => {/* Navigate to success screen */} }]
      );

    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Button
        title="Purchase Standard Membership"
        onPress={() => handlePurchase('standard')}
        disabled={loading}
      />
      <Button
        title="Purchase Ultimate Membership"
        onPress={() => handlePurchase('ultimate')}
        disabled={loading}
      />
    </View>
  );
}
```

---

## 🔐 Authentication

All API calls require a Supabase JWT token in the Authorization header:

```typescript
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;

fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## 💰 Pricing Reference

All amounts must be in **centavos** (smallest currency unit):

| Membership | Price (MXN) | Amount (centavos) |
|------------|-------------|-------------------|
| Pay to Play | $150 | 15000 |
| Standard | $2,990 | 299000 |
| Ultimate | $4,990 | 499000 |

Example:
```typescript
const STANDARD_PRICE = 299000; // $2,990 MXN in centavos
```

---

## 🧪 Testing

### Test Cards

Use these test cards in Stripe test mode:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 3220` | 3D Secure authentication |

- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### Testing Flow

1. Use test publishable key: `pk_test_...`
2. Create payment intent for test amount: `100` (1 peso)
3. Use test card `4242 4242 4242 4242`
4. Verify payment succeeds
5. Check Stripe Dashboard for payment

---

## 🚨 Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing or invalid authorization header" | No auth token | Ensure user is logged in and pass `Bearer ${token}` |
| "Invalid session" | Expired token | Refresh Supabase session |
| "Amount and currency are required" | Missing parameters | Include `amount` and `currency` in request |
| "Customer not found" | User has no Stripe customer | Backend creates customer automatically |
| "Payment canceled" | User closed Payment Sheet | Normal flow - no action needed |

### Error Handling Pattern

```typescript
try {
  // Payment logic
} catch (error) {
  if (error.code === 'Canceled') {
    // User canceled - don't show error
    return;
  }

  // Show error to user
  Alert.alert('Payment Failed', error.message);

  // Log for debugging
  console.error('Payment error:', {
    message: error.message,
    code: error.code,
    userId: user.id,
  });
}
```

---

## 📊 Backend API Reference

### POST `/api/stripe/create-payment-intent`

Creates a new payment intent (for new payment methods).

**Request:**
```json
{
  "amount": 299000,
  "currency": "mxn",
  "metadata": {
    "type": "membership",
    "userId": "user-uuid",
    "membershipType": "standard",
    "locationId": "5"
  }
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_xxx",
  "amount": 299000,
  "currency": "mxn",
  "status": "requires_payment_method"
}
```

### POST `/api/stripe/confirm-payment`

Confirms payment with saved payment method.

**Request:**
```json
{
  "paymentMethodId": "pm_xxx",
  "amount": 299000,
  "currency": "mxn",
  "metadata": {
    "type": "membership",
    "userId": "user-uuid",
    "membershipType": "standard",
    "locationId": "5"
  }
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pi_xxx",
    "status": "succeeded",
    "amount": 299000,
    "currency": "mxn"
  }
}
```

### POST `/api/stripe/setup-intent`

Creates setup intent for adding payment methods.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "client_secret": "seti_xxx_secret_yyy",
  "setup_intent_id": "seti_xxx",
  "customer_id": "cus_xxx",
  "status": "requires_payment_method"
}
```

### GET `/api/stripe/payment-methods?userId={uuid}`

Lists user's saved payment methods.

**Response:**
```json
{
  "paymentMethods": [
    {
      "id": "pm_xxx",
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

---

## ✅ Production Checklist

Before going live:

- [ ] Switch to live Stripe publishable key (`pk_live_...`)
- [ ] Update `EXPO_PUBLIC_API_URL` to production URL
- [ ] Test complete purchase flow with real card
- [ ] Test membership activation after payment
- [ ] Verify payment methods are saved correctly
- [ ] Test error scenarios (declined card, canceled payment)
- [ ] Set up deep linking for return URL
- [ ] Add analytics tracking for payment events
- [ ] Test on both iOS and Android
- [ ] Review Stripe Dashboard for successful payments

---

## 🔗 Deep Linking Setup

For proper return URL handling after payment:

### iOS (Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>thepickleco</string>
    </array>
  </dict>
</array>
```

### Android (AndroidManifest.xml)
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="thepickleco" />
</intent-filter>
```

---

## 📚 Additional Resources

- **Stripe React Native SDK**: https://stripe.com/docs/payments/accept-a-payment?platform=react-native
- **Payment Sheet**: https://stripe.com/docs/payments/payment-sheet?platform=react-native
- **Setup Intents**: https://stripe.com/docs/payments/save-and-reuse
- **Web Implementation**: `apps/web/components/checkout-modal.tsx`

---

## 🆘 Getting Help

If you encounter issues:

1. Check the error message in console logs
2. Verify authentication token is valid
3. Confirm environment variables are set correctly
4. Review the web implementation for reference
5. Check Stripe Dashboard for payment intent status
6. Contact backend team with specific error messages

---

## 🔄 Summary: Key Differences from Previous Approach

| ❌ Previous Approach (Wrong) | ✅ Current Approach (Correct) |
|------------------------------|------------------------------|
| Pass `paymentMethodId` to create-payment-intent | Don't pass `paymentMethodId` - let Payment Sheet handle it |
| Try to confirm payment server-side | Let Stripe SDK confirm client-side |
| Create payment method before payment intent | Payment Sheet creates and confirms in one flow |
| Manual confirmation with `confirmation_method: 'manual'` | Automatic confirmation via Payment Sheet |

**The web flow works perfectly. Mobile should match it exactly using Payment Sheet instead of Elements.**
