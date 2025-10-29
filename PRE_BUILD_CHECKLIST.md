# Pre-Build Checklist for The Pickle Co Mobile App

## Before Every Build

Use this checklist to ensure builds are stable and won't crash on startup.

### 1. Environment Variables ✅

**Required Variables:**
- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Optional Variables (warnings if missing):**
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Production Stripe key
- [ ] `EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY` - Test Stripe key

**Validation Commands:**
```bash
# Check environment variables are set
node -e "
const { validateEnvironment, logValidationResults } = require('./lib/env-validation');
const result = validateEnvironment();
logValidationResults(result);
process.exit(result.isValid ? 0 : 1);
"
```

### 2. TypeScript Compilation ✅

**Check for critical errors:**
```bash
# Run TypeScript check (allow warnings for web components)
npx tsc --noEmit --skipLibCheck
```

**Critical files must compile without errors:**
- [ ] `App.tsx`
- [ ] `components/AuthProvider.tsx`
- [ ] `components/ErrorBoundary.tsx`
- [ ] `lib/supabase.ts`
- [ ] `stores/authStore.ts`

### 3. Startup Health Checks ✅

**Run health check validation:**
```bash
node -e "
const { runStartupHealthChecks, logHealthCheckResults } = require('./lib/startup-health-check');
runStartupHealthChecks().then(result => {
  logHealthCheckResults(result);
  console.log('Can proceed with build:', result.canProceed);
  process.exit(result.canProceed ? 0 : 1);
});
"
```

**Required checks must pass:**
- [ ] Environment Variables
- [ ] React Native Modules  
- [ ] AsyncStorage functionality

### 4. Crash Prevention Tests ✅

**Run comprehensive crash tests:**
```bash
./scripts/test-crash-fixes.sh
```

**Key scenarios tested:**
- [ ] Missing environment variables
- [ ] Supabase connection failures
- [ ] Stripe provider initialization
- [ ] Error boundary functionality
- [ ] AsyncStorage operations

### 5. Build Configuration ✅

**Check app.json configuration:**
- [ ] Build number incremented
- [ ] Bundle identifier correct
- [ ] Required permissions present
- [ ] Icon and splash screen assets exist

**EAS Build Configuration:**
```bash
# Verify EAS configuration
eas build:configure --platform ios
```

### 6. Dependencies ✅

**Check for critical dependency issues:**
```bash
# Clean install to catch dependency issues
npm ci

# Check for security vulnerabilities
npm audit --audit-level moderate
```

### 7. Manual Startup Test ✅

**Test app startup locally:**
```bash
# Start Metro bundler
npx expo start

# Test in iOS Simulator
i

# Verify app loads without JavaScript errors
# Check Metro console for red error messages
```

**Startup checklist:**
- [ ] App launches without crashing
- [ ] No red errors in Metro console
- [ ] Authentication flow works
- [ ] Navigation works correctly
- [ ] Network requests succeed

## Build Command

Only proceed with build if ALL checks pass:

```bash
# Increment build number in app.json first
# Then run the build
eas build --platform ios --profile production
```

## Post-Build Verification

After build completes:

1. **Test in TestFlight:**
   - [ ] App installs successfully
   - [ ] App launches without crashing
   - [ ] Basic navigation works
   - [ ] User can sign in/out

2. **Monitor for crashes:**
   - [ ] Check Expo dashboard for build errors
   - [ ] Monitor TestFlight crash reports
   - [ ] Check app store crash analytics

## Emergency Rollback Plan

If crashes are detected after submission:

1. **Immediate actions:**
   - Stop TestFlight distribution
   - Investigate crash reports
   - Identify root cause

2. **Quick fixes:**
   - Apply minimal fix to critical issue
   - Re-run this checklist
   - Submit hotfix build

3. **Communication:**
   - Notify TestFlight users if needed
   - Document issue and resolution

## Crash Prevention Guidelines

### For Developers:

1. **Always wrap risky operations in try-catch**
2. **Validate environment variables at startup** 
3. **Use error boundaries around major components**
4. **Test with missing/invalid environment variables**
5. **Never assume external services are available**
6. **Provide graceful degradation for optional features**

### Common Crash Causes to Avoid:

- ❌ Missing environment variables causing undefined errors
- ❌ Network requests without error handling
- ❌ Unhandled promise rejections
- ❌ Invalid prop types passed to components
- ❌ Missing null checks for optional data
- ❌ Circular import dependencies

## Success Criteria

✅ **Build is ready when:**
- All checklist items are completed
- All tests pass
- No critical TypeScript errors
- App starts successfully in simulator
- Environment validation passes
- Health checks are green

🚨 **Do NOT build if:**
- Any required environment variables are missing
- Critical TypeScript errors exist
- Health checks fail
- App crashes in simulator
- Test script fails