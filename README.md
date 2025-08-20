# The Pickle Co Mobile App

A React Native mobile app built with Expo for The Pickle Co pickleball platform.

## Features

- 🏠 Home screen with welcome message
- 🎾 Play screen for finding courts and booking games
- 👤 Account screen for user profile and settings
- 📱 Native bottom tab navigation
- ✅ TestFlight deployment ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on specific platforms:
```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

## Building for Production

### EAS Build (Recommended)

1. Install EAS CLI:
```bash
npm install -g @expo/eas-cli
```

2. Build for iOS:
```bash
npx eas build --platform ios --profile preview
```

3. Submit to App Store Connect:
```bash
npx eas submit --platform ios --latest
```

## Project Structure

```
apps/mobile/
├── App.tsx           # Main app component with navigation
├── app.json          # Expo configuration
├── eas.json          # EAS build configuration
├── package.json      # Dependencies and scripts
└── assets/           # Images, icons, and static assets
```

## Configuration

- **Bundle ID**: `com.conorm15.thepickleco`
- **App Name**: The Pickle Co
- **Expo SDK**: 53.x
- **React Native**: 0.79.5
- **New Architecture**: Disabled for stability

## Deployment

The app is configured for TestFlight deployment with:
- Apple Team ID: CZTK5F93WG
- App Store Connect App ID: 6473558552
- EAS Project ID: ae973377-0305-4b4f-841a-aab23f516107

## Development Notes

This is a standalone mobile app that can be moved to its own repository. It includes:
- Clean Expo setup with latest stable versions
- React Navigation for bottom tabs
- TypeScript support
- EAS build configuration
- TestFlight submission setup