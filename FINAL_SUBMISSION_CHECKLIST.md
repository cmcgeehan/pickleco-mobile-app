# 🚀 Final Submission Checklist

Complete this checklist before building and submitting to App Store Connect.

## ✅ CRITICAL ITEMS

### 1. Privacy Policy & Terms of Service
- [ ] Privacy policy is live at: https://www.thepickleco.mx/privacy
- [ ] Terms of service is live at: https://www.thepickleco.mx/terms
- [ ] Both URLs are publicly accessible (test in incognito browser)
- [ ] Content matches PRIVACY_POLICY.md and TERMS_OF_SERVICE.md
- [ ] No 404 errors or broken pages

**Verify now:**
```bash
# Test privacy policy URL
curl -I https://www.thepickleco.mx/privacy | grep "200"

# Test terms URL
curl -I https://www.thepickleco.mx/terms | grep "200"
```

---

### 2. Screenshots
- [ ] At least 1 screenshot taken (5 recommended)
- [ ] Screenshots are saved to Desktop or organized folder
- [ ] Using iPhone 17 Pro Max resolution (1320 x 2868)
- [ ] Screenshots show actual app features (Calendar, Lessons, Play, Membership)
- [ ] No personal information visible
- [ ] Professional quality (no errors, no loading states)

**Verify now:**
```bash
# Check if screenshots exist
ls ~/Desktop/Simulator\ Screen\ Shot*.png 2>/dev/null && echo "✅ Screenshots found" || echo "❌ No screenshots found"

# Count screenshots
ls ~/Desktop/Simulator\ Screen\ Shot*.png 2>/dev/null | wc -l | xargs echo "Number of screenshots:"
```

---

### 3. App Store Connect Metadata
- [ ] Logged into App Store Connect
- [ ] App Name entered: "The Pickle Co"
- [ ] Subtitle entered: "Pickleball Court & Lessons"
- [ ] Description copied from APP_STORE_METADATA.md
- [ ] Keywords entered
- [ ] Primary Category: Sports
- [ ] Secondary Category: Health & Fitness
- [ ] Privacy Policy URL entered: https://www.thepickleco.mx/privacy
- [ ] Support URL entered (e.g., https://www.thepickleco.mx/support)
- [ ] Age Rating completed (should be 4+)
- [ ] Screenshots uploaded
- [ ] Copyright text entered
- [ ] What's New text entered

---

### 4. App Review Information
- [ ] Demo Account Username: conor+appstorereview@thepickleco.mx
- [ ] Demo Account Password: [YOUR ACTUAL PASSWORD]
- [ ] Contact Name entered
- [ ] Contact Phone entered
- [ ] Contact Email: conorm15@gmail.com
- [ ] Review Notes copied from APP_STORE_METADATA.md

---

### 5. Test Account
- [ ] Test account exists in production database
- [ ] Test account credentials work (can sign in)
- [ ] Test account has sample data to demonstrate features
- [ ] All key features accessible with test account

**Verify now:**
```bash
# You should manually test this in your production app or current build
# Sign in with: conor+appstorereview@thepickleco.mx
# Make sure you can:
# - View calendar
# - Browse lessons
# - See membership options
# - Access all main screens
```

---

### 6. Build Configuration
- [ ] Build number incremented in app.json
- [ ] Current build number is: 17 (or higher)
- [ ] Version number is: 1.0.0
- [ ] Bundle identifier correct: com.conorm15.thepickleco

**Verify now:**
```bash
# Check current build number
grep -A 3 '"buildNumber"' app.json
```

---

### 7. Environment Variables (EAS Secrets)
- [ ] EXPO_PUBLIC_SUPABASE_URL set in EAS
- [ ] EXPO_PUBLIC_SUPABASE_ANON_KEY set in EAS
- [ ] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY set in EAS (live key)
- [ ] EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY set in EAS (test key)
- [ ] EXPO_PUBLIC_API_URL set in EAS

**Verify now:**
```bash
# List all EAS secrets
eas secret:list
```

---

### 8. Code Quality
- [ ] No critical errors in the app
- [ ] App launches without crashing
- [ ] email_verified column issue fixed ✅
- [ ] Test account works in current build
- [ ] All main features functional

---

## 🚀 READY TO BUILD?

If all items above are checked, you're ready to build and submit!

### Step 1: Increment Build Number (if not done)

```bash
# Check current build number
grep '"buildNumber"' app.json

# If needed, manually increment in app.json
# Change "buildNumber": "17" to "18" (or next number)
```

### Step 2: Build for Production

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# This will:
# 1. Upload your code to EAS
# 2. Build the app with production configuration
# 3. Sign it with your Apple certificates
# 4. Take about 10-20 minutes
# 5. Give you a URL to download the .ipa file
```

### Step 3: Monitor Build

While building:
- Watch the terminal output
- Or check: https://expo.dev/accounts/[your-account]/projects/thepickleco/builds
- Wait for "Build finished" message

### Step 4: Submit to App Store Connect

```bash
# After build completes successfully:
eas submit --platform ios --latest

# This will:
# 1. Take the latest successful build
# 2. Upload it to App Store Connect
# 3. Submit it for processing
```

**OR manually submit:**
1. Download the .ipa from EAS dashboard
2. Upload via Xcode or Transporter app
3. Wait for processing in App Store Connect

### Step 5: Wait for Processing

- App Store Connect will process the build (10-30 minutes)
- Check TestFlight tab in App Store Connect
- Status will change from "Processing" to "Ready to Submit"

### Step 6: Submit for External Testing Review

Once processing is complete:
1. Go to App Store Connect → TestFlight tab
2. Click on build version
3. Click "Submit for Review" for External Testing
4. Confirm export compliance (you already set this to NO)
5. Wait for Apple's review (usually 1-2 days)

---

## 📧 WHAT TO EXPECT

### During Build (10-20 min)
- Terminal shows build progress
- EAS dashboard shows build status
- You'll get email when build completes

### During Upload to App Store (5-10 min)
- App uploads to Apple's servers
- You'll see progress in terminal or Transporter

### During Processing (10-30 min)
- Apple processes the binary
- TestFlight status shows "Processing"
- No action needed from you

### During Review (1-2 days typically)
- Apple reviews your app with the test account
- They check privacy policy, screenshots, metadata
- You'll get email if they have questions
- You'll get email when approved or if rejected

### After Approval
- Status changes to "Ready to Test"
- You can invite external testers
- Testers receive TestFlight invitation email
- They can install and test the app

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### "Missing Compliance" Error
- You already set `usesNonExemptEncryption: false` in app.json
- Should not be an issue

### "Invalid Binary" Error
- Check that build number was incremented
- Make sure no duplicate build numbers

### "Missing Privacy Policy" Error
- Verify URL is publicly accessible
- Check for typos in the URL
- Must be HTTPS, not HTTP

### "Test Account Doesn't Work" Error
- Verify credentials one more time
- Make sure account exists in production
- Ensure account has sample data

### Build Fails
- Check EAS dashboard for error logs
- Common issue: certificate/provisioning profile
- Run `eas credentials` to check certificates

---

## 🎯 SUCCESS CRITERIA

You're done when:
- ✅ Build completes successfully
- ✅ Upload to App Store Connect succeeds
- ✅ Processing completes (shows in TestFlight)
- ✅ Submitted for External Testing Review
- ✅ Status shows "Waiting for Review"

---

## 📞 NEED HELP?

If something goes wrong:

1. **Check build logs** in EAS dashboard
2. **Check App Store Connect** for rejection reasons
3. **Verify test account** works in production
4. **Re-check privacy policy URL** is accessible

**Most common issue:** Privacy policy URL not accessible or returning 404

---

## 🎉 YOU'RE READY!

Everything is prepared. Just run the build command and follow the steps above.

**Final command to start the build:**
```bash
eas build --platform ios --profile production
```

Good luck! 🚀
