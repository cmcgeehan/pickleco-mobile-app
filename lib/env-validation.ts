/**
 * Environment variable validation for The Pickle Co mobile app
 * This ensures all required environment variables are present and valid
 */

export interface AppEnvironment {
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripePublishableKey?: string;
  testStripePublishableKey?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: Partial<AppEnvironment>;
}

/**
 * Validates all environment variables and returns detailed results
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const environment: Partial<AppEnvironment> = {};

  // Required variables
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is required but not found');
  } else if (!isValidUrl(supabaseUrl)) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is not a valid URL');
  } else {
    environment.supabaseUrl = supabaseUrl;
  }

  if (!supabaseAnonKey) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required but not found');
  } else if (!isValidSupabaseKey(supabaseAnonKey)) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY appears to be invalid format');
  } else {
    environment.supabaseAnonKey = supabaseAnonKey;
  }

  // Optional but recommended variables
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const testStripeKey = process.env.EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY;

  if (!stripeKey && !testStripeKey) {
    warnings.push('No Stripe publishable keys found - payment features will be disabled');
  } else {
    if (stripeKey) {
      if (!isValidStripeKey(stripeKey)) {
        warnings.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY appears to be invalid format');
      } else {
        environment.stripePublishableKey = stripeKey;
      }
    }
    
    if (testStripeKey) {
      if (!isValidStripeKey(testStripeKey)) {
        warnings.push('EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY appears to be invalid format');
      } else {
        environment.testStripePublishableKey = testStripeKey;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    environment: environment as AppEnvironment
  };
}

/**
 * Helper function to validate URLs
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('https://') || url.startsWith('http://');
  } catch {
    return false;
  }
}

/**
 * Helper function to validate Supabase keys
 */
function isValidSupabaseKey(key: string): boolean {
  // Supabase anon keys typically start with 'eyJ' (base64 JWT)
  return key.length > 100 && (key.startsWith('eyJ') || key.includes('.'));
}

/**
 * Helper function to validate Stripe keys
 */
function isValidStripeKey(key: string): boolean {
  // Stripe publishable keys start with 'pk_'
  return key.startsWith('pk_') && key.length > 20;
}

/**
 * Log validation results in a user-friendly way
 */
export function logValidationResults(result: ValidationResult): void {
  if (result.isValid) {
    console.log('✅ Environment validation passed');
    
    if (result.warnings.length > 0) {
      console.warn('⚠️ Warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  } else {
    console.error('❌ Environment validation failed');
    console.error('Errors:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    
    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  }
}

/**
 * Get environment info for debugging (safe - no sensitive data)
 */
export function getEnvironmentInfo(): Record<string, any> {
  return {
    nodeEnv: process.env.NODE_ENV,
    expoEnv: process.env.EXPO_ENV,
    hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    hasStripeKey: !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    hasTestStripeKey: !!process.env.EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY,
    platform: 'mobile'
  };
}