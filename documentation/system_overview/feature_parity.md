# Mobile vs Web Feature Parity

This document tracks feature parity between the web and mobile applications, identifies gaps, and outlines what needs to be implemented to achieve full parity.

## Feature Comparison

### Player Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| **Authentication** |
| Email/password login | ✅ | ✅ | - | Full parity |
| Google OAuth | ✅ | ❌ | Medium | Not implemented |
| Password reset | ✅ | ✅ | - | Full parity |
| Email verification | ✅ | ✅ | - | Full parity |
| **Profile Management** |
| Edit profile info | ✅ | ✅ | - | Full parity |
| Profile photo upload | ✅ | ✅ | - | Full parity |
| Notification preferences | ✅ | ✅ | - | Full parity |
| Language switching | ✅ | ✅ | - | EN/ES supported |
| **Events** |
| Browse events | ✅ | ✅ | - | Full parity |
| Event spotlight | ✅ | ✅ | - | Full parity |
| Calendar view | ✅ | ✅ | - | Full parity |
| Event filtering | ✅ | ⚠️ | Low | Limited filters on mobile |
| Event registration | ✅ | ✅ | - | Full parity |
| View my registrations | ✅ | ✅ | - | Full parity |
| Cancel registration | ✅ | ✅ | - | Full parity |
| **Court Reservations** |
| Reserve court | ✅ | ✅ | - | Via wizard |
| View my reservations | ✅ | ✅ | - | Full parity |
| Cancel reservation | ✅ | ✅ | - | Full parity |
| **Lessons** |
| Browse coaches | ✅ | ✅ | - | Full parity |
| Book lesson | ✅ | ✅ | - | Via wizard |
| View my lessons | ✅ | ⚠️ | Medium | Partial - needs my lessons tab |
| Cancel lesson | ✅ | ⚠️ | Medium | Needs implementation |
| **Memberships** |
| Browse membership types | ✅ | ✅ | - | Full parity |
| Purchase membership | ✅ | ✅ | - | Stripe Payment Sheet |
| View active membership | ✅ | ✅ | - | Full parity |
| Cancel membership | ✅ | ❌ | Medium | Web only |
| Upgrade membership | ✅ | ❌ | Medium | Web only |
| **Payments** |
| Add payment method | ✅ | ✅ | - | Full parity |
| View saved methods | ✅ | ✅ | - | Full parity |
| Remove payment method | ✅ | ✅ | - | Full parity |
| View payment history | ✅ | ✅ | - | Full parity |
| Download invoices | ✅ | ⚠️ | Low | Opens web link |
| **DUPR Integration** |
| Link DUPR account | ✅ | ❌ | Medium | OAuth flow needed |
| Display DUPR rating | ✅ | ✅ | - | Display only |
| Sync ratings | ✅ | ❌ | Low | Web only |
| **Waiver** |
| Sign waiver | ✅ | ✅ | - | Full parity |
| View signed waiver | ✅ | ⚠️ | Low | Not implemented |

### Coach Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| **Availability Management** |
| Weekly templates | ✅ | ❌ | High | **Critical gap** |
| Template editor UI | ✅ | ❌ | High | Needs implementation |
| Review pending slots | ✅ | ❌ | High | Needs implementation |
| Approve/modify slots | ✅ | ❌ | High | Needs implementation |
| Create overrides | ✅ | ❌ | Medium | Time blocks, day off |
| Vacation mode | ✅ | ❌ | Medium | Needs implementation |
| Auto-approve settings | ✅ | ❌ | Medium | Needs implementation |
| **Lesson Management** |
| View upcoming lessons | ✅ | ❌ | High | Needs coach view |
| View past lessons | ✅ | ❌ | Medium | Needs implementation |
| Cancel lesson | ✅ | ❌ | High | Needs implementation |
| **Dashboard** |
| Coach dashboard | ✅ | ❌ | High | No mobile equivalent |
| Earnings view | ✅ | ❌ | Low | Web only for now |

### Admin Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| Court schedule grid | ✅ | ❌ | - | Web only |
| Create/edit events | ✅ | ❌ | - | Web only |
| User management | ✅ | ❌ | - | Web only |
| Walk-in payments | ✅ | ❌ | - | Web only |
| Analytics dashboard | ✅ | ❌ | - | Web only |

> **Note**: Admin features are intentionally web-only. Mobile focuses on player and coach experiences.

### E-commerce (Pro Shop)

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| Browse products | ✅ | ❌ | Low | Web only for now |
| Shopping cart | ✅ | ❌ | Low | Web only |
| Checkout | ✅ | ❌ | Low | Web only |

---

## Critical Gaps to Address

### High Priority (Required for Feature Parity)

#### 1. Coach Availability Templates (Mobile)

**Current State**: Coaches must use web to manage their availability.

**Required Implementation**:
- Weekly template editor component
- API calls to `/api/coaches/[id]/template`
- UI for setting time blocks per day of week
- Save/update template functionality

**Files to reference**:
- Web: `/apps/web/components/coach/weekly-template-editor.tsx`
- API: `/apps/web/app/api/coaches/[id]/template/route.ts`

#### 2. Availability Review Flow (Mobile)

**Current State**: Coaches can't review generated availability on mobile.

**Required Implementation**:
- Review UI showing pending slots
- Ability to approve/modify/reject slots
- API calls to `/api/coaches/[id]/availability/review`
- Deadline countdown display

**Files to reference**:
- Web: `/apps/web/components/coach/availability-review.tsx`
- API: `/apps/web/app/api/coaches/[id]/availability/review/route.ts`

#### 3. Coach Dashboard Screen (Mobile)

**Current State**: No dedicated coach view in mobile app.

**Required Implementation**:
- New screen or tab for coaches
- Show upcoming lessons
- Quick access to availability management
- Show today's schedule

### Medium Priority

#### 4. DUPR Account Linking

**Current State**: Can display ratings but can't link new accounts.

**Required Implementation**:
- DUPR OAuth flow (web redirect)
- Deep link handling for OAuth callback
- API call to store tokens

**Files to reference**:
- Web: `/apps/web/components/dupr-link.tsx`
- API: `/apps/web/app/api/dupr/`

#### 5. Membership Cancellation/Upgrade

**Current State**: Can purchase but not modify memberships.

**Required Implementation**:
- Cancel subscription button
- Upgrade flow with proration
- Confirmation dialogs

#### 6. My Lessons Tab

**Current State**: Can book lessons but can't easily view booked lessons.

**Required Implementation**:
- Tab or section showing user's lessons
- Upcoming vs past lessons
- Cancel lesson functionality

### Low Priority

- Google OAuth login
- Full event filtering on mobile
- Invoice PDF downloads (native)
- Pro shop integration

---

## Database Schema Differences

The mobile app and web share the same Supabase database. Key tables used differently:

### Tables Fully Used by Mobile

| Table | Mobile Usage |
|-------|--------------|
| `users` | Full CRUD for profile |
| `events` | Read for listings |
| `event_registrations` | Create/soft-delete |
| `memberships` | Create/read |
| `membership_types` | Read for pricing |
| `payments` | Read for history |
| `locations` | Read |
| `courts` | Read |

### Tables Partially Used

| Table | Web Usage | Mobile Usage |
|-------|-----------|--------------|
| `coach_weekly_templates` | Full CRUD | Not used (gap) |
| `coach_availability` | Full CRUD | Read only (partial) |
| `coach_availability_overrides` | Full CRUD | Not used (gap) |
| `coach_preferences` | Full CRUD | Not used (gap) |

### Tables Not Used by Mobile

| Table | Reason |
|-------|--------|
| `products` | Pro shop is web only |
| `orders` | Pro shop is web only |
| `blog_posts` | Web only feature |
| `admin_*` tables | Admin is web only |

---

## API Endpoints Parity

### Endpoints Used by Mobile

```
Authentication:
✅ Supabase Auth SDK (signIn, signUp, signOut, resetPassword)

Profile:
✅ Direct Supabase (users table)

Events:
✅ GET /api/calendar - Event listings
✅ GET /api/play - Play screen data
✅ POST /api/play/book - Event registration
✅ POST /api/events/unregister - Cancel registration
✅ GET /api/events/price - Pricing with discounts

Payments:
✅ POST /api/stripe/create-payment-intent
✅ POST /api/stripe/setup-intent
✅ POST /api/stripe/confirm-payment
✅ GET /api/stripe/payment-methods
✅ GET /api/stripe/payment-history

Membership:
✅ GET /api/membership/types
✅ POST /api/membership/activate
✅ GET /api/membership/active

Courts:
✅ GET /api/courts
✅ POST /api/courts/reserve
```

### Endpoints Needed for Full Parity

```
Coach Availability (HIGH PRIORITY):
❌ GET /api/coaches/[id]/template
❌ POST /api/coaches/[id]/template
❌ DELETE /api/coaches/[id]/template
❌ GET /api/coaches/[id]/availability/review
❌ PUT /api/coaches/[id]/availability/review
❌ POST /api/coaches/[id]/availability/generate-from-template

Coach Preferences:
❌ GET /api/coaches/[id]/preferences
❌ PUT /api/coaches/[id]/preferences

DUPR:
❌ POST /api/dupr/link-oauth
❌ POST /api/dupr/unlink
❌ POST /api/dupr/sync

Membership Management:
❌ POST /api/membership/cancel
❌ POST /api/membership/upgrade
```

---

## Implementation Roadmap

### Phase 1: Coach Availability (Estimated: 2-3 weeks)

1. Create coach availability store
2. Build weekly template editor component
3. Build availability review component
4. Add coach dashboard screen
5. Integrate with existing APIs

### Phase 2: Lesson Management (Estimated: 1 week)

1. Add "My Lessons" section
2. Implement lesson cancellation
3. Show lesson history

### Phase 3: Account Enhancements (Estimated: 1 week)

1. DUPR linking flow
2. Membership cancellation
3. Google OAuth (if needed)

### Phase 4: Polish (Estimated: 1 week)

1. Advanced event filters
2. Invoice downloads
3. UI/UX improvements

---

## Notes for Development

### When Adding New Features

1. **Check web implementation first** - Review how it's done on web
2. **Use existing patterns** - Follow mobile architecture patterns
3. **Update this doc** - Mark feature as implemented
4. **Test thoroughly** - Especially payment flows

### Mobile-Specific Considerations

- **Offline support**: Consider caching for poor connectivity
- **Push notifications**: For booking confirmations, reminders
- **Deep links**: For DUPR OAuth, email verification
- **Performance**: Profile on real devices, not just simulator

### Shared Code Opportunities

Both apps share:
- Database schema (Supabase)
- Business logic patterns
- Translation keys (i18n)
- API contracts

Consider extracting shared types to a common package if/when monorepo is set up.
