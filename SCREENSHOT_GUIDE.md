# App Store Screenshot Guide

This guide will help you create professional screenshots for The Pickle Co app submission to the App Store.

## Requirements

### Device Sizes (Apple Requirements)

You need **at least ONE set** of screenshots for the largest device size:

**Required:**
- **6.7" Display** (iPhone 14 Pro Max, iPhone 15 Pro Max)
  - Resolution: 1290 x 2796 pixels (or 2796 x 1290 landscape)
  - Minimum 1 screenshot, maximum 10

**Recommended (Apple will scale down):**
- **6.5" Display** (iPhone 11 Pro Max, iPhone XS Max)
  - Resolution: 1242 x 2688 pixels
- **5.5" Display** (iPhone 8 Plus, iPhone 7 Plus)
  - Resolution: 1242 x 2208 pixels

## Quick Start: Using iOS Simulator

### Step 1: Open Simulator

```bash
# Launch the app in iOS simulator (if not already running)
npx expo run:ios --device "iPhone 15 Pro Max"
```

### Step 2: Take Screenshots

1. Navigate to the screen you want to capture
2. Press `Cmd + S` in the simulator
3. Screenshots are saved to your Desktop by default
4. Look for files named `Simulator Screen Shot - [device] - [date].png`

### Step 3: Find Your Screenshots

```bash
# Screenshots are typically saved to:
~/Desktop/

# Or find them with:
open ~/Desktop/
```

## Recommended Screenshots (in order)

### Screenshot 1: Calendar/Court Booking ⭐ MOST IMPORTANT
**Screen:** Calendar or booking screen
**What to show:**
- Clean calendar view with available time slots
- Easy-to-see booking interface
- Court availability clearly marked

**Title:** "Book Courts Instantly"
**Caption:** View real-time availability and reserve your court in seconds

---

### Screenshot 2: Lessons/Coaching
**Screen:** Lessons list or coach profile
**What to show:**
- Coach profiles with ratings
- Lesson types available
- Clear booking options

**Title:** "Learn from the Pros"
**Caption:** Schedule coaching lessons with certified pickleball instructors

---

### Screenshot 3: Play/Community
**Screen:** Play screen or events list
**What to show:**
- Community features
- Games/events available
- Player matching or social features

**Title:** "Find Playing Partners"
**Caption:** Connect with players at your skill level and join games

---

### Screenshot 4: Membership
**Screen:** Membership/pricing screen
**What to show:**
- Membership tiers
- Clear pricing
- Benefits of each tier

**Title:** "Flexible Memberships"
**Caption:** Choose the plan that fits your playing style

---

### Screenshot 5: Profile/Account (Optional)
**Screen:** User profile or account screen
**What to show:**
- Profile management
- Settings options
- User preferences

**Title:** "Manage Everything"
**Caption:** Track bookings, view history, and customize preferences

---

## Screenshot Preparation Checklist

### Before Taking Screenshots

- [ ] **Log in with the demo account**
  - Email: conor+appstorereview@thepickleco.mx
  - Password: 0@8P3P0S2T0O2R5e

- [ ] **Check for test data**
  - Ensure calendar has events
  - Lessons list has content
  - Membership options are visible
  - No empty states

- [ ] **Device settings**
  - Full battery icon (charge simulator to 100%)
  - 9:41 AM time (standard App Store time)
  - Strong signal bars
  - WiFi connected

- [ ] **App state**
  - No loading spinners
  - No error messages
  - Clean, professional appearance
  - All images loaded

### Setting Simulator Time to 9:41 AM

In simulator, go to: Features → Time → Set to 9:41 AM

Or use this command:
```bash
xcrun simctl status_bar "iPhone 15 Pro Max" override --time "9:41"
```

## Advanced: Creating Marketing Screenshots

If you want to create enhanced marketing screenshots with text overlays:

### Tools
- **Sketch/Figma** - Professional design tools
- **Canva** - Easy online tool (has App Store templates)
- **Apple's App Store Screenshot Generator** - Built-in templates

### Best Practices
- Keep text minimal and readable
- Use high contrast for text
- Match your brand colors
- Ensure text doesn't cover important UI elements
- Test on actual device size

### Template Sizes
- 6.7" Display: 1290 x 2796 pixels
- Safe area for text: Leave 100px margin on all sides

## Taking Screenshots Step-by-Step

### Method 1: iOS Simulator (Easiest)

```bash
# 1. Start the app
npx expo run:ios --device "iPhone 15 Pro Max"

# 2. Set the simulator time (optional)
xcrun simctl status_bar "iPhone 15 Pro Max" override --time "9:41"

# 3. Navigate to each screen and press Cmd+S to save
# Screenshots appear on your Desktop
```

### Method 2: Physical Device

1. Open the app on your iPhone 15 Pro Max (or similar 6.7" device)
2. Navigate to the screen
3. Press **Volume Up + Side Button** simultaneously
4. AirDrop or sync photos to your Mac
5. Find screenshots in Photos app

### Method 3: Using Expo (if running in development)

```bash
# Take programmatic screenshots using developer tools
# Navigate to screen, then take screenshot via browser DevTools if using web
```

## Organizing Your Screenshots

Create a folder structure:
```
screenshots/
├── 6.7-inch/
│   ├── 01-calendar-booking.png
│   ├── 02-lessons-coaching.png
│   ├── 03-play-community.png
│   ├── 04-membership.png
│   └── 05-profile-account.png
├── 6.5-inch/  (optional)
└── 5.5-inch/  (optional)
```

## Screenshot Quality Checklist

Before uploading to App Store Connect:

- [ ] **Correct dimensions** for device size
- [ ] **No personal information** visible (use demo account)
- [ ] **High quality** - no pixelation or blur
- [ ] **Professional appearance** - clean UI, no errors
- [ ] **Consistent branding** - colors, fonts match
- [ ] **Good content** - realistic data, not just lorem ipsum
- [ ] **5 or fewer** screenshots (quality over quantity)
- [ ] **Most important screen first** (Calendar/Booking)

## Uploading to App Store Connect

1. Go to App Store Connect → My Apps → The Pickle Co
2. Select version (1.0.0)
3. Scroll to "App Store" section
4. Click on "6.7" Display"
5. Drag and drop screenshots (they'll upload in order)
6. Reorder if needed by dragging
7. Add captions/descriptions (optional but recommended)
8. Click Save

## Common Issues & Solutions

### Issue: Screenshots are wrong size
**Solution:** Check simulator device - must be "iPhone 15 Pro Max" or equivalent 6.7" display

### Issue: Screenshots show white/black screen
**Solution:** Wait for app to fully load before taking screenshot

### Issue: Screenshots show debug/development UI
**Solution:** Build in production mode or hide developer tools

### Issue: Time shows current time, not 9:41
**Solution:** Use `xcrun simctl status_bar override` command

### Issue: Battery shows low or different icon
**Solution:** Use status bar override or crop status bar from screenshot

## Pro Tips

1. **Use consistent device orientation** - All portrait OR all landscape
2. **Show progression** - Start with onboarding/sign-in, then main features
3. **Highlight unique features** - What makes your app special?
4. **Test on actual devices** - Screenshots look different on real devices
5. **A/B test** - Try different screenshot orders to see what converts better
6. **Update regularly** - Refresh screenshots with new features

## Quick Command Reference

```bash
# List available simulators
xcrun simctl list devices

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro Max"

# Override status bar
xcrun simctl status_bar "iPhone 15 Pro Max" override --time "9:41" --batteryState charged --batteryLevel 100

# Clear status bar override
xcrun simctl status_bar "iPhone 15 Pro Max" clear

# Take screenshot (while simulator is active)
# Press Cmd+S in simulator window
```

## Final Checklist Before Upload

- [ ] Minimum 1 screenshot for 6.7" display
- [ ] Maximum 10 screenshots total
- [ ] Correct file format (PNG or JPG)
- [ ] Correct dimensions for each device
- [ ] No personal or sensitive information visible
- [ ] Professional quality and appearance
- [ ] Screenshots show actual app functionality
- [ ] Most compelling screenshot is first
- [ ] All screenshots are in correct order

---

## Need Help?

If you have trouble with screenshots:
1. Take basic screenshots with Cmd+S in simulator
2. Screenshots don't need fancy overlays for initial submission
3. You can update screenshots anytime without a new app version
4. Simple, clear screenshots are better than fancy ones that don't show the app

**Remember:** The goal is to show reviewers (and future users) what your app does and why it's valuable!
