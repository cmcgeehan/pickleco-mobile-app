# Mobile Membership Purchasing Flow PRD

## Overview
This document provides comprehensive PRDs for implementing the membership purchasing flow in the mobile app, including membership selection, checkout, payment processing, and activation.

## Feature Overview
The membership purchasing flow allows users to:
1. **Browse membership options** with dynamic pricing from database
2. **Select a membership plan** based on their needs
3. **Complete checkout** with location selection and profile verification
4. **Process payment** through Stripe integration
5. **Activate membership** upon successful payment
6. **Access membership benefits** including event discounts

## Feature 1: Membership Selection & Display

### Overview
Display available membership types with dynamic pricing, features, and comparison options.

### API Endpoints

#### GET `/api/membership/types`
**Purpose**: Get all available membership types with pricing and features
**Authentication**: Not required (public endpoint)
**Response**:
```json
{
  "membershipTypes": [
    {
      "id": 15,
      "name": "standard",
      "displayName": "Standard",
      "description": "Perfect for regular players",
      "cost_mxn": 1500,
      "stripe_product_id": "prod_xyz",
      "features": [
        "Open Play Access",
        "League Play",
        "Court Reservations",
        "Lessons",
        "Clinics",
        "Guest Passes"
      ],
      "discounts": [
        {
          "eventType": "Court Reservation",
          "discountPercentage": 15
        },
        {
          "eventType": "League Play", 
          "discountPercentage": 15
        }
      ]
    },
    {
      "id": 1,
      "name": "ultimate",
      "displayName": "Ultimate",
      "description": "Ultimate membership experience",
      "cost_mxn": 2500,
      "stripe_product_id": "prod_abc",
      "features": [
        "Open Play Access",
        "Free League Play",
        "Court Reservations",
        "Lessons",
        "Clinics",
        "Guest Passes",
        "Pre-Launch Access"
      ],
      "discounts": [
        {
          "eventType": "Court Reservation",
          "discountPercentage": 33
        },
        {
          "eventType": "League Play",
          "discountPercentage": 100
        },
        {
          "eventType": "Lesson",
          "discountPercentage": 33
        }
      ]
    },
    {
      "id": 16,
      "name": "pay_to_play",
      "displayName": "Pay to Play",
      "description": "Per event pricing",
      "cost_mxn": 0,
      "stripe_product_id": null,
      "features": [
        "Open Play Access",
        "League Play",
        "Court Reservations",
        "Lessons",
        "Clinics",
        "Guest Passes"
      ],
      "discounts": []
    }
  ]
}
```

### Implementation Details

#### Database Schema
- **Table**: `membership_types`
- **Fields**: id, name, description, cost_mxn, stripe_product_id
- **Related**: `membership_event_discounts` for event-specific discounts

#### Mobile Implementation
```typescript
// Membership Types Interface
interface MembershipType {
  id: number;
  name: string;
  displayName: string;
  description: string;
  cost_mxn: number;
  stripe_product_id: string | null;
  features: string[];
  discounts: MembershipDiscount[];
}

interface MembershipDiscount {
  eventType: string;
  discountPercentage: number;
}

// Fetch Membership Types
const fetchMembershipTypes = async () => {
  const response = await fetch('/api/membership/types');
  if (!response.ok) {
    throw new Error('Failed to fetch membership types');
  }
  return response.json();
};

// Membership Selection Component
const MembershipSelection = () => {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<MembershipType | null>(null);

  useEffect(() => {
    const loadMembershipTypes = async () => {
      try {
        const data = await fetchMembershipTypes();
        setMembershipTypes(data.membershipTypes);
      } catch (error) {
        console.error('Error loading membership types:', error);
      }
    };
    loadMembershipTypes();
  }, []);

  const handleMembershipSelect = (membership: MembershipType) => {
    setSelectedMembership(membership);
    // Navigate to checkout or show checkout modal
  };

  return (
    <View style={styles.container}>
      {membershipTypes.map((membership) => (
        <MembershipCard
          key={membership.id}
          membership={membership}
          onSelect={() => handleMembershipSelect(membership)}
          isSelected={selectedMembership?.id === membership.id}
        />
      ))}
    </View>
  );
};
```

---

## Feature 2: Membership Checkout Flow

### Overview
Multi-step checkout process including location selection, profile verification, and payment setup.

### API Endpoints

#### GET `/api/membership/checkout/setup`
**Purpose**: Get checkout setup data (locations, user profile, payment methods)
**Authentication**: Required (Bearer token)
**Response**:
```json
{
  "locations": [
    {
      "id": "uuid",
      "name": "Polanco",
      "address": "Polanco, Mexico City",
      "open": true,
      "launch_date": "2024-02-01T00:00:00Z"
    }
  ],
  "userProfile": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+525512345678",
    "has_signed_waiver": true
  },
  "paymentMethods": [
    {
      "id": "pm_xyz",
      "last4": "4242",
      "brand": "visa",
      "exp_month": 12,
      "exp_year": 2025
    }
  ]
}
```

#### POST `/api/membership/checkout/validate`
**Purpose**: Validate checkout data before proceeding to payment
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "membershipTypeId": 15,
  "locationId": "uuid",
  "selectedPaymentMethodId": "pm_xyz"
}
```
**Response**:
```json
{
  "valid": true,
  "totalAmount": 1500,
  "currency": "mxn",
  "stripeProductId": "prod_xyz",
  "errors": []
}
```

### Implementation Details

#### Checkout Steps
1. **Membership Selection** - User selects membership type
2. **Location Selection** - Choose facility location
3. **Profile Verification** - Ensure required profile fields are complete
4. **Payment Method** - Select or add payment method
5. **Review & Confirm** - Review details before payment
6. **Payment Processing** - Stripe payment integration
7. **Activation** - Activate membership upon success

#### Mobile Implementation
```typescript
// Checkout Flow Component
const MembershipCheckout = ({ membershipType }: { membershipType: MembershipType }) => {
  const [step, setStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState({
    membershipTypeId: membershipType.id,
    locationId: '',
    selectedPaymentMethodId: '',
    userProfile: null,
    locations: [],
    paymentMethods: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load checkout setup data
  useEffect(() => {
    const loadCheckoutSetup = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/membership/checkout/setup', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setCheckoutData(prev => ({
          ...prev,
          userProfile: data.userProfile,
          locations: data.locations,
          paymentMethods: data.paymentMethods
        }));
      } catch (error) {
        console.error('Error loading checkout setup:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCheckoutSetup();
  }, []);

  // Validate checkout data
  const validateCheckout = async () => {
    try {
      const response = await fetch('/api/membership/checkout/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          membershipTypeId: checkoutData.membershipTypeId,
          locationId: checkoutData.locationId,
          selectedPaymentMethodId: checkoutData.selectedPaymentMethodId
        })
      });
      
      const validation = await response.json();
      if (validation.valid) {
        setStep(6); // Proceed to payment
      } else {
        // Handle validation errors
        console.error('Validation errors:', validation.errors);
      }
    } catch (error) {
      console.error('Error validating checkout:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <MembershipSummary membership={membershipType} />;
      case 2:
        return (
          <LocationSelection
            locations={checkoutData.locations}
            selectedLocationId={checkoutData.locationId}
            onLocationSelect={(locationId) => setCheckoutData(prev => ({ ...prev, locationId }))}
            onNext={() => setStep(3)}
          />
        );
      case 3:
        return (
          <ProfileVerification
            userProfile={checkoutData.userProfile}
            onComplete={() => setStep(4)}
            onEdit={() => router.push('/account')}
          />
        );
      case 4:
        return (
          <PaymentMethodSelection
            paymentMethods={checkoutData.paymentMethods}
            selectedPaymentMethodId={checkoutData.selectedPaymentMethodId}
            onPaymentMethodSelect={(paymentMethodId) => setCheckoutData(prev => ({ ...prev, selectedPaymentMethodId: paymentMethodId }))}
            onNext={() => setStep(5)}
          />
        );
      case 5:
        return (
          <CheckoutReview
            checkoutData={checkoutData}
            membershipType={membershipType}
            onConfirm={validateCheckout}
          />
        );
      case 6:
        return (
          <PaymentProcessing
            checkoutData={checkoutData}
            membershipType={membershipType}
            onSuccess={() => setStep(7)}
            onError={() => setStep(5)}
          />
        );
      case 7:
        return <MembershipActivated membershipType={membershipType} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <CheckoutProgress step={step} totalSteps={7} />
      {renderStep()}
    </View>
  );
};
```

---

## Feature 3: Payment Processing

### Overview
Secure payment processing using Stripe for membership purchases.

### API Endpoints

#### POST `/api/create-payment-intent`
**Purpose**: Create Stripe payment intent for membership purchase
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "amount": 1500,
  "currency": "mxn",
  "metadata": {
    "userId": "uuid",
    "type": "membership",
    "membershipTypeId": 15,
    "locationId": "uuid",
    "membershipTypeName": "Standard"
  },
  "paymentMethodId": "pm_xyz"
}
```
**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
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
  "membershipType": "Standard",
  "paymentIntentId": "pi_xxx"
}
```
**Response**:
```json
{
  "success": true,
  "membership": {
    "id": "uuid",
    "user_id": "uuid",
    "membership_type_id": 15,
    "location_id": "uuid",
    "status": "active",
    "start_date": "2024-01-17T00:00:00Z"
  }
}
```

### Implementation Details

#### Stripe Integration
```typescript
// Payment Processing Component
const PaymentProcessing = ({ 
  checkoutData, 
  membershipType, 
  onSuccess, 
  onError 
}: PaymentProcessingProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // 1. Create payment intent
      const intentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: membershipType.cost_mxn * 100, // Convert to cents
          currency: 'mxn',
          metadata: {
            userId: checkoutData.userProfile.id,
            type: 'membership',
            membershipTypeId: membershipType.id,
            locationId: checkoutData.locationId,
            membershipTypeName: membershipType.name
          },
          paymentMethodId: checkoutData.selectedPaymentMethodId
        })
      });

      if (!intentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId } = await intentResponse.json();

      // 2. Confirm payment with Stripe
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: 'your-app://payment-success',
          payment_method: checkoutData.selectedPaymentMethodId
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // 3. Activate membership
      const activationResponse = await fetch('/api/membership/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: checkoutData.userProfile.id,
          locationId: checkoutData.locationId,
          membershipType: membershipType.name,
          paymentIntentId
        })
      });

      if (!activationResponse.ok) {
        throw new Error('Failed to activate membership');
      }

      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message);
      onError();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing Payment</Text>
      <Text style={styles.amount}>
        ${membershipType.cost_mxn.toLocaleString()} MXN
      </Text>
      
      {isProcessing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing your payment...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try Again" onPress={processPayment} />
        </View>
      )}

      <Button 
        title="Start Payment" 
        onPress={processPayment}
        disabled={isProcessing}
      />
    </View>
  );
};
```

---

## Feature 4: Membership Management

### Overview
View and manage active memberships, including status, benefits, and renewal.

### API Endpoints

#### GET `/api/membership/active`
**Purpose**: Get user's active memberships
**Authentication**: Required (Bearer token)
**Response**:
```json
{
  "memberships": [
    {
      "id": "uuid",
      "membership_type": {
        "id": 15,
        "name": "Standard",
        "description": "Perfect for regular players",
        "cost_mxn": 1500
      },
      "location": {
        "id": "uuid",
        "name": "Polanco",
        "address": "Polanco, Mexico City"
      },
      "status": "active",
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-02-01T00:00:00Z",
      "discounts": [
        {
          "eventType": "Court Reservation",
          "discountPercentage": 15
        }
      ]
    }
  ]
}
```

#### GET `/api/membership/history`
**Purpose**: Get user's membership history
**Authentication**: Required (Bearer token)
**Response**:
```json
{
  "memberships": [
    {
      "id": "uuid",
      "membership_type": {
        "name": "Standard",
        "cost_mxn": 1500
      },
      "status": "expired",
      "start_date": "2023-01-01T00:00:00Z",
      "end_date": "2023-12-31T00:00:00Z"
    }
  ]
}
```

### Implementation Details

#### Membership Dashboard
```typescript
// Membership Management Component
const MembershipManagement = () => {
  const [activeMemberships, setActiveMemberships] = useState([]);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMemberships = async () => {
      try {
        const [activeResponse, historyResponse] = await Promise.all([
          fetch('/api/membership/active', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/membership/history', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const activeData = await activeResponse.json();
        const historyData = await historyResponse.json();

        setActiveMemberships(activeData.memberships);
        setMembershipHistory(historyData.memberships);
      } catch (error) {
        console.error('Error loading memberships:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemberships();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Memberships</Text>
      
      {activeMemberships.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>Active Memberships</Text>
          {activeMemberships.map((membership) => (
            <ActiveMembershipCard
              key={membership.id}
              membership={membership}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You don't have any active memberships
          </Text>
          <Button 
            title="Browse Memberships" 
            onPress={() => router.push('/membership')}
          />
        </View>
      )}

      {membershipHistory.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Membership History</Text>
          {membershipHistory.map((membership) => (
            <MembershipHistoryCard
              key={membership.id}
              membership={membership}
            />
          ))}
        </View>
      )}
    </View>
  );
};
```

---

## Database Schema

### Core Tables

#### membership_types
```sql
CREATE TABLE membership_types (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cost_mxn INTEGER NOT NULL DEFAULT 0,
    stripe_product_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

#### memberships
```sql
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    membership_type_id BIGINT REFERENCES membership_types(id),
    location_id UUID REFERENCES locations(id),
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

#### membership_event_discounts
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

### Current Membership Types
1. **Standard** - $1,500 MXN/month
   - 15% discount on all activities
2. **Ultimate** - $2,500 MXN/month
   - 33% discount on court reservations, clinics, lessons
   - 100% discount (free) on league play
3. **Pay to Play** - $0 MXN/month
   - No discounts, pay per event

---

## User Flow

### Complete Membership Purchase Flow
1. **Browse Memberships** - User views available plans with pricing
2. **Select Plan** - Choose membership type (Standard, Ultimate, Pay to Play)
3. **Location Selection** - Choose facility location
4. **Profile Verification** - Ensure required profile fields are complete
5. **Payment Setup** - Select or add payment method
6. **Review & Confirm** - Review membership details and pricing
7. **Payment Processing** - Stripe payment integration
8. **Membership Activation** - Activate membership in database
9. **Success Confirmation** - Show activation success and benefits

### Error Handling
- **Profile Incomplete** - Redirect to profile completion
- **Payment Failed** - Show error and retry options
- **Location Unavailable** - Show alternative locations
- **Network Errors** - Retry with exponential backoff

---

## Testing Checklist

### Membership Selection
- [ ] All membership types display correctly
- [ ] Dynamic pricing loads from database
- [ ] Features and benefits display properly
- [ ] Comparison between plans works

### Checkout Flow
- [ ] Location selection functions correctly
- [ ] Profile verification works
- [ ] Payment method selection works
- [ ] Validation prevents incomplete checkouts

### Payment Processing
- [ ] Payment intent creation works
- [ ] Stripe integration functions
- [ ] Payment confirmation processes
- [ ] Error handling for failed payments

### Membership Activation
- [ ] Membership activates after successful payment
- [ ] User role updates to 'member'
- [ ] Database records created correctly
- [ ] Success confirmation displays

### Membership Management
- [ ] Active memberships display correctly
- [ ] Membership history shows past memberships
- [ ] Benefits and discounts display properly
- [ ] Renewal options available

### General
- [ ] Authentication works on all endpoints
- [ ] Error handling is user-friendly
- [ ] Loading states display correctly
- [ ] Mobile UI is responsive and accessible

---

## Security Considerations

1. **Authentication** - All sensitive endpoints require valid session
2. **Authorization** - Users can only access their own membership data
3. **Payment Security** - Never handle payment data directly
4. **Input Validation** - Validate all user inputs and API requests
5. **RLS Policies** - Row-level security on all membership tables

## Performance Considerations

1. **Caching** - Cache membership types and pricing data
2. **Optimization** - Use efficient database queries with proper indexing
3. **Real-time Updates** - Consider real-time updates for membership status changes
4. **Offline Support** - Cache membership data for offline viewing

## Next Steps

1. **API Development** - Implement all required API endpoints
2. **Mobile UI** - Create membership selection and checkout screens
3. **Stripe Integration** - Set up payment processing
4. **Testing** - Comprehensive testing of all flows
5. **Deployment** - Deploy to production with monitoring
