# Stripe Integration Setup Guide

This guide will help you complete the Stripe integration for your React Native app.

## 🚀 Frontend Setup (Completed)

The frontend components are already set up with:
- ✅ Stripe React Native SDK installed (`@stripe/stripe-react-native`)
- ✅ StripeProvider configured in App.tsx
- ✅ Payment methods management UI
- ✅ Payment history UI
- ✅ Real Stripe service calls

## 🔧 Backend Setup (Required)

### 1. Install Dependencies

```bash
npm install stripe express @supabase/supabase-js
```

### 2. Environment Variables

Add these to your backend environment:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 3. Database Schema

Add this column to your `users` table:

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
```

### 4. Backend Routes

Implement the routes from `backend-examples/stripe-routes.js` in your backend server:

```javascript
// In your main server file (e.g., app.js)
app.use('/api/stripe', require('./routes/stripe'));
```

## 📱 Frontend Environment Variables

Add to your `.env` file:

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

## 🔐 Stripe Dashboard Setup

1. **Get API Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Copy your publishable and secret keys

2. **Configure Webhooks** (optional for basic functionality):
   - Create webhook endpoint: `https://your-backend.com/api/stripe/webhooks`
   - Subscribe to events: `payment_intent.succeeded`, `setup_intent.succeeded`

## 🎯 Features Implemented

### Payment Methods Management
- ✅ Add new payment methods (cards)
- ✅ View saved payment methods
- ✅ Set default payment method
- ✅ Remove payment methods
- ✅ Secure card tokenization

### Payment Processing
- ✅ Process membership payments
- ✅ Stripe Payment Sheet integration
- ✅ Error handling and user feedback
- ✅ Payment confirmation

### Payment History
- ✅ View all past payments
- ✅ Payment status indicators
- ✅ Receipt access
- ✅ Failed payment details

## 🔄 API Endpoints

The following endpoints are available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stripe/customers` | Create/get Stripe customer |
| POST | `/api/stripe/setup-intent` | Create setup intent for new cards |
| GET | `/api/stripe/payment-methods` | Get user's payment methods |
| POST | `/api/stripe/payment-methods/default` | Set default payment method |
| DELETE | `/api/stripe/payment-methods/:id` | Remove payment method |
| GET | `/api/stripe/payment-history` | Get payment history |
| POST | `/api/stripe/payment-intent` | Create payment intent |

## 🧪 Testing

### Test Cards (Stripe Test Mode)

- **Visa**: `4242424242424242`
- **Visa (3D Secure)**: `4000000000003220`
- **Mastercard**: `5555555555554444`
- **Declined**: `4000000000000002`

### Test Flow

1. Add a test payment method using a test card
2. Set it as default
3. Process a membership payment
4. View payment history
5. Remove the payment method

## 🚨 Security Notes

- ✅ Never store card details in your database
- ✅ Use Stripe's secure tokenization
- ✅ Validate webhook signatures
- ✅ Use HTTPS in production
- ✅ Implement proper authentication

## ⚠️ Current Issue: Backend Routes Not Implemented

The frontend Stripe integration is complete, but you're getting JSON parse errors because the backend API routes don't exist yet at `https://www.thepickleco.mx/api/stripe/*`.

**To fix this immediately:**

1. **Option A: Implement Backend Routes**
   - Copy the routes from `backend-examples/stripe-routes.js` to your server
   - Add the required dependencies: `stripe`, `express`, `@supabase/supabase-js`
   - Set up the environment variables on your server

2. **Option B: Use Development Mode**
   - Start a local development server on port 3000
   - The app will automatically use `http://localhost:3000` in development mode

## 📲 URL Scheme Setup

For iOS/Android deep linking after payments:

### iOS (Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.pickleco.mobile</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>picklemobile</string>
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
  <data android:scheme="picklemobile" />
</intent-filter>
```

## 🐛 Troubleshooting

### Common Issues

1. **"No publishable key provided"**
   - Check EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is set
   - Restart Expo dev server

2. **"Customer not found"**
   - Ensure backend creates Stripe customers correctly
   - Check database has stripe_customer_id column

3. **Payment Sheet not appearing**
   - Verify setup intent creation
   - Check console for initialization errors

4. **Authentication errors**
   - Verify Supabase token is valid
   - Check backend authentication middleware

## 📚 Next Steps

1. **Production Setup**:
   - Switch to live Stripe keys
   - Configure production webhooks
   - Enable 3D Secure authentication

2. **Enhanced Features**:
   - Subscription management
   - Refund processing
   - Multi-currency support
   - Payment method validation

3. **Monitoring**:
   - Set up Stripe Dashboard alerts
   - Implement payment analytics
   - Add error tracking

## 💡 Integration Complete!

Once you implement the backend routes, your Stripe integration will be fully functional with:

- Secure payment processing
- Payment method management
- Complete payment history
- Professional user experience

The frontend is ready to go - just implement the backend endpoints and you're live! 🎉