# Mobile Stripe API Integration Documentation for Web Team

This document outlines how The Pickle Co. mobile app integrates with Stripe APIs to help the web team understand what backend endpoints and functionality must be maintained.

## 🏗️ Architecture Overview

The mobile app uses a **client-server architecture** for Stripe integration:
- **Mobile App**: Uses `@stripe/stripe-react-native` SDK for secure card collection
- **Backend API**: Required at `https://www.thepickleco.mx/api/stripe/*` for server-side Stripe operations
- **Database**: Supabase with user authentication and membership management

## 📋 Required Backend API Endpoints

The mobile app expects these endpoints to be available and functioning:

### 1. Customer Management
```
POST /api/stripe/customers
```
**Purpose**: Create or retrieve Stripe customer for a user  
**Auth**: Bearer token (Supabase JWT)  
**Request Body**:
```json
{
  "userId": "uuid",
  "email": "user@example.com"
}
```
**Response**:
```json
{
  "id": "cus_...",
  "email": "user@example.com",
  "metadata": { "user_id": "uuid" }
}
```

### 2. Setup Intent (Payment Method Collection)
```
POST /api/stripe/setup-intent
```
**Purpose**: Create setup intent for adding new payment methods  
**Auth**: Bearer token  
**Request Body**:
```json
{
  "customer_id": "cus_..." // Optional - will auto-create customer if missing
}
```
**Response**:
```json
{
  "success": true,
  "client_secret": "seti_..._secret_...",
  "setup_intent_id": "seti_...",
  "customer_id": "cus_...",
  "status": "requires_payment_method"
}
```

### 3. Payment Methods Management
```
GET /api/stripe/payment-methods?userId={uuid}
```
**Purpose**: Retrieve user's saved payment methods  
**Auth**: Bearer token  
**Response**:
```json
{
  "paymentMethods": [
    {
      "id": "pm_...",
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

```
POST /api/stripe/payment-methods/default
```
**Purpose**: Set default payment method  
**Request Body**:
```json
{
  "user_id": "uuid",
  "payment_method_id": "pm_..."
}
```

```
DELETE /api/stripe/payment-methods?paymentMethodId={pm_id}
```
**Purpose**: Remove payment method

### 4. Payment Processing
```
POST /api/stripe/create-payment-intent
```
**Purpose**: Create payment intent for purchases  
**Request Body**:
```json
{
  "amount": 299000,
  "currency": "mxn",
  "paymentMethodId": "pm_...",
  "metadata": {
    "membership_type": "standard",
    "user_id": "uuid",
    "description": "Standard Membership"
  },
  "automatic_payment_methods": {
    "enabled": true,
    "allow_redirects": "never"
  },
  "payment_method_types": ["card"],
  "confirmation_method": "manual",
  "confirm": false
}
```

```
POST /api/stripe/confirm-payment
```
**Purpose**: Confirm payment and activate services  
**Request Body**:
```json
{
  "paymentIntentId": "pi_...",
  "metadata": {
    "membership_type": "standard",
    "user_id": "uuid",
    "description": "Standard Membership"
  }
}
```

### 5. Payment History
```
GET /api/stripe/payment-history?userId={uuid}
```
**Purpose**: Retrieve user's payment history  
**Response**:
```json
{
  "success": true,
  "payments": [
    {
      "id": "pi_...",
      "amount": 299000,
      "currency": "mxn",
      "status": "succeeded",
      "description": "Standard Membership",
      "created": 1640995200,
      "receipt_url": "https://pay.stripe.com/receipts/...",
      "metadata": {},
      "invoice": {
        "id": "in_...",
        "number": "ABC-001",
        "pdf": "https://..."
      },
      "payment_method": {
        "card": {
          "brand": "visa",
          "last4": "4242"
        }
      }
    }
  ],
  "totalPayments": 1,
  "totalAmount": 299000
}
```

### 6. Invoice Management
```
GET /api/stripe/invoice/{invoiceId}/pdf
```
**Purpose**: Download invoice PDF  
**Response**:
```json
{
  "success": true,
  "invoice": {
    "id": "in_...",
    "number": "ABC-001",
    "pdf_url": "https://...",
    "invoice_pdf": "https://..."
  }
}
```

## 🔐 Authentication Requirements

All endpoints require **Bearer token authentication**:
```
Authorization: Bearer {supabase_jwt_token}
```

The backend must:
1. Validate JWT tokens with Supabase
2. Extract user ID from token
3. Ensure users only access their own data
4. Check user account status (not banned/inactive)

## 🔄 Mobile App Payment Flows

### Adding a Payment Method
1. Mobile app calls `POST /api/stripe/setup-intent`
2. Backend creates Stripe setup intent and customer (if needed)
3. Mobile app uses setup intent with Stripe Payment Sheet
4. User enters card details securely in Stripe UI
5. Payment method automatically attached to customer

### Processing Membership Purchase
1. Mobile app creates payment intent via `POST /api/stripe/create-payment-intent`
2. Backend creates payment intent with metadata
3. Mobile app confirms payment via `POST /api/stripe/confirm-payment`
4. Backend confirms payment and activates membership
5. Mobile app shows success and refreshes user data

### Viewing Payment History
1. Mobile app calls `GET /api/stripe/payment-history`
2. Backend retrieves payments from Stripe for user's customer
3. Mobile app displays payments with receipt links
4. Users can tap to view receipts or download invoices

## 💳 Stripe Configuration

### Required Stripe Objects
- **Customers**: Each user gets one Stripe customer
- **Payment Methods**: Cards attached to customers
- **Setup Intents**: For collecting payment methods
- **Payment Intents**: For processing payments
- **Invoices**: Optional, for detailed receipts

### Currency & Amounts
- All amounts in **centavos** (smallest currency unit)
- Primary currency: **MXN** (Mexican Peso)
- Example: $2,990 MXN = 299000 centavos

## 🗄️ Database Integration

### Required Database Tables

```sql
-- Users table (existing)
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- Memberships table
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  stripe_payment_intent_id TEXT,
  membership_type TEXT,
  status TEXT DEFAULT 'active',
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  amount_paid INTEGER,
  currency TEXT DEFAULT 'mxn',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Database Operations
1. **Customer Creation**: Store `stripe_customer_id` in users table
2. **Payment Success**: Create/update membership record
3. **Membership Activation**: Set status to 'active' and activation timestamp

## 🔔 Webhook Requirements (Optional but Recommended)

While the mobile app doesn't directly require webhooks, they're recommended for:

```
POST /api/stripe/webhooks
```

**Important Events**:
- `payment_intent.succeeded` - Backup payment confirmation
- `setup_intent.succeeded` - Payment method collection confirmation
- `customer.updated` - Customer data changes
- `payment_method.attached` - New payment method added

**Webhook Security**:
- Verify webhook signatures with Stripe webhook secret
- Implement idempotency to handle duplicate events
- Process events asynchronously

## 🚨 Security Considerations

### ✅ Mobile App Security (Implemented)
- Never stores card data locally
- Uses Stripe's secure tokenization
- All sensitive operations server-side
- Bearer token authentication
- HTTPS only communication

### ✅ Backend Security (Required)
- Validate all Stripe webhook signatures
- Sanitize and validate all inputs
- User authorization checks
- Rate limiting on payment endpoints
- Secure environment variable storage
- PCI compliance through Stripe

## 🧪 Test Data

The mobile app is configured for Stripe test mode:

### Test Cards
- **Visa**: `4242424242424242`
- **Mastercard**: `5555555555554444` 
- **Declined**: `4000000000000002`
- **3D Secure**: `4000000000003220`

### Test Webhooks
```
whsec_test_your_webhook_secret_here
```

## 🌐 Environment Variables

### Mobile App (.env)
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=https://www.thepickleco.mx
```

### Backend (Required)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
```

## ⚠️ Critical Dependencies

The mobile app **requires** these backend endpoints to function:

1. **Must Have**: All payment method and payment processing endpoints
2. **Must Have**: User authentication via Supabase JWT validation  
3. **Should Have**: Payment history for user experience
4. **Could Have**: Webhook endpoints for reliability
5. **Could Have**: Invoice PDF generation

## 🚀 Production Checklist

Before production deployment:

### Mobile App
- [ ] Switch to live Stripe publishable key
- [ ] Update API URL to production backend
- [ ] Test all payment flows end-to-end

### Backend  
- [ ] Switch to live Stripe secret keys
- [ ] Configure production webhook endpoints
- [ ] Enable webhook signature verification
- [ ] Set up monitoring and alerts
- [ ] Implement proper logging
- [ ] Test all API endpoints

### Stripe Dashboard
- [ ] Switch from test to live mode
- [ ] Configure webhook endpoints  
- [ ] Set up Stripe monitoring
- [ ] Configure email notifications

## 📞 Support Information

**Mobile App Stripe Service**: `lib/stripeService.ts`  
**Backend Example**: `backend-examples/stripe-routes.js`  
**Setup Guide**: `STRIPE_SETUP.md`

The web team should ensure all backend endpoints match the expected API contract documented above to maintain mobile app functionality.