# Stripe Environment Configuration

## Overview

The app now automatically detects the environment and uses the appropriate Stripe keys:
- **Development/TestFlight**: Uses TEST Stripe keys (pk_test_...)
- **Production/App Store**: Uses LIVE Stripe keys (pk_live_...)

## How It Works

### 1. Environment Detection (`lib/environment.ts`)

The app detects the environment using:
- `__DEV__` flag for development builds
- Receipt file location for TestFlight detection
- Falls back to production (live keys) for App Store builds

### 2. Key Selection

The `getStripePublishableKey()` function automatically returns:
- Test key (`EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY`) for dev/TestFlight
- Live key (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`) for production

### 3. Usage

Both `App.tsx` and `stripeService.ts` now use the same logic:
```typescript
import { getStripePublishableKey, isTestEnvironment } from './lib/environment';

const stripePublishableKey = getStripePublishableKey();
```

## Testing

### In Development
- App will use TEST keys
- Console will show: "🔧 Stripe: Using TEST keys (Development/TestFlight)"
- Test credit cards will work (e.g., 4242 4242 4242 4242)

### In TestFlight
- App will use TEST keys
- Test credit cards will work
- Real credit cards will be declined

### In App Store (Production)
- App will use LIVE keys
- Console will show: "💳 Stripe: Using LIVE keys (Production/App Store)"
- Real credit cards will work
- Test credit cards will be declined

## Important Notes

1. **Backend Alignment**: Make sure your backend API also switches between test/live Stripe secret keys based on the environment.

2. **Environment Variables Required**:
   - `EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY`: For test mode
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: For live mode
   - Both should be set in your `.env` file

3. **TestFlight Detection**: The current implementation attempts to detect TestFlight by checking for sandbox receipts. This may need adjustment based on your specific build configuration.

4. **Fallback Behavior**: If test key is not found in test environment, it falls back to live key with a warning. If live key is not found in production, an error is logged.

## Troubleshooting

### App is using wrong keys
1. Check console logs to see which mode is active
2. Verify environment variables are set correctly
3. For TestFlight issues, you may need to implement additional detection logic

### Payment failures
1. Test mode + test card = ✅ Should work
2. Test mode + real card = ❌ Will fail
3. Live mode + real card = ✅ Should work
4. Live mode + test card = ❌ Will fail

### Backend mismatch
If you see "test/live mode mismatch" errors, ensure your backend is using the matching secret key for the environment.