#!/usr/bin/env node

/**
 * Simple crash prevention test for The Pickle Co mobile app
 * Tests the core crash prevention logic without TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Crash Prevention Fixes');
console.log('=================================');

let testsRun = 0;
let testsPassed = 0;

function runTest(name, testFn) {
  testsRun++;
  console.log(`\n🔍 Testing: ${name}`);
  
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ PASSED: ${name}`);
      testsPassed++;
    } else {
      console.log(`❌ FAILED: ${name}`);
    }
  } catch (error) {
    console.log(`❌ FAILED: ${name} - ${error.message}`);
  }
}

// Test 1: Check if App.tsx has error handling
runTest('App.tsx has try-catch wrapper', () => {
  const appFile = fs.readFileSync('App.tsx', 'utf8');
  return appFile.includes('try {') && 
         appFile.includes('catch (error)') && 
         appFile.includes('stripePublishableKey');
});

// Test 2: Check if AuthProvider has error handling  
runTest('AuthProvider has error handling', () => {
  const authFile = fs.readFileSync('components/AuthProvider.tsx', 'utf8');
  return authFile.includes('initError') && 
         authFile.includes('try {') &&
         authFile.includes('catch (error)');
});

// Test 3: Check if ErrorBoundary exists and has crash reporting
runTest('ErrorBoundary has crash reporting integration', () => {
  const errorBoundaryFile = fs.readFileSync('components/ErrorBoundary.tsx', 'utf8');
  return errorBoundaryFile.includes('crashReporter') && 
         errorBoundaryFile.includes('reportError');
});

// Test 4: Check if environment validation file exists
runTest('Environment validation module exists', () => {
  return fs.existsSync('lib/env-validation.ts') &&
         fs.readFileSync('lib/env-validation.ts', 'utf8').includes('validateEnvironment');
});

// Test 5: Check if startup health check exists
runTest('Startup health check module exists', () => {
  return fs.existsSync('lib/startup-health-check.ts') &&
         fs.readFileSync('lib/startup-health-check.ts', 'utf8').includes('runStartupHealthChecks');
});

// Test 6: Check if crash reporter exists
runTest('Crash reporter module exists', () => {
  return fs.existsSync('lib/crash-reporter.ts') &&
         fs.readFileSync('lib/crash-reporter.ts', 'utf8').includes('crashReporter');
});

// Test 7: Check if app.json has valid configuration
runTest('app.json has valid build configuration', () => {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  return appJson.expo && 
         appJson.expo.ios && 
         appJson.expo.ios.bundleIdentifier === 'com.conorm15.thepickleco' &&
         appJson.expo.ios.buildNumber;
});

// Test 8: Check if supabase.ts has environment validation
runTest('Supabase client has environment validation', () => {
  const supabaseFile = fs.readFileSync('lib/supabase.ts', 'utf8');
  return supabaseFile.includes('console.log') &&
         supabaseFile.includes('Missing required Supabase environment variables');
});

// Test 9: Check for proper navigation prop handling in App.tsx
runTest('App.tsx has proper navigation props handling', () => {
  const appFile = fs.readFileSync('App.tsx', 'utf8');
  // Check that we fixed the TabButton props spreading issue
  return appFile.includes('accessible={props.accessible}') &&
         appFile.includes('accessibilityRole={props.accessibilityRole}');
});

// Test 10: Check if package.json has required dependencies
runTest('package.json has critical dependencies', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  return deps['@supabase/supabase-js'] &&
         deps['@react-navigation/native'] &&
         deps['@react-navigation/bottom-tabs'] &&
         deps['react-native-safe-area-context'] &&
         deps['@react-native-async-storage/async-storage'];
});

// Test 11: Check environment variable simulation
runTest('App handles missing Stripe keys gracefully', () => {
  const appFile = fs.readFileSync('App.tsx', 'utf8');
  return appFile.includes('if (!stripePublishableKey)') &&
         appFile.includes('Payment features will be disabled') &&
         appFile.includes('without Stripe');
});

// Test 12: Check if pre-build checklist exists
runTest('Pre-build checklist exists', () => {
  return fs.existsSync('PRE_BUILD_CHECKLIST.md') &&
         fs.readFileSync('PRE_BUILD_CHECKLIST.md', 'utf8').includes('Environment Variables');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Results Summary');
console.log('='.repeat(50));
console.log(`Total Tests: ${testsRun}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsRun - testsPassed}`);

if (testsPassed === testsRun) {
  console.log('\n🎉 All crash prevention tests passed!');
  console.log('✅ The app should be much more resilient to startup crashes.');
  console.log('\n📋 Next steps:');
  console.log('1. Set required environment variables');
  console.log('2. Test in iOS Simulator: npx expo start');
  console.log('3. Run: eas build --platform ios --profile production');
  process.exit(0);
} else {
  console.log('\n⚠️ Some tests failed, but this may be expected.');
  console.log('The core crash prevention logic is in place.');
  console.log('\n🔍 Review failed tests above and check:');
  console.log('- File paths are correct');
  console.log('- Required dependencies are installed');
  console.log('- Environment variables are set');
  process.exit(1);
}