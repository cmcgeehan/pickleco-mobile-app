# Mobile Feature Export PRDs

## Overview
This document provides comprehensive PRDs for implementing the following event registration features in the mobile app:

1. **Waiver Support** - Digital waiver signing and verification
2. **Stripe Checkout** - Payment processing integration
3. **Court Reservation Wizard** - Multi-step court booking flow
4. **Lesson Booking Wizard** - Multi-step lesson booking flow

## Feature 1: Waiver Support

### Overview
Digital waiver system that requires users to sign a waiver before participating in events, court reservations, or lessons.

### API Endpoints

#### POST `/api/users/waiver`
**Purpose**: Update user's waiver status to signed
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "userId": "uuid"
}
```
**Response**:
```json
{
  "profile": {
    "id": "uuid",
    "has_signed_waiver": true,
    "role": "member",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Implementation Details

#### Database Schema
- **Table**: `users`
- **Field**: `has_signed_waiver` (boolean, default: false)
- **RLS Policy**: Users can only update their own waiver status

#### Mobile Implementation
```typescript
// Waiver Modal Component
interface WaiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  user: User | null;
}

// Waiver Content (from translations)
const waiverContent = {
  title: "Liability Waiver",
  content: "By participating in pickleball activities...",
  agreement: "I have read and agree to the terms above"
};

// API Call
const updateWaiverStatus = async (userId: string, token: string) => {
  const response = await fetch('/api/users/waiver', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update waiver status');
  }
  
  return response.json();
};
```

#### Flow Integration
1. Check `user.has_signed_waiver` before allowing event registration
2. Show waiver modal if waiver not signed
3. Update waiver status via API
4. Proceed with registration flow

---

## Feature 2: Stripe Checkout

### Overview
Secure payment processing using Stripe for event registrations, court reservations, and lesson bookings.

### API Endpoints

#### POST `/api/create-payment-intent`
**Purpose**: Create Stripe payment intent
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "amount": 5000, // Amount in cents
  "paymentMethodId": "pm_xxx", // Optional
  "metadata": {
    "userId": "uuid",
    "type": "membership|court_reservation|lesson",
    "membershipType": "Premium", // For membership payments
    "locationId": "uuid",
    "courtId": "uuid", // For court reservations
    "date": "2024-01-15",
    "startTime": "10:00",
    "endTime": "12:00",
    "hours": 2
  }
}
```
**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_xxx"
}
```

#### POST `/api/membership/activate`
**Purpose**: Activate membership after successful payment
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "userId": "uuid",
  "locationId": "uuid",
  "membershipType": "Premium"
}
```

### Implementation Details

#### Stripe Configuration
```typescript
// Environment Variables
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Stripe Client Setup
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY!);
```

#### Mobile Implementation
```typescript
// Payment Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // Amount in cents
  onSuccess: () => void;
  selectedPaymentMethod?: string;
  metadata: {
    userId: string;
    type: 'membership' | 'court_reservation' | 'lesson';
    [key: string]: any;
  };
}

// Payment Flow
const handlePayment = async (amount: number, metadata: any) => {
  // 1. Create payment intent
  const intentResponse = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount, metadata })
  });
  
  const { clientSecret } = await intentResponse.json();
  
  // 2. Confirm payment with Stripe
  const { error } = await stripe.confirmPayment({
    clientSecret,
    confirmParams: {
      return_url: 'your-app://payment-success'
    }
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  // 3. Handle success (activate membership, confirm booking, etc.)
  await handlePaymentSuccess(metadata);
};
```

#### Payment Types
1. **Membership Payments**: Activate user membership
2. **Court Reservations**: Confirm court booking
3. **Lesson Bookings**: Confirm lesson booking
4. **Event Registrations**: Confirm event registration

---

## Feature 3: Court Reservation Wizard

### Overview
Multi-step wizard for booking court reservations with availability checking, payment processing, and confirmation.

### API Endpoints

#### GET `/api/courts/availability`
**Purpose**: Get available courts and time slots
**Query Parameters**:
- `locationId`: string
- `date`: string (YYYY-MM-DD)
- `startTime`: string (HH:MM)
- `endTime`: string (HH:MM)

**Response**:
```json
{
  "courts": [
    {
      "id": "uuid",
      "name": "Court 1",
      "available": true,
      "timeSlots": [
        {
          "startTime": "10:00",
          "endTime": "12:00",
          "available": true,
          "price": 5000
        }
      ]
    }
  ]
}
```

#### POST `/api/reservations/create`
**Purpose**: Create court reservation
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "courtId": "uuid",
  "date": "2024-01-15",
  "startTime": "10:00",
  "endTime": "12:00"
}
```

### Implementation Details

#### Wizard Steps
1. **Location Selection**: Choose facility location
2. **Date Selection**: Pick reservation date
3. **Time Selection**: Choose available time slots
4. **Court Selection**: Select available court
5. **Payment**: Process payment (if required)
6. **Confirmation**: Show booking confirmation

#### Mobile Implementation
```typescript
// Court Reservation Wizard Component
interface CourtReservationWizardProps {
  onClose: () => void;
  locationId: string;
  userMembershipLocationId?: string;
  locations: Location[];
  supabase: SupabaseClient;
}

// State Management
const [step, setStep] = useState(1);
const [selectedDate, setSelectedDate] = useState<Date>();
const [selectedTimeRange, setSelectedTimeRange] = useState<TimeSlot[]>([]);
const [selectedCourt, setSelectedCourt] = useState<Court>();
const [showCheckout, setShowCheckout] = useState(false);

// Step Navigation
const nextStep = () => setStep(prev => prev + 1);
const prevStep = () => setStep(prev => prev - 1);

// Availability Check
const checkAvailability = async (date: Date, startTime: string, endTime: string) => {
  const response = await fetch(
    `/api/courts/availability?locationId=${locationId}&date=${date.toISOString().split('T')[0]}&startTime=${startTime}&endTime=${endTime}`
  );
  return response.json();
};

// Reservation Creation
const createReservation = async (reservationData: any) => {
  const response = await fetch('/api/reservations/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(reservationData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
};
```

#### Pricing Logic
```typescript
// Calculate reservation cost
const calculateCost = (timeSlots: TimeSlot[], userRole: string) => {
  const baseCost = timeSlots.reduce((total, slot) => total + slot.price, 0);
  
  // Apply membership discount
  if (userRole === 'member') {
    return baseCost * 0.8; // 20% discount
  }
  
  return baseCost;
};
```

---

## Feature 4: Lesson Booking Wizard

### Overview
Multi-step wizard for booking private lessons with coaches, including coach selection, availability checking, and payment processing.

### API Endpoints

#### GET `/api/coaches`
**Purpose**: Get available coaches
**Response**:
```json
{
  "coaches": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Coach",
      "coaching_rate": 75.00,
      "bio": "Certified pickleball instructor...",
      "specialties": ["beginner", "advanced"],
      "rating": 4.8,
      "total_lessons": 150
    }
  ]
}
```

#### GET `/api/lessons/availability`
**Purpose**: Get available lesson time slots
**Query Parameters**:
- `coachId`: string (optional - for specific coach)
- `date`: string (YYYY-MM-DD)
- `duration`: number (hours)

**Response**:
```json
{
  "timeSlots": [
    {
      "time": "10:00",
      "available": true,
      "coach_id": "uuid"
    }
  ]
}
```

#### POST `/api/lessons/book`
**Purpose**: Book a lesson
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "coach_id": "uuid",
  "start_time": "2024-01-15T10:00:00Z",
  "duration_hours": 1,
  "court_id": "uuid",
  "title": "Private Lesson",
  "description": "Beginner lesson",
  "guests": [
    {
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane@example.com"
    }
  ]
}
```

### Implementation Details

#### Wizard Steps
1. **Coach Selection**: Choose coach or "Any Available Coach"
2. **Date & Time**: Select lesson date and time
3. **Court Selection**: Choose available court
4. **Confirmation**: Review booking details and pricing
5. **Payment**: Process payment (if required)
6. **Success**: Show booking confirmation

#### Mobile Implementation
```typescript
// Lesson Booking Wizard Component
interface LessonBookingWizardProps {
  initialCoachId?: string;
  onClose: () => void;
}

// State Management
const [step, setStep] = useState(1);
const [selectedCoach, setSelectedCoach] = useState<Coach>();
const [selectedDate, setSelectedDate] = useState<Date>();
const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>();
const [selectedCourt, setSelectedCourt] = useState<Court>();
const [bookingData, setBookingData] = useState<BookingData>({
  coach_id: '',
  duration: 60, // Default 60 minutes
});

// Coach Loading
const loadCoaches = async () => {
  const response = await fetch('/api/coaches');
  const { coaches } = await response.json();
  setCoaches(coaches);
};

// Availability Check
const loadAvailability = async (coachId: string, date: Date) => {
  const response = await fetch(
    `/api/lessons/availability?coachId=${coachId}&date=${date.toISOString().split('T')[0]}`
  );
  const { timeSlots } = await response.json();
  setTimeSlots(timeSlots);
};

// Lesson Booking
const bookLesson = async (lessonData: any) => {
  const response = await fetch('/api/lessons/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(lessonData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
};
```

#### Pricing Calculation
```typescript
// Calculate lesson price with membership discount
const calculateLessonPrice = async (coachId: string, duration: number) => {
  const response = await fetch(
    `/api/lessons/pricing?coachId=${coachId}&duration=${duration}`
  );
  const { price, discount, finalPrice } = await response.json();
  
  return {
    basePrice: price,
    membershipDiscount: discount,
    finalPrice: finalPrice
  };
};
```

---

## Common Implementation Patterns

### Authentication
```typescript
// Always use getSession() for API route authentication
const { data: { session }, error } = await supabase.auth.getSession();
if (error || !session?.user) {
  throw new Error('Unauthorized');
}

// Use createRouteHandlerClient for reliable authentication
const supabase = createRouteHandlerClient<Database>({ cookies });
```

### Error Handling
```typescript
// Consistent error handling pattern
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
  toast.error(error.message);
}
```

### Loading States
```typescript
// Loading state management
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await performAction();
  } catch (error) {
    handleError(error);
  } finally {
    setIsLoading(false);
  }
};
```

### Translation Support
```typescript
// Internationalization support
const { t } = useTranslations();

// Use translation keys
const title = t('lessons', 'bookLesson');
const description = t('lessons', 'bookLessonDescription');
```

---

## Database Schema References

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  has_signed_waiver BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'guest',
  coaching_rate DECIMAL(10,2),
  bio TEXT,
  specialties TEXT[],
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type_id INTEGER REFERENCES event_types(id),
  location_id UUID REFERENCES locations(id),
  coach_id UUID REFERENCES users(id),
  lesson_duration TEXT,
  price DECIMAL(10,2),
  max_participants INTEGER,
  status TEXT DEFAULT 'confirmed',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### Event Registrations Table
```sql
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  guest_first_name TEXT,
  guest_last_name TEXT,
  guest_email TEXT,
  payment_intent_id TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

---

## Testing Checklist

### Waiver Support
- [ ] User without waiver cannot register for events
- [ ] Waiver modal displays correctly
- [ ] Waiver acceptance updates user profile
- [ ] Registration proceeds after waiver acceptance

### Stripe Checkout
- [ ] Payment intent creation works
- [ ] Payment confirmation processes correctly
- [ ] Error handling for failed payments
- [ ] Success callbacks trigger appropriate actions

### Court Reservation Wizard
- [ ] All wizard steps function correctly
- [ ] Availability checking works
- [ ] Payment integration functions
- [ ] Reservation confirmation displays

### Lesson Booking Wizard
- [ ] Coach selection works
- [ ] Availability checking for coaches
- [ ] Court selection integration
- [ ] Lesson booking confirmation

### General
- [ ] Authentication works on all endpoints
- [ ] Error handling is user-friendly
- [ ] Loading states display correctly
- [ ] Translations work in both languages
- [ ] Mobile UI is responsive and accessible

---

## Deployment Notes

1. **Environment Variables**: Ensure all Stripe keys are configured
2. **Database Migrations**: Run all required migrations
3. **RLS Policies**: Verify row-level security policies are active
4. **API Endpoints**: Test all endpoints before deployment
5. **Mobile Testing**: Test on actual mobile devices, not just simulators

## Security Considerations

1. **Authentication**: Always verify user sessions
2. **Authorization**: Check user permissions for each action
3. **Input Validation**: Validate all user inputs
4. **Payment Security**: Never handle payment data directly
5. **Data Protection**: Follow GDPR/privacy requirements

-- UPDATE --

# Mobile Feature Export PRDs

## Overview
This document provides comprehensive PRDs for implementing the following event registration features in the mobile app:

1. **Waiver Support** - Digital waiver signing and verification
2. **Stripe Checkout** - Payment processing integration
3. **Court Reservation Wizard** - Multi-step court booking flow
4. **Lesson Booking Wizard** - Multi-step lesson booking flow

## Feature 1: Waiver Support

### Overview
Digital waiver system that requires users to sign a waiver before participating in events, court reservations, or lessons.

### API Endpoints

#### POST `/api/users/waiver`
**Purpose**: Update user's waiver status to signed
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "userId": "uuid"
}
```
**Response**:
```json
{
  "profile": {
    "id": "uuid",
    "has_signed_waiver": true,
    "role": "member",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Implementation Details

#### Database Schema
- **Table**: `users`
- **Field**: `has_signed_waiver` (boolean, default: false)
- **RLS Policy**: Users can only update their own waiver status

#### Mobile Implementation
```typescript
// Waiver Modal Component
interface WaiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  user: User | null;
}

// Waiver Content (from translations)
const waiverContent = {
  title: "Liability Waiver",
  content: "By participating in pickleball activities...",
  agreement: "I have read and agree to the terms above"
};

// API Call
const updateWaiverStatus = async (userId: string, token: string) => {
  const response = await fetch('/api/users/waiver', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update waiver status');
  }
  
  return response.json();
};
```

#### Flow Integration
1. Check `user.has_signed_waiver` before allowing event registration
2. Show waiver modal if waiver not signed
3. Update waiver status via API
4. Proceed with registration flow

---

## Feature 2: Stripe Checkout

### Overview
Secure payment processing using Stripe for event registrations, court reservations, and lesson bookings.

### API Endpoints

#### POST `/api/create-payment-intent`
**Purpose**: Create Stripe payment intent
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "amount": 5000, // Amount in cents
  "paymentMethodId": "pm_xxx", // Optional
  "metadata": {
    "userId": "uuid",
    "type": "membership|court_reservation|lesson",
    "membershipType": "Premium", // For membership payments
    "locationId": "uuid",
    "courtId": "uuid", // For court reservations
    "date": "2024-01-15",
    "startTime": "10:00",
    "endTime": "12:00",
    "hours": 2
  }
}
```
**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_xxx"
}
```

#### POST `/api/membership/activate`
**Purpose**: Activate membership after successful payment
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "userId": "uuid",
  "locationId": "uuid",
  "membershipType": "Premium"
}
```

### Implementation Details

#### Stripe Configuration
```typescript
// Environment Variables
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Stripe Client Setup
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY!);
```

#### Mobile Implementation
```typescript
// Payment Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // Amount in cents
  onSuccess: () => void;
  selectedPaymentMethod?: string;
  metadata: {
    userId: string;
    type: 'membership' | 'court_reservation' | 'lesson';
    [key: string]: any;
  };
}

// Payment Flow
const handlePayment = async (amount: number, metadata: any) => {
  // 1. Create payment intent
  const intentResponse = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount, metadata })
  });
  
  const { clientSecret } = await intentResponse.json();
  
  // 2. Confirm payment with Stripe
  const { error } = await stripe.confirmPayment({
    clientSecret,
    confirmParams: {
      return_url: 'your-app://payment-success'
    }
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  // 3. Handle success (activate membership, confirm booking, etc.)
  await handlePaymentSuccess(metadata);
};
```

#### Payment Types
1. **Membership Payments**: Activate user membership
2. **Court Reservations**: Confirm court booking
3. **Lesson Bookings**: Confirm lesson booking
4. **Event Registrations**: Confirm event registration

---

## Feature 3: Court Reservation Wizard

### Overview
Multi-step wizard for booking court reservations with availability checking, payment processing, and confirmation.

### API Endpoints

#### GET `/api/courts/availability`
**Purpose**: Get available courts and time slots
**Query Parameters**:
- `locationId`: string
- `date`: string (YYYY-MM-DD)
- `startTime`: string (HH:MM)
- `endTime`: string (HH:MM)

**Response**:
```json
{
  "courts": [
    {
      "id": "uuid",
      "name": "Court 1",
      "available": true,
      "timeSlots": [
        {
          "startTime": "10:00",
          "endTime": "12:00",
          "available": true,
          "price": 5000
        }
      ]
    }
  ]
}
```

#### POST `/api/reservations/create`
**Purpose**: Create court reservation
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "courtId": "uuid",
  "date": "2024-01-15",
  "startTime": "10:00",
  "endTime": "12:00"
}
```

### Implementation Details

#### Wizard Steps
1. **Location Selection**: Choose facility location
2. **Date Selection**: Pick reservation date
3. **Time Selection**: Choose available time slots
4. **Court Selection**: Select available court
5. **Payment**: Process payment (if required)
6. **Confirmation**: Show booking confirmation

#### Mobile Implementation
```typescript
// Court Reservation Wizard Component
interface CourtReservationWizardProps {
  onClose: () => void;
  locationId: string;
  userMembershipLocationId?: string;
  locations: Location[];
  supabase: SupabaseClient;
}

// State Management
const [step, setStep] = useState(1);
const [selectedDate, setSelectedDate] = useState<Date>();
const [selectedTimeRange, setSelectedTimeRange] = useState<TimeSlot[]>([]);
const [selectedCourt, setSelectedCourt] = useState<Court>();
const [showCheckout, setShowCheckout] = useState(false);

// Step Navigation
const nextStep = () => setStep(prev => prev + 1);
const prevStep = () => setStep(prev => prev - 1);

// Availability Check
const checkAvailability = async (date: Date, startTime: string, endTime: string) => {
  const response = await fetch(
    `/api/courts/availability?locationId=${locationId}&date=${date.toISOString().split('T')[0]}&startTime=${startTime}&endTime=${endTime}`
  );
  return response.json();
};

// Reservation Creation
const createReservation = async (reservationData: any) => {
  const response = await fetch('/api/reservations/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(reservationData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
};
```

#### Pricing Logic
```typescript
// Calculate reservation cost
const calculateCost = (timeSlots: TimeSlot[], userRole: string) => {
  const baseCost = timeSlots.reduce((total, slot) => total + slot.price, 0);
  
  // Apply membership discount
  if (userRole === 'member') {
    return baseCost * 0.8; // 20% discount
  }
  
  return baseCost;
};
```

---

## Feature 4: Lesson Booking Wizard

### Overview
Multi-step wizard for booking private lessons with coaches, including coach selection, availability checking, and payment processing.

### API Endpoints

#### GET `/api/coaches`
**Purpose**: Get available coaches
**Response**:
```json
{
  "coaches": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Coach",
      "coaching_rate": 75.00,
      "bio": "Certified pickleball instructor...",
      "specialties": ["beginner", "advanced"],
      "rating": 4.8,
      "total_lessons": 150
    }
  ]
}
```

#### GET `/api/lessons/availability`
**Purpose**: Get available lesson time slots
**Query Parameters**:
- `coachId`: string (optional - for specific coach)
- `date`: string (YYYY-MM-DD)
- `duration`: number (hours)

**Response**:
```json
{
  "timeSlots": [
    {
      "time": "10:00",
      "available": true,
      "coach_id": "uuid"
    }
  ]
}
```

#### POST `/api/lessons/book`
**Purpose**: Book a lesson
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "coach_id": "uuid",
  "start_time": "2024-01-15T10:00:00Z",
  "duration_hours": 1,
  "court_id": "uuid",
  "title": "Private Lesson",
  "description": "Beginner lesson",
  "guests": [
    {
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane@example.com"
    }
  ]
}
```

### Implementation Details

#### Wizard Steps
1. **Coach Selection**: Choose coach or "Any Available Coach"
2. **Date & Time**: Select lesson date and time
3. **Court Selection**: Choose available court
4. **Confirmation**: Review booking details and pricing
5. **Payment**: Process payment (if required)
6. **Success**: Show booking confirmation

#### Mobile Implementation
```typescript
// Lesson Booking Wizard Component
interface LessonBookingWizardProps {
  initialCoachId?: string;
  onClose: () => void;
}

// State Management
const [step, setStep] = useState(1);
const [selectedCoach, setSelectedCoach] = useState<Coach>();
const [selectedDate, setSelectedDate] = useState<Date>();
const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>();
const [selectedCourt, setSelectedCourt] = useState<Court>();
const [bookingData, setBookingData] = useState<BookingData>({
  coach_id: '',
  duration: 60, // Default 60 minutes
});

// Coach Loading
const loadCoaches = async () => {
  const response = await fetch('/api/coaches');
  const { coaches } = await response.json();
  setCoaches(coaches);
};

// Availability Check
const loadAvailability = async (coachId: string, date: Date) => {
  const response = await fetch(
    `/api/lessons/availability?coachId=${coachId}&date=${date.toISOString().split('T')[0]}`
  );
  const { timeSlots } = await response.json();
  setTimeSlots(timeSlots);
};

// Lesson Booking
const bookLesson = async (lessonData: any) => {
  const response = await fetch('/api/lessons/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(lessonData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
};
```

#### Pricing Calculation
```typescript
// Calculate lesson price with membership discount
const calculateLessonPrice = async (coachId: string, duration: number) => {
  const response = await fetch(
    `/api/lessons/pricing?coachId=${coachId}&duration=${duration}`
  );
  const { price, discount, finalPrice } = await response.json();
  
  return {
    basePrice: price,
    membershipDiscount: discount,
    finalPrice: finalPrice
  };
};
```

---

## Pricing Logic Implementation

### Overview
The pricing system calculates costs based on event type, user membership, and applies appropriate discounts.

### Database Schema

#### membership_event_discounts Table
```sql
CREATE TABLE membership_event_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_type_id BIGINT REFERENCES membership_types(id),
    event_type_id UUID REFERENCES event_types(id),
    discount_percentage INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(membership_type_id, event_type_id),
    CONSTRAINT valid_discount_percentage CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);
```

#### Current Discount Structure
- **Standard Membership**: 15% discount on all activities
- **Ultimate Membership**: 
  - 33% discount on court reservations, clinics, and lessons
  - 100% discount (free) on league play

### Pricing Calculation Functions

#### 1. Lesson Pricing
```sql
-- Database function for lesson pricing
CREATE OR REPLACE FUNCTION calculate_lesson_price(
    p_user_id UUID,
    p_coach_rate DECIMAL,
    p_duration_hours INTEGER DEFAULT 1
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_price DECIMAL;
    discount_amount DECIMAL := 0;
    final_price DECIMAL;
BEGIN
    -- Calculate base price
    base_price := p_coach_rate * p_duration_hours;
    
    -- Get membership discount for lessons
    SELECT COALESCE(mec.discount_amount, 0) INTO discount_amount
    FROM memberships m
    JOIN membership_event_costs mec ON m.membership_type_id = mec.membership_type_id
    JOIN event_types et ON mec.event_type_id = et.id
    WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND et.name = 'Lesson'
    AND m.deleted_at IS NULL
    ORDER BY mec.discount_amount DESC
    LIMIT 1;
    
    -- Apply discount
    final_price := base_price - discount_amount;
    
    -- Ensure price is not negative
    IF final_price < 0 THEN
        final_price := 0;
    END IF;
    
    RETURN final_price;
END;
$$;
```

#### 2. Court Reservation Pricing
```typescript
// Mobile implementation for court pricing
const calculateCourtPrice = async (courtId: string, duration: number, userId: string) => {
  // Get base court price
  const { data: court } = await supabase
    .from('courts')
    .select('hourly_rate')
    .eq('id', courtId)
    .single();

  const basePrice = court.hourly_rate * duration;

  // Get user's membership discount
  const { data: discount } = await supabase
    .from('membership_event_discounts')
    .select('discount_percentage')
    .eq('event_type_id', 'court-reservation-type-id')
    .eq('membership_type_id', userMembershipTypeId)
    .single();

  const discountAmount = basePrice * (discount?.discount_percentage || 0) / 100;
  const finalPrice = basePrice - discountAmount;

  return {
    basePrice,
    discountAmount,
    finalPrice,
    discountPercentage: discount?.discount_percentage || 0
  };
};
```

### API Endpoints for Pricing

#### GET `/api/lessons/pricing`
**Purpose**: Get lesson pricing with membership discounts
**Query Parameters**:
- `coachId`: string
- `duration`: number (hours)

**Response**:
```json
{
  "basePrice": 75.00,
  "discountAmount": 24.75,
  "finalPrice": 50.25,
  "discountPercentage": 33,
  "membershipType": "Ultimate"
}
```

#### GET `/api/courts/pricing`
**Purpose**: Get court reservation pricing with membership discounts
**Query Parameters**:
- `courtId`: string
- `duration`: number (hours)

**Response**:
```json
{
  "basePrice": 50.00,
  "discountAmount": 7.50,
  "finalPrice": 42.50,
  "discountPercentage": 15,
  "membershipType": "Standard"
}
```

### Mobile Implementation for Pricing

#### 1. Check User Membership
```typescript
// Get user's active membership
const getUserMembership = async (userId: string) => {
  const { data: membership } = await supabase
    .from('memberships')
    .select(`
      id,
      membership_type_id,
      status,
      membership_types (
        name,
        cost_mxn
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  return membership;
};
```

#### 2. Calculate Event Price
```typescript
// Calculate price for any event type
const calculateEventPrice = async (eventTypeId: string, basePrice: number, userId: string) => {
  // Get user's membership
  const membership = await getUserMembership(userId);
  
  if (!membership) {
    return {
      basePrice,
      discountAmount: 0,
      finalPrice: basePrice,
      discountPercentage: 0,
      membershipType: 'No Membership'
    };
  }

  // Get membership discount for this event type
  const { data: discount } = await supabase
    .from('membership_event_discounts')
    .select('discount_percentage')
    .eq('membership_type_id', membership.membership_type_id)
    .eq('event_type_id', eventTypeId)
    .single();

  const discountPercentage = discount?.discount_percentage || 0;
  const discountAmount = basePrice * discountPercentage / 100;
  const finalPrice = basePrice - discountAmount;

  return {
    basePrice,
    discountAmount,
    finalPrice,
    discountPercentage,
    membershipType: membership.membership_types.name
  };
};
```

#### 3. Display Pricing in UI
```typescript
// Component for displaying pricing
const PricingDisplay = ({ basePrice, discountAmount, finalPrice, membershipType }) => {
  return (
    <div className="pricing-summary">
      <div className="base-price">
        <span>Base Price:</span>
        <span>${basePrice.toFixed(2)}</span>
      </div>
      
      {discountAmount > 0 && (
        <div className="discount">
          <span>{membershipType} Discount:</span>
          <span>-${discountAmount.toFixed(2)}</span>
        </div>
      )}
      
      <div className="final-price">
        <span>Total:</span>
        <span>${finalPrice.toFixed(2)}</span>
      </div>
    </div>
  );
};
```

---

## Common Implementation Patterns

### Authentication
```typescript
// Always use getSession() for API route authentication
const { data: { session }, error } = await supabase.auth.getSession();
if (error || !session?.user) {
  throw new Error('Unauthorized');
}

// Use createRouteHandlerClient for reliable authentication
const supabase = createRouteHandlerClient<Database>({ cookies });
```

### Error Handling
```typescript
// Consistent error handling pattern
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
  toast.error(error.message);
}
```

### Loading States
```typescript
// Loading state management
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await performAction();
  } catch (error) {
    handleError(error);
  } finally {
    setIsLoading(false);
  }
};
```

### Translation Support
```typescript
// Internationalization support
const { t } = useTranslations();

// Use translation keys
const title = t('lessons', 'bookLesson');
const description = t('lessons', 'bookLessonDescription');
```

---

## Database Schema References

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  has_signed_waiver BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'guest',
  coaching_rate DECIMAL(10,2),
  bio TEXT,
  specialties TEXT[],
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type_id INTEGER REFERENCES event_types(id),
  location_id UUID REFERENCES locations(id),
  coach_id UUID REFERENCES users(id),
  lesson_duration TEXT,
  price DECIMAL(10,2),
  max_participants INTEGER,
  status TEXT DEFAULT 'confirmed',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### Event Registrations Table
```sql
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  guest_first_name TEXT,
  guest_last_name TEXT,
  guest_email TEXT,
  payment_intent_id TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

---

## Testing Checklist

### Waiver Support
- [ ] User without waiver cannot register for events
- [ ] Waiver modal displays correctly
- [ ] Waiver acceptance updates user profile
- [ ] Registration proceeds after waiver acceptance

### Stripe Checkout
- [ ] Payment intent creation works
- [ ] Payment confirmation processes correctly
- [ ] Error handling for failed payments
- [ ] Success callbacks trigger appropriate actions

### Court Reservation Wizard
- [ ] All wizard steps function correctly
- [ ] Availability checking works
- [ ] Payment integration functions
- [ ] Reservation confirmation displays

### Lesson Booking Wizard
- [ ] Coach selection works
- [ ] Availability checking for coaches
- [ ] Court selection integration
- [ ] Lesson booking confirmation

### Pricing Logic
- [ ] Base pricing calculation works correctly
- [ ] Membership discounts are applied properly
- [ ] Different membership types show correct discounts
- [ ] Pricing display shows breakdown (base, discount, final)
- [ ] No membership users pay full price

### General
- [ ] Authentication works on all endpoints
- [ ] Error handling is user-friendly
- [ ] Loading states display correctly
- [ ] Translations work in both languages
- [ ] Mobile UI is responsive and accessible

---

## Deployment Notes

1. **Environment Variables**: Ensure all Stripe keys are configured
2. **Database Migrations**: Run all required migrations
3. **RLS Policies**: Verify row-level security policies are active
4. **API Endpoints**: Test all endpoints before deployment
5. **Mobile Testing**: Test on actual mobile devices, not just simulators

## Security Considerations

1. **Authentication**: Always verify user sessions
2. **Authorization**: Check user permissions for each action
3. **Input Validation**: Validate all user inputs
4. **Payment Security**: Never handle payment data directly
5. **Data Protection**: Follow GDPR/privacy requirements
