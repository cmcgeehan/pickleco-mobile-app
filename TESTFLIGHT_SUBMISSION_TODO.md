# 📋 TestFlight Submission TODO - Action Items for You

This document contains **everything YOU need to do** to get The Pickle Co app ready for TestFlight external testing. Items are organized by priority.

---

## 🚨 CRITICAL - Must Complete Before Submission

These items will **block your submission** if not completed.

### 1. ✅ Host Privacy Policy (CRITICAL - HIGHEST PRIORITY)

**What:** Apple requires a publicly accessible Privacy Policy URL

**Action Steps:**
1. Open the file `PRIVACY_POLICY.md` (I created this for you)
2. Review and customize:
   - Update `[Current Date]` with today's date
   - Replace `[Your Physical Address]` with your business address
   - Review all content to ensure accuracy
   - Make any necessary edits for your specific situation

3. Host the policy on your website:
   ```
   Option A: Create a page at https://www.thepickleco.mx/privacy
   Option B: Use a service like Termly or iubenda
   Option C: Host as a PDF on your server
   ```

4. **Verify it's accessible:**
   - Open the URL in a web browser
   - Make sure it's publicly accessible (no login required)
   - Copy the final URL for App Store Connect

**URL to use in App Store Connect:**
```
https://www.thepickleco.mx/privacy
```

**Time Estimate:** 30 minutes - 1 hour

---

### 2. ✅ Take App Screenshots (REQUIRED)

**What:** Apple requires at least 1 set of screenshots (6.7" display)

**Action Steps:**

1. **Follow the guide:** Open `SCREENSHOT_GUIDE.md` for detailed instructions

2. **Quick method:**
   ```bash
   # Open simulator with correct device
   npx expo run:ios --device "iPhone 15 Pro Max"

   # Override status bar (optional but professional)
   xcrun simctl status_bar "iPhone 15 Pro Max" override --time "9:41" --batteryState charged --batteryLevel 100

   # Navigate to each screen and press Cmd+S to save
   ```

3. **Required screenshots (minimum 5 recommended):**
   - Screenshot 1: Calendar/Court Booking (MOST IMPORTANT)
   - Screenshot 2: Lessons/Coaching
   - Screenshot 3: Play/Community Features
   - Screenshot 4: Membership Options
   - Screenshot 5: Profile/Account

4. **Save screenshots to a folder:**
   ```
   ~/Desktop/AppStoreScreenshots/
   ```

5. **Quality check:**
   - [ ] Dimensions are 1290 x 2796 pixels (6.7" display)
   - [ ] No personal information visible
   - [ ] Using demo account content
   - [ ] Professional appearance (no errors, loading states)
   - [ ] Status bar shows 9:41, full battery

**Files needed:**
- Minimum: 1 screenshot
- Recommended: 5 screenshots
- Maximum: 10 screenshots

**Time Estimate:** 30 minutes - 1 hour

---

### 3. ✅ Verify Test Account Works in Production

**What:** Ensure the demo account Apple will use actually works

**Action Steps:**

1. **Test in production environment:**
   - Build a production version or use current TestFlight build
   - Try logging in with test credentials:
     ```
     Email: conor+appstorereview@thepickleco.mx
     Password: 0@8P3P0S2T0O2R5e
     ```

2. **Verify all key features work:**
   - [ ] Can sign in successfully
   - [ ] Can view calendar/bookings
   - [ ] Can browse lessons
   - [ ] Can view membership options
   - [ ] Can access profile/settings
   - [ ] Notifications work (if enabled)

3. **Add sample data if needed:**
   - Make sure there are events in the calendar
   - Add sample lessons/coaches
   - Ensure membership options display correctly

4. **Document any special instructions:**
   - If reviewers need to do anything special, note it in App Store Connect

**Time Estimate:** 15-30 minutes

---

## ⚠️ HIGH PRIORITY - Should Complete Before Submission

These make your app more likely to be approved quickly.

### 4. ⚠️ Host Terms of Service (Recommended)

**What:** Terms of Service are highly recommended for apps with memberships/payments

**Action Steps:**

1. Open `TERMS_OF_SERVICE.md` (I created this for you)

2. Customize the document:
   - Update `[Current Date]`
   - Replace `[Your Jurisdiction]` with your legal jurisdiction
   - Replace `[Your Physical Address]` with your business address
   - Review liability waivers (important for sports facilities!)
   - Adjust refund policies to match your actual policies

3. Host it online:
   ```
   Recommended URL: https://www.thepickleco.mx/terms
   ```

4. Link it in the app (optional but good practice):
   - Add link in sign-up flow
   - Add link in account/settings screen

**Time Estimate:** 30 minutes - 1 hour

---

### 5. ⚠️ Fill Out App Store Connect Metadata

**What:** Complete all required fields in App Store Connect

**Action Steps:**

1. **Open App Store Connect:**
   - Go to https://appstoreconnect.apple.com
   - Navigate to My Apps → The Pickle Co
   - Select version 1.0.0 (or create new version)

2. **Use the metadata I prepared:**
   - Open `APP_STORE_METADATA.md`
   - Copy the App Name, Subtitle, Description, Keywords
   - Paste into corresponding fields in App Store Connect

3. **Required fields to fill:**
   - [ ] App Name: `The Pickle Co`
   - [ ] Subtitle: `Pickleball Court & Lessons`
   - [ ] Primary Category: `Sports`
   - [ ] Secondary Category: `Health & Fitness`
   - [ ] Description: (copy from APP_STORE_METADATA.md)
   - [ ] Keywords: (copy from APP_STORE_METADATA.md)
   - [ ] Support URL: `https://www.thepickleco.mx/support`
   - [ ] Marketing URL: `https://www.thepickleco.mx`
   - [ ] Privacy Policy URL: `https://www.thepickleco.mx/privacy` ⚠️ Must be live!
   - [ ] Copyright: `© 2024 The Pickle Co. All rights reserved.`

4. **App Review Information:**
   - [ ] First Name: Your first name
   - [ ] Last Name: Your last name
   - [ ] Phone Number: Your phone number
   - [ ] Email: conorm15@gmail.com
   - [ ] Demo Account Username: conor+appstorereview@thepickleco.mx
   - [ ] Demo Account Password: 0@8P3P0S2T0O2R5e
   - [ ] Notes: Copy from APP_STORE_METADATA.md "Notes for Reviewers" section

5. **Age Rating:**
   - Complete the age rating questionnaire
   - Answer NO to all mature content questions
   - Expected rating: 4+ (all ages)

6. **Upload Screenshots:**
   - Go to "App Store" tab
   - Select "6.7" Display"
   - Drag and drop screenshots in order
   - Most important screenshot should be first

**Time Estimate:** 30-45 minutes

---

### 6. ⚠️ Configure EAS Environment Variables

**What:** Ensure production environment variables are set in EAS

**Action Steps:**

1. **Set environment variables in EAS:**
   ```bash
   # Set Supabase credentials
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your_production_supabase_url"
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_production_supabase_key"

   # Set Stripe credentials
   eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "your_live_stripe_key"
   eas secret:create --scope project --name EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY --value "your_test_stripe_key"

   # Set API URL
   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://www.thepickleco.mx"
   ```

2. **Verify secrets are set:**
   ```bash
   eas secret:list
   ```

3. **Check they're used in build:**
   - Secrets should be automatically injected during EAS build
   - No need to include .env file in build

**Time Estimate:** 10-15 minutes

---

## 📌 RECOMMENDED - Complete When You Have Time

These improve the submission but aren't strictly required.

### 7. 📌 Create Support Page

**What:** The Support URL should point to a real page with help resources

**Action Steps:**

1. Create a page at `https://www.thepickleco.mx/support`

2. Include on this page:
   - Contact email: support@thepickleco.mx
   - FAQs about booking, membership, lessons
   - Troubleshooting guides
   - Link to Terms and Privacy Policy
   - How to request account deletion

3. Keep it simple - even a basic page is better than a 404

**Time Estimate:** 30 minutes - 1 hour

---

### 8. 📌 Run Pre-Build Checks

**What:** Verify app is stable before building

**Action Steps:**

1. **Run environment validation:**
   ```bash
   node -e "const {validateEnvironment, logValidationResults} = require('./lib/env-validation'); const result = validateEnvironment(); logValidationResults(result); process.exit(result.isValid ? 0 : 1);"
   ```

2. **Run health checks:**
   ```bash
   node -e "const {runStartupHealthChecks, logHealthCheckResults} = require('./lib/startup-health-check'); runStartupHealthChecks().then(result => { logHealthCheckResults(result); process.exit(result.canProceed ? 0 : 1); });"
   ```

3. **Run crash tests:**
   ```bash
   ./scripts/test-crash-fixes.sh
   ```

4. **TypeScript check:**
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```

**Time Estimate:** 10 minutes

---

### 9. 📌 Increment Build Number

**What:** Each submission needs a unique build number

**Action Steps:**

1. Open `app.json`

2. Find the iOS build number (currently "9"):
   ```json
   "ios": {
     "buildNumber": "9"
   }
   ```

3. Increment it to "10" (or next number)

4. Save the file

**Time Estimate:** 1 minute

---

### 10. 📌 Update "What's New" Text

**What:** Description of what's in this version (for App Store)

**Action Steps:**

1. In App Store Connect, go to version 1.0.0

2. Fill in "What's New in This Version":
   - Copy from `APP_STORE_METADATA.md` "What's New" section
   - Or write your own update notes

3. Keep it concise and highlight key features

**Time Estimate:** 5 minutes

---

## 🚀 BUILD & SUBMIT

Once all critical items are complete:

### Final Build Process

```bash
# 1. Make sure all changes are committed
git status

# 2. Build for production
eas build --platform ios --profile production

# 3. Wait for build to complete (check EAS dashboard)
# Build URL: https://expo.dev/accounts/[your-account]/projects/thepickleco/builds

# 4. Submit to App Store Connect
eas submit --platform ios --latest

# Or submit manually from EAS dashboard
```

### After Submission

1. **Check App Store Connect:**
   - Go to TestFlight tab
   - Wait for "Processing" to complete (10-30 minutes)
   - Check for any issues or rejections

2. **Add External Testers:**
   - Only available after first review approval
   - Create a test group
   - Add testers by email
   - Provide testing instructions

3. **Monitor for feedback:**
   - Check TestFlight crash reports
   - Review tester feedback
   - Address any critical issues quickly

---

## ✅ COMPLETE CHECKLIST

Copy this to track your progress:

```
CRITICAL (MUST DO):
[ ] Privacy Policy hosted at public URL
[ ] Screenshots taken and ready (minimum 1 set for 6.7")
[ ] Test account verified working in production
[ ] Privacy Policy URL added to App Store Connect

HIGH PRIORITY (SHOULD DO):
[ ] Terms of Service hosted (recommended)
[ ] App Store Connect metadata filled out completely
[ ] EAS environment variables configured
[ ] Screenshots uploaded to App Store Connect
[ ] Age rating questionnaire completed
[ ] App Review Information section filled out

RECOMMENDED (NICE TO HAVE):
[ ] Support page created
[ ] Pre-build checks run and passing
[ ] Build number incremented
[ ] "What's New" text written
[ ] All documentation reviewed and customized

FINAL STEPS:
[ ] Production build created via EAS
[ ] App submitted to App Store Connect
[ ] Waiting for processing to complete
[ ] Ready for external testing review
```

---

## 📞 NEED HELP?

If you get stuck on any step:

1. **Check the guide files I created:**
   - `PRIVACY_POLICY.md` - Ready-to-use privacy policy
   - `TERMS_OF_SERVICE.md` - Ready-to-use terms
   - `APP_STORE_METADATA.md` - All metadata ready to copy/paste
   - `SCREENSHOT_GUIDE.md` - Step-by-step screenshot instructions
   - `PRE_BUILD_CHECKLIST.md` - Technical pre-build checks

2. **Common issues:**
   - **Screenshots wrong size?** Use iPhone 15 Pro Max simulator
   - **Privacy policy rejected?** Make sure URL is publicly accessible
   - **Test account doesn't work?** Verify it in production build
   - **Build failing?** Check EAS dashboard for error logs

3. **Apple's resources:**
   - App Store Connect Help: https://help.apple.com/app-store-connect/
   - TestFlight Beta Testing Guide: https://developer.apple.com/testflight/

---

## ⏱️ TIME ESTIMATES

**Minimum time to complete critical items:** 2-3 hours

**Breakdown:**
- Host Privacy Policy: 30 min - 1 hour
- Take Screenshots: 30 min - 1 hour
- Verify Test Account: 15-30 min
- Fill App Store Connect: 30-45 min
- Configure EAS Secrets: 10-15 min
- Build & Submit: 20-30 min (mostly waiting)

**Total with all recommended items:** 3-5 hours

---

## 🎯 SUCCESS CRITERIA

You're ready to submit when:

✅ Privacy Policy is live at public URL
✅ At least 1 set of screenshots (5 recommended)
✅ Test account works in production
✅ All App Store Connect required fields filled
✅ EAS environment variables configured
✅ Pre-build checks pass
✅ Build number incremented

---

## 📝 NOTES

- **Don't rush!** Take time to review all documents before hosting them
- **Test thoroughly** - Apple will test your demo account extensively
- **Keep it simple** - You can always improve screenshots later
- **Be responsive** - Apple may ask questions during review (check email)
- **First submission is slowest** - Updates are much faster

---

**Good luck with your submission! 🚀**

You've got this! The hard technical work is done - now it's just about getting the administrative pieces in place.
