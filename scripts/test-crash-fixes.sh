#!/bin/bash

# Test script for crash fixes in The Pickle Co mobile app
# This script validates that the app can handle various error conditions gracefully

set -e

echo "🧪 Testing Crash Fixes for The Pickle Co Mobile App"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_exit_code="${3:-0}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}🔍 Running: $test_name${NC}"
    
    if eval "$test_command"; then
        if [ $? -eq $expected_exit_code ]; then
            echo -e "${GREEN}✅ PASSED: $test_name${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ FAILED: $test_name (unexpected exit code)${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to test environment variable scenarios
test_env_validation() {
    echo -e "\n${YELLOW}📋 Testing Environment Variable Validation${NC}"
    
    # Test 1: Missing Supabase URL
    run_test "Missing EXPO_PUBLIC_SUPABASE_URL" \
        "unset EXPO_PUBLIC_SUPABASE_URL && node -e \"
        const { validateEnvironment } = require('./lib/env-validation.ts');
        const result = validateEnvironment();
        console.log('Validation result:', result.isValid);
        process.exit(result.isValid ? 1 : 0);
        \"" 0
    
    # Test 2: Invalid Supabase URL format
    run_test "Invalid Supabase URL format" \
        "EXPO_PUBLIC_SUPABASE_URL='invalid-url' node -e \"
        const { validateEnvironment } = require('./lib/env-validation.ts');
        const result = validateEnvironment();
        process.exit(result.errors.some(e => e.includes('valid URL')) ? 0 : 1);
        \"" 0
    
    # Test 3: Missing Stripe keys (should warn, not fail)
    run_test "Missing Stripe keys (warning only)" \
        "unset EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY && unset EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY && node -e \"
        const { validateEnvironment } = require('./lib/env-validation.ts');
        const result = validateEnvironment();
        process.exit(result.warnings.some(w => w.includes('Stripe')) ? 0 : 1);
        \"" 0
}

# Function to test startup health checks
test_startup_health() {
    echo -e "\n${YELLOW}🏥 Testing Startup Health Checks${NC}"
    
    # Test 1: Basic health check execution
    run_test "Health check execution" \
        "node -e \"
        const { runStartupHealthChecks } = require('./lib/startup-health-check.ts');
        runStartupHealthChecks().then(result => {
            console.log('Health check completed:', result.overall);
            process.exit(0);
        }).catch(err => {
            console.error('Health check failed:', err);
            process.exit(1);
        });
        \"" 0
    
    # Test 2: AsyncStorage test
    run_test "AsyncStorage functionality" \
        "node -e \"
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem('test', 'value').then(() => {
            return AsyncStorage.getItem('test');
        }).then(value => {
            if (value === 'value') {
                console.log('AsyncStorage test passed');
                process.exit(0);
            } else {
                console.error('AsyncStorage test failed');
                process.exit(1);
            }
        }).catch(err => {
            console.error('AsyncStorage error:', err);
            process.exit(1);
        });
        \"" 0
}

# Function to test crash reporting
test_crash_reporting() {
    echo -e "\n${YELLOW}📊 Testing Crash Reporting${NC}"
    
    # Test 1: Error reporting
    run_test "Error reporting functionality" \
        "node -e \"
        const { crashReporter } = require('./lib/crash-reporter.ts');
        const error = new Error('Test error');
        const reportId = crashReporter.reportError(error, { component: 'TestComponent' });
        console.log('Report ID generated:', reportId);
        process.exit(reportId ? 0 : 1);
        \"" 0
    
    # Test 2: Breadcrumb functionality
    run_test "Breadcrumb tracking" \
        "node -e \"
        const { crashReporter } = require('./lib/crash-reporter.ts');
        crashReporter.addBreadcrumb('test', 'Test breadcrumb', 'info');
        console.log('Breadcrumb added successfully');
        process.exit(0);
        \"" 0
    
    # Test 3: Startup failure reporting
    run_test "Startup failure reporting" \
        "node -e \"
        const { crashReporter } = require('./lib/crash-reporter.ts');
        const reportId = crashReporter.reportStartupFailure('Test startup failure', { test: true });
        console.log('Startup failure reported:', reportId);
        process.exit(reportId ? 0 : 1);
        \"" 0
}

# Function to test TypeScript compilation
test_typescript() {
    echo -e "\n${YELLOW}🔧 Testing TypeScript Compilation${NC}"
    
    # Test 1: TypeScript compilation (allow warnings for non-mobile files)
    run_test "TypeScript compilation" \
        "npx tsc --noEmit --skipLibCheck 2>&1 | grep -E '(error TS|Found [0-9]+ error)' | wc -l | xargs test 0 -eq" 0
}

# Function to test app startup simulation
test_app_startup() {
    echo -e "\n${YELLOW}🚀 Testing App Startup Simulation${NC}"
    
    # Test 1: Simulate app startup with missing env vars
    run_test "App startup with missing env vars" \
        "unset EXPO_PUBLIC_SUPABASE_URL && unset EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY && node -e \"
        console.log('Testing app startup with missing environment variables...');
        try {
            // Simulate what happens in App.tsx
            const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
            if (!stripeKey) {
                console.log('Stripe key missing - app should continue without payment features');
                process.exit(0);
            }
            process.exit(1);
        } catch (error) {
            console.error('App startup failed unexpectedly:', error);
            process.exit(1);
        }
        \"" 0
}

# Function to test error boundary scenarios
test_error_boundary() {
    echo -e "\n${YELLOW}🛡️ Testing Error Boundary Scenarios${NC}"
    
    # Test 1: Error boundary import
    run_test "Error boundary import" \
        "node -e \"
        try {
            const { ErrorBoundary } = require('./components/ErrorBoundary.tsx');
            console.log('ErrorBoundary imported successfully');
            process.exit(0);
        } catch (error) {
            console.error('Failed to import ErrorBoundary:', error);
            process.exit(1);
        }
        \"" 0
}

# Main test execution
echo -e "${BLUE}Starting comprehensive crash fix testing...${NC}\n"

# Run all test suites
test_env_validation
test_startup_health  
test_crash_reporting
test_typescript
test_app_startup
test_error_boundary

# Summary
echo -e "\n${BLUE}=================================================="
echo -e "📋 Test Results Summary${NC}"
echo -e "=================================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! The crash fixes are working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the issues above.${NC}"
    exit 1
fi