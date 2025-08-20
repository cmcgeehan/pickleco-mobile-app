# Mobile Stripe Payment Integration PRD

## Overview
This document provides comprehensive PRDs for implementing Stripe payment integration in the mobile app, including payment methods management, payment history, and payment completion flows.

## Feature Overview
The Stripe payment integration allows users to:
1. **Manage Payment Methods** - Add, view, and remove payment methods
2. **View Payment History** - Track all transactions and invoices
3. **Complete Payments** - Process payments for memberships, events, and services
4. **Handle Payment Security** - Secure payment processing with Stripe

---

## Feature 1: Payment Methods Management

### Overview
Allow users to add, view, update, and remove payment methods (credit/debit cards) from their account.

### API Endpoints

#### GET `/api/stripe/payment-methods?userId={userId}`
**Purpose**: Get user's saved payment methods
**Authentication**: Required (Bearer token)
**Response**:
```json
{
  "paymentMethods": [
    {
      "id": "pm_1Oa2b3c4d5e6f7g8h9i0j1k2l",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025
      }
    },
    {
      "id": "pm_2Oa2b3c4d5e6f7g8h9i0j1k2l",
      "card": {
        "brand": "mastercard",
        "last4": "5555",
        "exp_month": 6,
        "exp_year": 2026
      }
    }
  ]
}
```

#### POST `/api/stripe/payment-methods`
**Purpose**: Add a new payment method to user's account
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "userId": "uuid",
  "paymentMethodId": "pm_1Oa2b3c4d5e6f7g8h9i0j1k2l"
}
```
**Response**:
```json
{
  "paymentMethod": {
    "id": "pm_1Oa2b3c4d5e6f7g8h9i0j1k2l",
    "type": "visa",
    "last4": "4242",
    "expiry": "12/25"
  }
}
```

#### DELETE `/api/stripe/payment-methods?paymentMethodId={paymentMethodId}`
**Purpose**: Remove a payment method from user's account
**Authentication**: Required (Bearer token)
**Response**:
```json
{
  "success": true
}
```

### Implementation Details

#### Stripe Customer Management
- Each user has a `stripe_customer_id` in the `users` table
- If user doesn't have a Stripe customer, one is created automatically
- Payment methods are attached to the Stripe customer

#### Mobile Implementation
```typescript
// Payment Methods Interface
interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface SavedPaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string;
}

// Payment Methods Management Component
const PaymentMethodsManager = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/stripe/payment-methods?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data.paymentMethods);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addPaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          paymentMethodId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add payment method');
      }

      await loadPaymentMethods(); // Refresh the list
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const removePaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`/api/stripe/payment-methods?paymentMethodId=${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      await loadPaymentMethods(); // Refresh the list
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Methods</Text>
      
      {paymentMethods.length > 0 ? (
        <View>
          {paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onRemove={() => removePaymentMethod(method.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No payment methods saved
          </Text>
        </View>
      )}

      <AddPaymentMethodButton onAdd={addPaymentMethod} />
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

// Payment Method Card Component
const PaymentMethodCard = ({ method, onRemove }: { method: PaymentMethod, onRemove: () => void }) => {
  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      default: return '💳';
    }
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardIcon}>{getCardIcon(method.card.brand)}</Text>
        <View style={styles.cardDetails}>
          <Text style={styles.cardBrand}>{method.card.brand.toUpperCase()}</Text>
          <Text style={styles.cardNumber}>•••• {method.card.last4}</Text>
          <Text style={styles.cardExpiry}>
            {method.card.exp_month}/{method.card.exp_year.toString().slice(-2)}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## Feature 2: Payment History & Invoices

### Overview
Display user's payment history including successful payments, failed attempts, and downloadable invoices.

### API Endpoints

#### GET `/api/stripe/payment-history?userId={userId}`
**Purpose**: Get user's payment history and invoices
**Authentication**: Required (Bearer token)
**Response**:
```json
{
  "payments": [
    {
      "id": "pi_1Oa2b3c4d5e6f7g8h9i0j1k2l",
      "amount": 150000,
      "currency": "mxn",
      "status": "succeeded",
      "created": 1642435200,
      "description": "Standard Membership - January 2024",
      "metadata": {
        "type": "membership",
        "membershipType": "Standard",
        "locationId": "uuid"
      },
      "receipt_url": "https://receipt.stripe.com/...",
      "invoice": {
        "id": "in_1Oa2b3c4d5e6f7g8h9i0j1k2l",
        "number": "INV-2024-001",
        "pdf": "https://pay.stripe.com/..."
      }
    },
    {
      "id": "pi_2Oa2b3c4d5e6f7g8h9i0j1k2l",
      "amount": 50000,
      "currency": "mxn",
      "status": "succeeded",
      "created": 1642348800,
      "description": "Court Reservation - January 15, 2024",
      "metadata": {
        "type": "court_reservation",
        "courtId": "uuid",
        "date": "2024-01-15",
        "startTime": "10:00",
        "endTime": "12:00"
      },
      "receipt_url": "https://receipt.stripe.com/...",
      "invoice": null
    }
  ],
  "totalPayments": 2,
  "totalAmount": 200000
}
```

#### GET `/api/stripe/invoice/{invoiceId}/pdf`
**Purpose**: Download invoice PDF
**Authentication**: Required (Bearer token)
**Response**: PDF file download

### Implementation Details

#### Payment Data Sources
- **Payment Intents**: From Stripe API for payment details
- **Invoices**: From Stripe API for billing documents
- **Metadata**: Custom data stored with each payment
- **Receipt URLs**: Direct links to Stripe receipts

#### Mobile Implementation
```typescript
// Payment History Interface
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'canceled';
  created: number;
  description: string;
  metadata: Record<string, any>;
  receipt_url: string;
  invoice?: {
    id: string;
    number: string;
    pdf: string;
  };
}

interface PaymentHistory {
  payments: Payment[];
  totalPayments: number;
  totalAmount: number;
}

// Payment History Component
const PaymentHistory = () => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/stripe/payment-history?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load payment history');
      }

      const data = await response.json();
      setPaymentHistory(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/stripe/invoice/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      // Handle PDF download based on platform
      if (Platform.OS === 'ios') {
        // iOS: Open in Safari or download to Files app
        Linking.openURL(response.url);
      } else {
        // Android: Download to Downloads folder
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        Linking.openURL(url);
      }
    } catch (error) {
      setError('Failed to download invoice');
    }
  };

  const openReceipt = (receiptUrl: string) => {
    Linking.openURL(receiptUrl);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!paymentHistory) {
    return <Text>No payment history available</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment History</Text>
        <Text style={styles.summary}>
          {paymentHistory.totalPayments} payments • 
          ${(paymentHistory.totalAmount / 100).toLocaleString()} {paymentHistory.payments[0]?.currency?.toUpperCase()}
        </Text>
      </View>

      <FlatList
        data={paymentHistory.payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PaymentHistoryCard
            payment={item}
            onDownloadInvoice={downloadInvoice}
            onOpenReceipt={openReceipt}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

// Payment History Card Component
const PaymentHistoryCard = ({ 
  payment, 
  onDownloadInvoice, 
  onOpenReceipt 
}: { 
  payment: Payment;
  onDownloadInvoice: (invoiceId: string) => void;
  onOpenReceipt: (receiptUrl: string) => void;
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return '#10B981';
      case 'failed': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'canceled': return '#6B7280';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentDescription}>{payment.description}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
          <Text style={styles.statusText}>{payment.status}</Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <Text style={styles.paymentAmount}>
          {formatAmount(payment.amount, payment.currency)}
        </Text>
        <Text style={styles.paymentDate}>{formatDate(payment.created)}</Text>
      </View>

      <View style={styles.paymentActions}>
        <TouchableOpacity 
          onPress={() => onOpenReceipt(payment.receipt_url)}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>View Receipt</Text>
        </TouchableOpacity>

        {payment.invoice && (
          <TouchableOpacity 
            onPress={() => onDownloadInvoice(payment.invoice.id)}
            style={[styles.actionButton, styles.downloadButton]}
          >
            <Text style={styles.downloadButtonText}>Download Invoice</Text>
          </TouchableOpacity>
        )}
      </View>

      {payment.metadata && (
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataTitle}>Details:</Text>
          {Object.entries(payment.metadata).map(([key, value]) => (
            <Text key={key} style={styles.metadataItem}>
              {key}: {value}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};
```

---

## Feature 3: Payment Completion

### Overview
Process payments for various services including memberships, court reservations, and lesson bookings.

### API Endpoints

#### POST `/api/create-payment-intent`
**Purpose**: Create a Stripe payment intent for processing payments
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "amount": 150000,
  "currency": "mxn",
  "paymentMethodId": "pm_1Oa2b3c4d5e6f7g8h9i0j1k2l",
  "metadata": {
    "userId": "uuid",
    "type": "membership",
    "membershipType": "Standard",
    "locationId": "uuid",
    "description": "Standard Membership - January 2024"
  }
}
```
**Response**:
```json
{
  "clientSecret": "pi_1Oa2b3c4d5e6f7g8h9i0j1k2l_secret_xxx",
  "paymentIntentId": "pi_1Oa2b3c4d5e6f7g8h9i0j1k2l"
}
```

#### POST `/api/stripe/confirm-payment`
**Purpose**: Confirm a payment after Stripe processing
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "paymentIntentId": "pi_1Oa2b3c4d5e6f7g8h9i0j1k2l",
  "metadata": {
    "userId": "uuid",
    "type": "membership",
    "membershipType": "Standard",
    "locationId": "uuid"
  }
}
```
**Response**:
```json
{
  "success": true,
  "payment": {
    "id": "pi_1Oa2b3c4d5e6f7g8h9i0j1k2l",
    "status": "succeeded",
    "amount": 150000,
    "currency": "mxn"
  }
}
```

### Implementation Details

#### Payment Flow
1. **Create Payment Intent** - Server creates Stripe payment intent
2. **Client Confirmation** - Mobile app confirms payment with Stripe
3. **Payment Processing** - Stripe processes the payment
4. **Confirmation** - Server confirms successful payment
5. **Service Activation** - Activate membership, confirm reservation, etc.

#### Mobile Implementation
```typescript
// Payment Processing Interface
interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

interface PaymentConfirmation {
  success: boolean;
  payment: {
    id: string;
    status: string;
    amount: number;
    currency: string;
  };
}

// Payment Processing Component
const PaymentProcessor = ({ 
  amount, 
  metadata, 
  onSuccess, 
  onError 
}: { 
  amount: number;
  metadata: Record<string, any>;
  onSuccess: (payment: any) => void;
  onError: (error: string) => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch(`/api/stripe/payment-methods?userId=${metadata.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods);
        if (data.paymentMethods.length > 0) {
          setSelectedPaymentMethod(data.paymentMethods[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const processPayment = async () => {
    if (!selectedPaymentMethod) {
      onError('Please select a payment method');
      return;
    }

    try {
      setIsProcessing(true);

      // 1. Create payment intent
      const intentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          currency: 'mxn',
          paymentMethodId: selectedPaymentMethod,
          metadata
        })
      });

      if (!intentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId }: PaymentIntent = await intentResponse.json();

      // 2. Confirm payment with Stripe
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: 'your-app://payment-success',
          payment_method: selectedPaymentMethod
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // 3. Confirm payment on server
      const confirmationResponse = await fetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentIntentId,
          metadata
        })
      });

      if (!confirmationResponse.ok) {
        throw new Error('Failed to confirm payment');
      }

      const confirmation: PaymentConfirmation = await confirmationResponse.json();

      if (confirmation.success) {
        onSuccess(confirmation.payment);
      } else {
        throw new Error('Payment confirmation failed');
      }

    } catch (error) {
      console.error('Payment error:', error);
      onError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <View style={styles.paymentSummary}>
        <Text style={styles.paymentTitle}>Payment Summary</Text>
        <Text style={styles.paymentAmount}>{formatAmount(amount)}</Text>
        <Text style={styles.paymentDescription}>{metadata.description}</Text>
      </View>

      <View style={styles.paymentMethodSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        {paymentMethods.length > 0 ? (
          <View>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodOption,
                  selectedPaymentMethod === method.id && styles.selectedPaymentMethod
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.cardBrand}>{method.card.brand.toUpperCase()}</Text>
                  <Text style={styles.cardNumber}>•••• {method.card.last4}</Text>
                  <Text style={styles.cardExpiry}>
                    {method.card.exp_month}/{method.card.exp_year.toString().slice(-2)}
                  </Text>
                </View>
                {selectedPaymentMethod === method.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.noPaymentMethods}>
            <Text style={styles.noPaymentMethodsText}>
              No payment methods available
            </Text>
            <TouchableOpacity style={styles.addPaymentMethodButton}>
              <Text style={styles.addPaymentMethodButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.processPaymentButton,
          (!selectedPaymentMethod || isProcessing) && styles.disabledButton
        ]}
        onPress={processPayment}
        disabled={!selectedPaymentMethod || isProcessing}
      >
        {isProcessing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <Text style={styles.processPaymentButtonText}>
            Pay {formatAmount(amount)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

---

## Feature 4: Stripe Configuration & Setup

### Overview
Configure Stripe SDK and handle environment-specific settings for mobile app.

### Implementation Details

#### Stripe SDK Setup
```typescript
// Stripe Configuration
import { initStripe } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = __DEV__ 
  ? 'pk_test_your_test_key_here'
  : 'pk_live_your_live_key_here';

// Initialize Stripe in App.tsx or main component
useEffect(() => {
  const initializeStripe = async () => {
    try {
      await initStripe({
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        merchantIdentifier: 'merchant.com.yourapp', // For Apple Pay
        urlScheme: 'yourapp://', // For return URLs
      });
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  };

  initializeStripe();
}, []);
```

#### Environment Configuration
```typescript
// Environment Configuration
const STRIPE_CONFIG = {
  test: {
    publishableKey: 'pk_test_your_test_key',
    secretKey: 'sk_test_your_secret_key',
    webhookSecret: 'whsec_your_test_webhook_secret'
  },
  production: {
    publishableKey: 'pk_live_your_live_key',
    secretKey: 'sk_live_your_live_secret',
    webhookSecret: 'whsec_your_live_webhook_secret'
  }
};

const getStripeConfig = () => {
  return __DEV__ ? STRIPE_CONFIG.test : STRIPE_CONFIG.production;
};
```

---

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### payment_intents
```sql
CREATE TABLE payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'mxn',
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### invoices
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    payment_intent_id UUID REFERENCES payment_intents(id),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'mxn',
    status TEXT NOT NULL,
    pdf_url TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Security Considerations

### Payment Security
1. **Never store card details** - Only store Stripe payment method IDs
2. **Use HTTPS** - All API calls must use secure connections
3. **Validate input** - Sanitize all user inputs and metadata
4. **Webhook verification** - Verify Stripe webhook signatures
5. **Token-based auth** - Use JWT tokens for API authentication

### Data Protection
1. **PCI Compliance** - Stripe handles PCI compliance
2. **Encryption** - All sensitive data encrypted in transit
3. **Access Control** - Users can only access their own payment data
4. **Audit Logging** - Log all payment-related activities

---

## Error Handling

### Common Error Scenarios
1. **Payment Failed** - Insufficient funds, expired card, etc.
2. **Network Errors** - Connection issues during payment
3. **Authentication Errors** - Invalid or expired tokens
4. **Stripe Errors** - API errors from Stripe
5. **Validation Errors** - Invalid payment data

### Error Handling Implementation
```typescript
// Error Handling Utilities
const handlePaymentError = (error: any) => {
  if (error.type === 'StripeCardError') {
    return {
      title: 'Card Error',
      message: error.message,
      action: 'Please check your card details and try again'
    };
  } else if (error.type === 'StripeInvalidRequestError') {
    return {
      title: 'Invalid Request',
      message: 'The payment request was invalid',
      action: 'Please contact support'
    };
  } else if (error.type === 'StripeAPIError') {
    return {
      title: 'Payment Service Error',
      message: 'There was an issue with the payment service',
      action: 'Please try again later'
    };
  } else {
    return {
      title: 'Payment Error',
      message: 'An unexpected error occurred',
      action: 'Please try again or contact support'
    };
  }
};

// Error Display Component
const PaymentError = ({ error, onRetry, onCancel }: { 
  error: any; 
  onRetry: () => void; 
  onCancel: () => void; 
}) => {
  const errorInfo = handlePaymentError(error);

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{errorInfo.title}</Text>
      <Text style={styles.errorMessage}>{errorInfo.message}</Text>
      <Text style={styles.errorAction}>{errorInfo.action}</Text>
      
      <View style={styles.errorActions}>
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

---

## Testing Checklist

### Payment Methods
- [ ] Add new payment method
- [ ] View existing payment methods
- [ ] Remove payment method
- [ ] Set default payment method
- [ ] Handle invalid payment method IDs

### Payment History
- [ ] Load payment history
- [ ] Display payment details
- [ ] Download invoices
- [ ] View receipts
- [ ] Handle empty payment history

### Payment Processing
- [ ] Create payment intent
- [ ] Confirm payment with Stripe
- [ ] Handle successful payments
- [ ] Handle failed payments
- [ ] Process different payment amounts
- [ ] Handle various currencies

### Error Handling
- [ ] Network errors
- [ ] Authentication errors
- [ ] Stripe API errors
- [ ] Invalid input errors
- [ ] Payment failure scenarios

### Security
- [ ] Token validation
- [ ] User authorization
- [ ] Data encryption
- [ ] Input sanitization
- [ ] Webhook verification

---

## Performance Considerations

1. **Caching** - Cache payment methods and history data
2. **Lazy Loading** - Load payment history in paginated chunks
3. **Optimistic Updates** - Update UI immediately for better UX
4. **Background Sync** - Sync payment status in background
5. **Image Optimization** - Optimize card brand icons

## Next Steps

1. **Stripe Account Setup** - Configure Stripe account and API keys
2. **Mobile SDK Integration** - Install and configure Stripe React Native SDK
3. **API Development** - Implement all required payment endpoints
4. **UI Development** - Create payment-related screens and components
5. **Testing** - Comprehensive testing of all payment flows
6. **Security Review** - Security audit of payment implementation
7. **Production Deployment** - Deploy with proper monitoring and logging
