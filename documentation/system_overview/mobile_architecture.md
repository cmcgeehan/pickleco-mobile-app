# Mobile App Architecture

This document describes the architecture, patterns, and structure specific to The Pickle Co mobile application.

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React Native | 0.79.5 |
| Platform Tools | Expo | 53.0.22 |
| Language | TypeScript | 5.8.3 |
| State Management | Zustand | 5.0.7 |
| Database/Auth | Supabase JS SDK | 2.55.0 |
| Payments | Stripe React Native | 0.45.0 |
| Navigation | React Navigation | 7.x |
| Localization | i18next | 25.4.2 |
| Date Handling | date-fns | 4.1.0 |

## Project Structure

```
/
├── App.tsx                      # Root component, navigation setup
├── index.ts                     # Entry point
├── screens/                     # Main navigation screens
│   ├── PlayScreen.tsx           # Home - events, coaches, spotlight
│   ├── MembershipScreen.tsx     # Browse/purchase memberships
│   ├── CalendarScreen.tsx       # Event calendar
│   ├── LessonsScreen.tsx        # Coach browsing, lesson booking
│   ├── MoreScreen.tsx           # Account settings, billing
│   └── LoginScreen.tsx          # Authentication
├── components/                  # Reusable UI components
│   ├── AuthProvider.tsx         # Auth initialization wrapper
│   ├── CourtReservationWizard.tsx
│   ├── LessonBookingWizard.tsx
│   ├── MembershipCheckoutWizard.tsx
│   ├── EventModal.tsx
│   ├── ActionModal.tsx
│   ├── CoachesSection.tsx
│   ├── PaymentMethodsManager.tsx
│   ├── PaymentHistory.tsx
│   └── [other components]
├── stores/                      # Zustand state management
│   ├── authStore.ts             # User auth and profile
│   ├── notificationStore.ts     # Push notifications
│   └── featureFlagsStore.ts     # Feature toggles
├── lib/                         # Business logic and services
│   ├── supabase.ts              # Database client
│   ├── stripeService.ts         # Payment processing
│   ├── membershipService.ts     # Membership operations
│   ├── pricing.ts               # Price calculations
│   ├── apiService.ts            # HTTP wrapper
│   ├── notificationService.ts   # Push notifications
│   ├── imageUploadService.ts    # Avatar management
│   ├── performance.ts           # Performance monitoring
│   ├── crash-reporter.ts        # Error tracking
│   └── environment.ts           # Config management
├── i18n/                        # Internationalization
│   ├── i18n.ts                  # i18next config
│   └── locales/
│       ├── en.json
│       └── es.json
├── contexts/                    # React contexts
│   └── LanguageContext.tsx
├── types/                       # TypeScript definitions
│   └── events.ts
└── documentation/               # This documentation
```

## State Management

### Zustand Stores

The app uses Zustand for lightweight, performant state management.

#### authStore (`/stores/authStore.ts`)

Central authentication and user profile state.

```typescript
interface AuthState {
  user: User | null;           // Supabase auth user
  profile: UserProfile | null; // Extended profile with membership
  session: Session | null;     // Auth session
  initialized: boolean;        // Bootstrap complete
  loading: boolean;
}

// Key actions
initialize()        // Restore session from AsyncStorage
signIn(email, pwd)  // Login
signUp(email, pwd, userData) // Registration
signOut()           // Logout
refreshProfile()    // Fetch latest profile + membership
updateProfile(data) // Update user details
```

**Profile includes:**
- Basic user info (name, email, phone)
- `has_signed_waiver` status
- `is_coach` flag with coaching details
- Active membership with discount info
- DUPR ratings (if linked)

#### featureFlagsStore (`/stores/featureFlagsStore.ts`)

Remote feature toggles for OTA updates.

```typescript
interface FeatureFlags {
  lessonBookingEnabled: boolean;    // Toggle lesson booking
  courtReservationEnabled: boolean; // Toggle court reservations
  groupClinicsEnabled: boolean;     // Toggle group clinics
}

// Defaults to true for App Store review
// Can fetch overrides from Supabase feature_flags table
```

#### notificationStore (`/stores/notificationStore.ts`)

Push notification management.

```typescript
interface NotificationState {
  isInitialized: boolean;
  hasPermissions: boolean;
  pushToken: string | null;
}
```

## Navigation Architecture

Bottom tab navigation with 5 tabs:

```
┌─────────────────────────────────────────┐
│                                         │
│           [Screen Content]              │
│                                         │
├─────────────────────────────────────────┤
│  🏠    💎    [+]    📅    ☰            │
│ Play  Member       Cal   More          │
└─────────────────────────────────────────┘
```

- **Play (Home)**: Event discovery, coaches, user registrations
- **Membership**: Browse and purchase memberships
- **Plus (+)**: Action modal for quick booking (not a screen)
- **Calendar**: Full event calendar with filters
- **More**: Account settings, billing, preferences

**Action Modal (+):**
Opens modal with options:
- View All Events → Calendar tab
- Book Lesson → LessonBookingWizard
- Reserve Court → CourtReservationWizard

## Data Flow Patterns

### API Access Strategy

The mobile app uses a **hybrid approach** for data access:

| Operation | Method | Reason |
|-----------|--------|--------|
| User profile CRUD | Direct Supabase | Fast, RLS protected |
| Event listings | Direct Supabase | Real-time capable |
| Registrations | Direct Supabase | Simple reads |
| **Payments** | HTTP API | PCI compliance, business logic |
| **Lesson booking** | HTTP API | Complex availability checks |
| **Event registration** | HTTP API | Pricing, seat management |

#### Direct Supabase Example
```typescript
// Fetch coaches
const { data, error } = await supabase
  .from('users')
  .select('id, first_name, last_name, coaching_rate, bio, specialties')
  .eq('is_coach', true)
  .is('deleted_at', null);
```

#### HTTP API Example
```typescript
// Create payment intent
const response = await fetch(`${API_URL}/api/stripe/create-payment-intent`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 299000, // centavos
    currency: 'mxn',
    metadata: { type: 'membership', userId: user.id }
  })
});
```

### Authentication Flow

```
App Launch
    ↓
AuthProvider.initialize()
    ↓
Check AsyncStorage for session
    ├── No session → Show LoginScreen
    ↓
Restore session
    ↓
Validate with Supabase
    ├── Invalid → Clear & show LoginScreen
    ↓
Fetch profile + membership
    ↓
Initialize notifications
    ↓
Show MainApp (tabs)
```

### Payment Flow

```
User initiates purchase
    ↓
Create Payment Intent (backend)
    ↓
Initialize Payment Sheet (Stripe SDK)
    ↓
Present Payment Sheet (native UI)
    ↓
User enters card / selects saved method
    ↓
Stripe confirms payment
    ↓
Activate service (membership/booking)
    ↓
Refresh profile state
```

## Critical Implementation Patterns

### 1. Participant Fields Denormalization

Due to RLS policies, we can't read other users' data when displaying event participants. Solution:

```typescript
// At registration time, copy participant info
await supabase.from('event_registrations').insert({
  event_id: eventId,
  user_id: userId,
  participant_first_name: user.first_name,  // Denormalized
  participant_last_initial: user.last_name[0]  // Denormalized
});

// When displaying participants, read from denormalized fields
// NOT from joins to users table
```

### 2. Soft Delete Pattern

All records use `deleted_at` timestamp instead of hard deletes:

```typescript
// Always filter for active records
const { data } = await supabase
  .from('events')
  .select('*')
  .is('deleted_at', null);  // CRITICAL!

// To "delete" a record
await supabase
  .from('event_registrations')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', registrationId);
```

### 3. Soft-Delete Reactivation

When re-registering for an event after unregistering:

```typescript
// Check for existing soft-deleted registration
const { data: existing } = await supabase
  .from('event_registrations')
  .select('id')
  .eq('event_id', eventId)
  .eq('user_id', userId)
  .not('deleted_at', 'is', null)
  .maybeSingle();

if (existing) {
  // Reactivate by clearing deleted_at
  await supabase
    .from('event_registrations')
    .update({ deleted_at: null })
    .eq('id', existing.id);
} else {
  // Insert new registration
  await supabase.from('event_registrations').insert({ ... });
}
```

### 4. Waiver Enforcement

Every booking operation must check waiver status:

```typescript
// Before any booking
if (!user.has_signed_waiver) {
  setShowWaiverModal(true);
  return;
}

// After waiver signed
await supabase
  .from('users')
  .update({ has_signed_waiver: true })
  .eq('id', userId);
```

### 5. Feature Flag Usage

Control feature availability without app updates:

```typescript
import { useFeatureFlag } from '@/stores/featureFlagsStore';

function BookingButton() {
  const lessonBookingEnabled = useFeatureFlag('lessonBookingEnabled');

  return (
    <TouchableOpacity
      disabled={!lessonBookingEnabled}
      onPress={() => {
        if (lessonBookingEnabled) {
          openLessonWizard();
        } else {
          Alert.alert('Coming Soon', 'This feature will be available soon.');
        }
      }}
    >
      <Text>Book Lesson</Text>
    </TouchableOpacity>
  );
}
```

## Component Patterns

### Wizard Components

Multi-step booking flows follow consistent pattern:

```typescript
interface WizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

// Internal state
const [step, setStep] = useState(1);
const [data, setData] = useState({});

// Navigation
const nextStep = () => setStep(s => s + 1);
const prevStep = () => setStep(s => s - 1);

// Steps typically:
// 1. Selection (coach/court/date)
// 2. Time selection
// 3. Review & payment
// 4. Confirmation
```

### Modal Pattern

```typescript
<Modal
  visible={visible}
  transparent
  animationType="fade"
  onRequestClose={onClose}
>
  <View style={styles.overlay}>
    <TouchableOpacity style={styles.backdrop} onPress={onClose}>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
    </TouchableOpacity>
    <View style={styles.content}>
      {/* Modal content */}
    </View>
  </View>
</Modal>
```

## Error Handling

### API Errors

```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
} catch (error) {
  crashReporter.addBreadcrumb('api', `Failed: ${url}`, 'error');
  Alert.alert('Error', 'Something went wrong. Please try again.');
}
```

### Supabase Errors

```typescript
const { data, error } = await supabase.from('table').select();

if (error) {
  if (error.code === 'PGRST301') {
    // Not found
  } else if (error.message?.includes('JWT')) {
    // Auth error - sign out
    authStore.signOut();
  } else {
    console.error('Database error:', error);
  }
}
```

## Performance Considerations

### Optimizations Implemented

1. **Selective column queries**: Only fetch needed columns
2. **Zustand selectors**: Prevent unnecessary re-renders
3. **Image caching**: Cache avatars and images
4. **Memory management**: Auto-cleanup on low memory
5. **Performance monitoring**: Track slow operations (>1000ms)

### Memory Management

```typescript
import { memoryManager } from '@/lib/performance';

// Register cleanup task
memoryManager.registerCleanup('myFeature', () => {
  // Clear caches, cancel requests
});

// Auto-cleanup runs every 30 seconds
```

## Testing

### Stripe Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | 3D Secure |

Use any future expiry date, any 3-digit CVC.

### Environment Detection

```typescript
import { isTestEnvironment } from '@/lib/environment';

if (isTestEnvironment()) {
  // Use test Stripe keys, test DUPR, etc.
}
```

## Security

1. **Never expose service role key** - All admin operations via backend
2. **JWT in Authorization header** - All API calls authenticated
3. **Payment data via Stripe SDK** - Never handle card data directly
4. **Secure storage** - Sensitive data in AsyncStorage (encrypted on iOS)
5. **RLS policies** - Database enforces access control
