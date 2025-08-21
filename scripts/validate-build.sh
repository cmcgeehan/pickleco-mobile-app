#!/bin/bash

# Pre-build validation script to catch errors before EAS build
# Run this before submitting to TestFlight to save 1-2 hour build times

echo "🔍 Starting pre-build validation..."
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Function to check command result
check_result() {
    if [ $? -ne 0 ]; then
        echo "❌ $1 failed"
        exit 1
    else
        echo "✅ $1 succeeded"
    fi
}

# 1. Clean install test
echo "1️⃣ Testing clean install (npm ci)..."
rm -rf node_modules
npm ci > /dev/null 2>&1
check_result "npm ci"
echo ""

# 2. TypeScript check (excluding web-pages folder)
echo "2️⃣ Checking TypeScript compilation..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "web-pages/" | grep -v "^$" || true
tsc_result=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "web-pages/" | grep -c "error" || true)
if [ "$tsc_result" -gt 0 ]; then
    echo "⚠️  TypeScript has errors in mobile app files (run 'npx tsc --noEmit' for details)"
else
    echo "✅ TypeScript compilation succeeded"
fi
echo ""

# 3. Check for Expo configuration
echo "3️⃣ Validating Expo configuration..."
npx expo-doctor
check_result "Expo doctor"
echo ""

# 4. Check environment variables
echo "4️⃣ Checking required environment variables..."
missing_vars=()

if [ -z "$EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY" ] && [ -z "$EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
    missing_vars+=("EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY or EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY")
fi

if [ -z "$EXPO_PUBLIC_API_URL" ]; then
    missing_vars+=("EXPO_PUBLIC_API_URL")
fi

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "⚠️  Warning: Missing environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
else
    echo "✅ All environment variables present"
    echo ""
fi

# 5. Check for common issues
echo "5️⃣ Checking for common issues..."

# Check React/React Native versions compatibility
react_version=$(node -p "require('./package.json').dependencies.react")
rn_version=$(node -p "require('./package.json').dependencies['react-native']")
types_version=$(node -p "require('./package.json').devDependencies['@types/react']")

echo "   React: $react_version"
echo "   React Native: $rn_version"
echo "   @types/react: $types_version"

# Check if iOS folder exists (for bare workflow)
if [ -d "ios" ]; then
    echo "   iOS folder exists (bare workflow)"
    cd ios && pod install --repo-update > /dev/null 2>&1
    check_result "Pod install"
    cd ..
else
    echo "   Using managed workflow (no iOS folder)"
fi

echo ""

# 6. Try a local preview build (optional, takes time)
echo "6️⃣ Optional: Run local preview build? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Running local preview build..."
    eas build --platform ios --local --profile preview
    check_result "Local preview build"
fi

echo ""
echo "🎉 Pre-build validation complete!"
echo ""
echo "Next steps:"
echo "1. Commit your changes: git add . && git commit -m 'Fix React version compatibility'"
echo "2. Push to repository: git push"
echo "3. Submit to EAS: eas build --platform ios --profile production"
echo ""