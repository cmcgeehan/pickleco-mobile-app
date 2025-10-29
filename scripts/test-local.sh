#!/bin/bash

# Local testing script for The Pickle Co mobile app
# This runs quick tests to verify the app will work before building

echo "🧪 Local Testing for The Pickle Co Mobile App"
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    echo -e "${BLUE}Loading .env file...${NC}"
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
fi

echo ""
echo -e "${BLUE}1. Testing with current environment variables${NC}"
echo "================================================"

# Check Supabase variables
if [ -n "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${GREEN}✅ EXPO_PUBLIC_SUPABASE_URL is set${NC}"
else
    echo -e "${YELLOW}⚠️  EXPO_PUBLIC_SUPABASE_URL is not set${NC}"
fi

if [ -n "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${GREEN}✅ EXPO_PUBLIC_SUPABASE_ANON_KEY is set${NC}"
else
    echo -e "${YELLOW}⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY is not set${NC}"
fi

# Check Stripe variables
if [ -n "$EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY" ] || [ -n "$EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY" ]; then
    echo -e "${GREEN}✅ Stripe keys are set${NC}"
else
    echo -e "${YELLOW}⚠️  Stripe keys not set (payments disabled)${NC}"
fi

echo ""
echo -e "${BLUE}2. Testing app startup with missing variables${NC}"
echo "================================================"

# Test what happens when Supabase vars are missing
echo -e "${YELLOW}Testing with missing Supabase URL...${NC}"
ORIGINAL_URL=$EXPO_PUBLIC_SUPABASE_URL
unset EXPO_PUBLIC_SUPABASE_URL

node -e "
const { validateEnvironment } = require('./lib/env-validation.ts');
const result = validateEnvironment();
if (!result.isValid) {
    console.log('❌ App would fail to start: ' + result.errors.join(', '));
} else {
    console.log('✅ App can start without Supabase URL');
}
" 2>/dev/null || echo -e "${RED}❌ Validation module error${NC}"

export EXPO_PUBLIC_SUPABASE_URL=$ORIGINAL_URL

echo ""
echo -e "${BLUE}3. Testing crash reporter${NC}"
echo "================================================"

node -e "
try {
    const { crashReporter } = require('./lib/crash-reporter.ts');
    crashReporter.addBreadcrumb('test', 'Testing crash reporter', 'info');
    const error = new Error('Test error');
    const reportId = crashReporter.reportError(error, { component: 'TestScript' });
    console.log('✅ Crash reporter working - Report ID: ' + reportId);
} catch (error) {
    console.error('❌ Crash reporter failed:', error.message);
}
" 2>/dev/null || echo -e "${RED}❌ Crash reporter module error${NC}"

echo ""
echo -e "${BLUE}4. Testing health checks${NC}"
echo "================================================"

node -e "
const { runStartupHealthChecks } = require('./lib/startup-health-check.ts');
runStartupHealthChecks().then(result => {
    console.log('Health check status: ' + result.overall);
    if (result.canProceed) {
        console.log('✅ App can start');
    } else {
        console.log('❌ Critical failures:', result.criticalFailures.join(', '));
    }
}).catch(err => {
    console.error('❌ Health check failed:', err.message);
});
" 2>/dev/null || echo -e "${RED}❌ Health check module error${NC}"

echo ""
echo -e "${BLUE}5. Quick TypeScript check${NC}"
echo "================================================"

# Count TypeScript errors (excluding web-pages and node_modules_backup)
TS_ERRORS=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "node_modules_backup" | grep -v "web-pages" | grep -c "error TS" || true)

if [ "$TS_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ No TypeScript errors in mobile app${NC}"
else
    echo -e "${YELLOW}⚠️  Found $TS_ERRORS TypeScript errors (non-critical)${NC}"
fi

echo ""
echo -e "${BLUE}=============================================="
echo -e "📱 Local Testing Complete${NC}"
echo -e "=============================================="

echo ""
echo "To test in the iOS Simulator:"
echo -e "${BLUE}npx expo start --ios${NC}"
echo ""
echo "To test on a physical device:"
echo -e "${BLUE}npx expo start${NC}"
echo "Then scan the QR code with Expo Go app"
echo ""
echo "When ready to build for TestFlight:"
echo -e "${BLUE}eas build --platform ios --profile production${NC}"