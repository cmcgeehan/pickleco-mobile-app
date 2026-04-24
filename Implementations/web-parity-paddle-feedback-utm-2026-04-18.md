# Mobile Parity: Paddle Rental, Feedback Widget, UTM Tracking

**Source:** Web branch `preview/paddle-and-feedback`, merged 2026-04-18
**Priority:** Medium — Paddle rental is user-facing and revenue-generating; UTM tracking is signup attribution

---

## Overview

Three new features shipped on the web that mobile should consider implementing:

1. **Paddle rental** — Users can add paddles ($50 MXN each) when booking courts or lessons
2. **Feedback widget** — Floating bug/feature request form on all pages
3. **UTM tracking** — Captures marketing attribution at signup

Additionally: "How did you hear about us?" dropdown added to signup flow.

---

## 1. Paddle Rental

### How It Works (Web)

During court reservation or lesson booking checkout, users see a `+/-` quantity selector. Each paddle is $50 MXN. The paddle cost is shown as a separate line item, and the total includes both the court/lesson price and paddle rental.

### API Changes

#### POST /api/courts/reserve

Add `paddleCount` to the request body:

```typescript
interface ReserveCourtRequest {
  // ... existing fields ...
  paddleCount: number  // 0 = no paddles, default 0
}
```

Backend adds `paddleCount × 50` MXN to the charge. The payment intent metadata includes:
```json
{ "rentPaddle": "2" }  // or "0" if none
```

#### POST /api/lessons/book

Same pattern — add `paddleCount` to request body.

### Business Logic

- `PADDLE_RENTAL_FEE = 50` MXN per paddle
- Total charge = original price + (paddleCount × 50)
- If paddleCount = 0, charge is unchanged
- No minimum or maximum enforced on the server — web enforces 0–5 via the UI

### UI/UX Flow

1. User reaches checkout step (after selecting court/time/coach)
2. Below the price breakdown, user sees "Paddle Rental" with `−` / count / `+` buttons
3. A helper text shows "$50 MXN / paddle"
4. Price breakdown updates in real-time: shows "Paddle Rental × N — $X MXN" as a line item
5. Total updates to include paddle cost
6. User confirms and pays the combined total

### Translation Keys

```json
{
  "reservations.paddleRental": "Paddle Rental",
  "reservations.paddleRentalFee": "$50 MXN / paddle",
  "lessons.paddleRental": "Paddle Rental",
  "lessons.paddleRentalFee": "$50 MXN / paddle"
}
```

---

## 2. Feedback Widget

### How It Works (Web)

A floating 🐛 button appears on all pages. Tapping it opens a form where the user selects Bug or Feature Request, fills in a title and details, optionally attaches a screenshot, and submits.

The form POSTs to `/api/feedback` which proxies to the Mac via Tailscale Funnel. The Mac server creates a task file and sends a Slack notification to `#pickleco-software`.

### API

#### POST /api/feedback

**Headers:**
```
Content-Type: application/json
```
_(No auth required — anonymous submissions allowed)_

**Request Body:**
```typescript
interface FeedbackRequest {
  type: 'Bug' | 'Feature'
  title: string
  // Bug fields:
  whatHappened?: string
  whatExpected?: string
  stepsToReproduce?: string
  // Feature fields:
  whatDoYouWant?: string
  why?: string
  // Common:
  email?: string
}
```

**Response:**
```typescript
{ success: true }
// or
{ error: string }  // 500 if Mac proxy fails
```

### UI/UX Flow

1. User sees floating 🐛 button (bottom-right corner on web)
2. Tap opens a bottom sheet / modal
3. User selects: Bug Report or Feature Request
4. Different fields appear based on selection
5. User optionally enters email for follow-up
6. Tap "Send" — shows spinner
7. Success: shows "Thanks! We'll look into it." message
8. Form closes automatically after a brief delay

### Translation Keys

```json
{
  "feedback.bug": "Bug Report",
  "feedback.feature": "Feature Request",
  "feedback.thankYou": "Thank you!",
  "feedback.wellLook": "We'll look into it.",
  "feedback.submit": "Send Feedback",
  "feedback.sending": "Sending...",
  "feedback.titlePlaceholder": "Short description",
  "feedback.whatHappened": "What happened?",
  "feedback.whatExpected": "What did you expect?",
  "feedback.stepsToReproduce": "Steps to reproduce",
  "feedback.whatDoYouWant": "What do you want?",
  "feedback.why": "Why is this important?",
  "feedback.emailPlaceholder": "your@email.com (optional)",
  "feedback.addAttachment": "Add screenshot or video"
}
```

### Notes for Mobile

- No auth required for feedback submission
- Image upload is separate (`/api/feedback/upload`) and best-effort — if it fails, text still goes through
- Consider using React Native's `ActionSheet` or a bottom sheet library for the form

---

## 3. UTM Tracking & "How Did You Hear" at Signup

### How It Works (Web)

- `UtmCapture` component mounts in the root layout
- On page load, checks URL search params for `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- If found, saves to `localStorage` under key `pickle_utm`
- On signup, reads from localStorage and passes to the `/api/users` (or auth signup) endpoint

The signup form also has a "How did you hear about us?" dropdown with options: Instagram, Google, Friend, Walk-in, Other.

### Database Schema Changes

New columns added to `users` table:

```sql
how_did_you_hear TEXT,   -- 'Instagram' | 'Google' | 'Friend' | 'Walk-in' | 'Other'
utm_source TEXT,
utm_medium TEXT,
utm_campaign TEXT,
utm_content TEXT,
utm_term TEXT
```

### API Changes

#### POST /api/auth/signup (or Supabase signUp)

The `signUp` function now accepts additional metadata:

```typescript
interface SignUpMetadata {
  first_name: string
  last_name: string
  phone?: string
  language?: string
  referral_code?: string
  how_did_you_hear?: string        // NEW
  utm_source?: string              // NEW
  utm_medium?: string              // NEW
  utm_campaign?: string            // NEW
  utm_content?: string             // NEW
  utm_term?: string                // NEW
}
```

These are saved to the `users` table row at signup time.

### UI/UX Flow (Signup)

1. Standard signup fields (name, email, password, phone)
2. "How did you hear about us?" dropdown (optional)
   - Options: Instagram, Google, Friend, Walk-in, Other
3. On submit: read UTM params from storage, include in signup payload
4. UTM data is only captured at first touch (not updated on return visits)

### Notes for Mobile

- For deep links with UTM params (e.g. from Instagram ads), capture UTM from the link URL when the app opens and store in AsyncStorage
- Pass stored UTM params when the user eventually signs up
- The "How did you hear about us?" dropdown should appear on the signup screen

---

## Cross-Cutting: Pro Shop Nav Rename

- Nav label changed from "Tienda Pro" (ES) to "Pro Shop" in both EN and ES
- `common.shop` translation key = `"Pro Shop"` in both languages
- Mobile nav/tab bar should use "Pro Shop" in both languages

---

## Notes for Mobile Implementation

- Paddle rental requires the checkout flow to allow dynamic price calculation before confirming payment
- Feedback widget can be lower priority — the Mac server handles task creation and Slack; mobile just needs to POST the JSON
- UTM tracking is most valuable if mobile handles deep links from ad campaigns — use `expo-linking` to extract UTM params from the launch URL
