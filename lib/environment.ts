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
  // Fallback keys - using The Pickle Co's actual Stripe account
  const fallbackTestKey = 'pk_test_51SmeCn3KkMDNDElamvLVamllQ2HIeXboDqqPPJ3RBN7eLTIo052d90PvmlxvKXTYSyHRCXbjo71rkht9g1ZGYkzq00X3rGWD28';
  const fallbackLiveKey = 'pk_live_51NW8KjKYd7AHAjcdxGAePyTQwPf6kghEiEwvl3q1uOoklX4wMLr56ShIwRKwxphUCMuyB6vdvR31vckVjcslhvcR00XRgG1Naw';

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
    const liveKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || fallbackLiveKey;
    if (!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      console.warn('Live Stripe publishable key not found, using fallback live key');
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