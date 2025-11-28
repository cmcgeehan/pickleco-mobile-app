/**
 * Detects if the app is running in a test environment (development or TestFlight)
 * Production App Store builds will use live Stripe keys
 */
export function isTestFlight(): boolean {
  // In development mode, always use test keys
  if (__DEV__) {
    return true;
  }

  // Production builds use live keys
  return false;
}

/**
 * Returns the appropriate Stripe publishable key based on the environment
 */
export function getStripePublishableKey(): string {
  // Fallback test key for App Store review
  const fallbackTestKey = 'pk_test_51QQCCkB49v2Cg5HKJHCzwLa27JQhTb2m3NVKs3ybwcJv4gLU9LjPUQ9GsXdXZjU1pIq5oNzjCpDiR2YSGv6pfQ6B00BL3kBU7F';
  
  const isTest = isTestFlight();
  
  if (isTest) {
    // Use test key for development and TestFlight
    const testKey = process.env.EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY || fallbackTestKey;
    if (!process.env.EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY) {
      console.warn('Test Stripe publishable key not found, using fallback test key');
    }
    return testKey;
  } else {
    // Use live key for production App Store
    const liveKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!liveKey) {
      console.warn('Live Stripe publishable key not found, using fallback test key');
      return fallbackTestKey;
    }
    return liveKey;
  }
}

/**
 * Returns whether we're in a test environment (dev or TestFlight)
 */
export function isTestEnvironment(): boolean {
  return __DEV__ || isTestFlight();
}