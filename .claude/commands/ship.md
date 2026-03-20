---
description: Build and submit to TestFlight or App Store
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(git:*), Bash(npm:*), Bash(npx:*), Bash(eas:*)
---

# Ship Command

Build and submit the mobile app.

## Usage

- `/ship` or `/ship testflight` - Build and submit to TestFlight (staging)
- `/ship prod` - Build and submit to App Store (production)

## Environment Summary

| Stage | API | Stripe Keys | Command |
|-------|-----|-------------|---------|
| TestFlight | staging.thepickleco.mx | Test | `eas build --profile production --auto-submit` |
| App Store | www.thepickleco.mx | Live | `eas build --profile production --auto-submit` |

**CRITICAL: The difference between TestFlight and App Store is the environment variables — make sure the correct env vars are set before building.**

## For TestFlight (`/ship testflight`)

1. **Confirm feature was tested on simulator**:
   Ask: "Confirmed you tested on the iOS simulator?"

2. **Verify we're on main**:
   ```bash
   git branch --show-current
   git status
   ```

3. **Increment build number** in `app.json`:
   - Read current `ios.buildNumber`
   - Increment by 1
   - Update `app.json`

4. **Commit the build number bump**:
   ```bash
   git add app.json
   git commit -m "chore: Bump iOS build number to [N]

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   git push origin main
   ```

5. **Build and submit to TestFlight**:
   ```bash
   cd /Users/connormcgeehan/Desktop/pickleco-mobile-app
   eas build --platform ios --profile production --auto-submit --non-interactive
   ```

6. **Report**:
   ```
   TestFlight build submitted.

   Build number: [N]
   Apple will process the build (usually 15-30 minutes).
   Check App Store Connect to monitor status.

   Once available in TestFlight, verify:
   - [ ] App installs and launches correctly
   - [ ] All new features work on real device
   - [ ] Payment flows work with test cards (4242 4242 4242 4242)
   ```

## For App Store (`/ship prod`)

**CRITICAL: Verify production environment variables are set before building!**

1. **Confirm TestFlight testing is complete**:
   Ask: "Confirmed you tested on TestFlight and everything looks good?"

2. **Verify environment config points to production**:
   - `EXPO_PUBLIC_API_URL` → `https://www.thepickleco.mx`
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` → live key (starts with `pk_live_`)

3. **Verify we're on main**:
   ```bash
   git branch --show-current
   git status
   ```

4. **Build and submit for App Store review**:
   ```bash
   cd /Users/connormcgeehan/Desktop/pickleco-mobile-app
   eas build --platform ios --profile production --auto-submit --non-interactive
   ```

5. **Report**:
   ```
   App Store build submitted for review.

   Monitor review status in App Store Connect.
   Apple review typically takes 1-3 days.

   Once approved, release to users from App Store Connect.
   ```

## Important Notes

- TestFlight builds should always use staging API + Stripe test keys
- App Store builds must use production API + Stripe live keys
- Always increment build number before each EAS build
- `main` is sacred — only merge approved features to it before shipping
