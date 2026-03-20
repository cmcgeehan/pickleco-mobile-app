# Android Play Store Launch Implementation

**Started:** 2025-01-02
**Status:** Planning
**Target:** Google Play Store (Production)

## Overview

Launch The Pickle Co mobile app on the Google Play Store to reach Android users. The app already has basic Android configuration in `app.json` but requires Google Play Console setup, credentials configuration, and store listing preparation.

## Related Documentation

Documents reviewed before starting:
- [mobile_architecture.md](../system_overview/mobile_architecture.md) - App architecture
- [development_workflow.md](../system_overview/development_workflow.md) - Deployment workflow

## Current State Assessment

### What We Have
- [x] Android configuration in `app.json`:
  - Package name: `com.thepickleco.app`
  - Version code: 1
  - Adaptive icon configured
  - Notification settings
- [x] EAS project configured
- [x] Working iOS app (reference for feature parity)
- [x] Assets: icon.png, adaptive-icon.png, splash-icon.png

### What We Need
- [ ] Google Play Developer Account ($25 one-time fee)
- [ ] Google Play Console app created
- [ ] Android signing keystore (EAS can manage)
- [ ] Google Play API service account (for automated submissions)
- [ ] EAS submit configuration for Android
- [ ] Store listing assets and metadata
- [ ] Privacy policy URL
- [ ] Content rating questionnaire completed

---

## Implementation Plan

### Phase 1: Google Play Account Setup

#### 1.1 Google Play Developer Account
**Prerequisites:** Google account, $25 USD payment

**Steps:**
1. Go to https://play.google.com/console/signup
2. Pay the one-time $25 registration fee
3. Complete developer profile (name, address, contact info)
4. Verify identity (may require ID verification for individual accounts)

**Note:** Account approval can take 24-48 hours.

#### 1.2 Create App in Google Play Console
1. Click "Create app" in Play Console
2. Enter app details:
   - **App name:** The Pickle Co
   - **Default language:** English (US)
   - **App type:** App (not game)
   - **Free or paid:** Free
3. Complete declarations (ads, content guidelines)

---

### Phase 2: EAS Configuration for Android

#### 2.1 Generate Upload Keystore
EAS can manage the keystore automatically. Run:
```bash
eas credentials --platform android
```

This will:
- Generate a new upload keystore
- Store it securely on EAS servers
- Configure signing for builds

#### 2.2 Update eas.json for Android Submission
Add Android submit configuration:

```json
{
  "submit": {
    "production": {
      "ios": { ... },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

#### 2.3 Google Play API Service Account
**For automated submissions via EAS:**

1. Go to Google Play Console → Setup → API access
2. Click "Create new service account"
3. Follow link to Google Cloud Console
4. Create service account with name like "eas-submit"
5. Grant role "Service Account User"
6. Create JSON key and download
7. Back in Play Console, grant "Release manager" permission to service account
8. Save JSON key as `google-service-account.json` (add to .gitignore!)

**Alternative:** Manual upload via Play Console (no service account needed)

---

### Phase 3: Store Listing Preparation

#### 3.1 Required Assets

| Asset | Dimensions | Format | Status |
|-------|------------|--------|--------|
| App icon | 512 x 512 px | PNG (32-bit, no alpha) | Needs creation |
| Feature graphic | 1024 x 500 px | PNG or JPEG | Needs creation |
| Phone screenshots (2-8) | 16:9 or 9:16 | PNG or JPEG | Needs capture |
| 7" tablet screenshots | 16:9 or 9:16 | Optional | - |
| 10" tablet screenshots | 16:9 or 9:16 | Optional | - |

#### 3.2 Store Listing Text

**Short description (80 chars max):**
> Book pickleball lessons, join events, and manage your membership at The Pickle Co.

**Full description (4000 chars max):**
```
The Pickle Co is Mexico City's premier pickleball club. Our app makes it easy to:

🎾 BOOK LESSONS
Find and book lessons with our certified coaches. View coach profiles, check availability, and pay securely in-app.

📅 JOIN EVENTS
Browse our calendar of open play sessions, tournaments, clinics, and social events. Register with one tap.

💎 MANAGE MEMBERSHIP
View your membership benefits, track your playing history, and upgrade your plan anytime.

💳 EASY PAYMENTS
Secure payment processing powered by Stripe. Save your card for quick checkout.

🔔 STAY UPDATED
Get notified about upcoming events, lesson reminders, and club announcements.

Whether you're a beginner or a seasoned player, The Pickle Co app helps you get on the court and improve your game.

Download now and join Mexico City's fastest-growing pickleball community!
```

#### 3.3 Other Required Information

- **Category:** Sports
- **Content rating:** Complete questionnaire (likely "Everyone")
- **Contact email:** [Required]
- **Privacy policy URL:** https://www.thepickleco.mx/privacy (verify exists)
- **Target audience:** Adults 18+

---

### Phase 4: Build and Test

#### 4.1 Build Android APK/AAB
```bash
# Build for internal testing first
eas build --platform android --profile production
```

This creates an Android App Bundle (AAB) file.

#### 4.2 Internal Testing Track
1. Upload AAB to Play Console → Internal testing
2. Add testers (email addresses)
3. Testers install via Play Store link
4. Verify all features work:
   - [ ] Login/signup
   - [ ] Event browsing and registration
   - [ ] Membership purchase (test mode)
   - [ ] Lesson booking
   - [ ] Profile management
   - [ ] Push notifications

#### 4.3 Test Payment Flows
- Use Stripe test mode for internal testing
- Verify payment sheet displays correctly on Android
- Test saved payment methods

---

### Phase 5: Release

#### 5.1 Closed Testing (Optional)
- Larger beta group before public release
- Collect feedback and fix issues

#### 5.2 Production Release
1. Complete all store listing requirements
2. Submit for review
3. Google review typically takes 1-3 days (can be longer for new apps)
4. Once approved, roll out to production

#### 5.3 Post-Launch
- Monitor crash reports in Play Console
- Respond to user reviews
- Plan update cadence

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Account verification delays | Medium | Start account setup early |
| Stripe not working on Android | High | Test thoroughly in internal track |
| Review rejection | Medium | Follow content policies carefully |
| Missing Android-specific bugs | Medium | Extensive testing before submission |

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Account setup | 1-3 days (verification) |
| EAS configuration | 1 day |
| Store listing prep | 1-2 days |
| Build and test | 2-3 days |
| Review and release | 1-7 days |
| **Total** | **1-2 weeks** |

---

## Questions to Resolve

1. Do you already have a Google Play Developer account?
2. Do you have a privacy policy page on the website?
3. Do you want automated submissions (requires service account setup) or manual uploads?
4. Who should be added as internal testers?
5. Do you have brand assets (feature graphic, promotional images)?

---

## Commands Quick Reference

```bash
# Check Android credentials
eas credentials --platform android

# Build for Android
eas build --platform android --profile production

# Build and auto-submit (requires service account)
eas build --platform android --profile production --auto-submit

# Submit existing build
eas submit --platform android --latest
```

---

## Documentation Updates Needed

After launch:
- [ ] Update mobile_architecture.md with Android-specific notes
- [ ] Update development_workflow.md with Android submission steps
- [ ] Add Google Play Console links to ops documentation
