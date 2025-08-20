import { Alert } from 'react-native';
import { initPaymentSheet, presentPaymentSheet, PaymentSheet, createPaymentMethod } from '@stripe/stripe-react-native';
import { supabase } from './supabase';

// Types for Stripe objects
export interface StripePaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
}

export interface StripePaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  description: string;
  created: number;
  receipt_url?: string;
  metadata?: Record<string, any>;
  invoice?: {
    id: string;
    number: string;
    pdf: string;
  };
  payment_method?: {
    card?: {
      brand: string;
      last4: string;
    };
  };
}

export interface StripeCustomer {
  id: string;
  email: string;
  default_source?: string;
}

class StripeService {
  private baseUrl: string;

  private stripePublishableKey: string;

  constructor() {
    // Use the deployed API endpoints
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.thepickleco.mx';
    // Use test keys for development, live keys for production
    this.stripePublishableKey = process.env.EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * Create a Stripe customer for the user if they don't have one
   */
  async createCustomer(userId: string, email: string): Promise<StripeCustomer> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/api/stripe/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create customer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Get or create a Setup Intent for adding a new payment method
   */
  async createSetupIntent(customerId: string): Promise<{ client_secret: string; setup_intent_id: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/api/stripe/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          customer_id: customerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create setup intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  /**
   * Add a new payment method using the working backend endpoint for setup intent
   * Then use Payment Sheet to collect card details
   */
  async addPaymentMethod(userId: string): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Create setup intent via backend (this should work since you said the endpoint exists)
      const setupResponse = await fetch(`${this.baseUrl}/api/stripe/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId
        }),
      });

      if (!setupResponse.ok) {
        const errorText = await setupResponse.text();
        console.error('Setup intent response:', setupResponse.status, errorText);
        
        // Try a simplified approach if backend has issues
        Alert.alert(
          'Payment Method Collection',
          'The payment system is being set up. For now, please contact support to add your payment method.',
          [{ text: 'OK' }]
        );
        return false;
      }

      const setupData = await setupResponse.json();
      console.log('Setup intent response data:', setupData);
      
      const clientSecret = setupData.client_secret || setupData.clientSecret;
      
      if (!clientSecret) {
        console.error('No client_secret found in response:', setupData);
        throw new Error('Backend did not provide a client secret for the setup intent');
      }

      // Using client secret for payment method collection

      // Initialize Payment Sheet with the setup intent from backend
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'The Pickle Co',
        setupIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: '',
          email: session.session.user.email || '',
        },
        style: 'alwaysLight',
        primaryButtonColor: '#2A62A2',
        returnURL: 'picklemobile://payment-success',
      });

      if (initError) {
        console.error('Payment Sheet init error:', initError);
        throw new Error(`Failed to initialize payment form: ${initError.message}`);
      }

      // Present the Payment Sheet with card input fields
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          return false; // User canceled
        }
        console.error('Payment Sheet present error:', presentError);
        throw new Error(`Failed to show payment form: ${presentError.message}`);
      }

      // After successful payment sheet completion, the payment method is automatically 
      // attached to the setup intent. We now need to link it to the customer via our backend.
      
      // Get the setup intent to find the payment method ID
      const setupIntentId = clientSecret.split('_secret_')[0];
      
      // The backend should handle linking the payment method to the customer
      // since the setup intent was created with the userId
      // Payment method successfully collected
      
      Alert.alert(
        'Success!',
        'Your payment method has been added successfully.',
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add payment method');
      return false;
    }
  }

  /**
   * Fetch user's payment methods from Stripe
   */
  async fetchPaymentMethods(userId: string): Promise<StripePaymentMethod[]> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      console.log('Fetching payment methods for userId:', userId);
      
      const response = await fetch(`${this.baseUrl}/api/stripe/payment-methods?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      console.log('Payment methods response status:', response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('Payment methods error response:', responseText);
        
        // Check if response is HTML (likely 404 page)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.log('Received HTML response - endpoint likely not available');
          // Return empty array instead of throwing error for better UX
          return [];
        }
        
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.message || `Failed to fetch payment methods (${response.status})`);
        } catch (parseError) {
          throw new Error(`Failed to fetch payment methods (${response.status}): ${responseText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      // Payment methods retrieved successfully
      return data.paymentMethods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      if (error instanceof TypeError && error.message.includes('JSON Parse error')) {
        throw new Error('Backend Stripe API routes not implemented yet. Please implement the backend endpoints first.');
      }
      throw error;
    }
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/api/stripe/payment-methods/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          payment_method_id: paymentMethodId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default payment method');
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/api/stripe/payment-methods?paymentMethodId=${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove payment method');
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Fetch user's payment history from Stripe
   */
  async fetchPaymentHistory(userId: string, limit: number = 50): Promise<StripePaymentRecord[]> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `${this.baseUrl}/api/stripe/payment-history?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to fetch payment history (${response.status})`);
      }

      const data = await response.json();
      return data.payments || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Create a payment intent for a purchase (matching PRD specification)
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'mxn',
    paymentMethodId: string,
    metadata: Record<string, any>
  ): Promise<{ clientSecret: string; paymentIntentId: string; amount: number; currency: string; status: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const requestBody = {
        amount,
        currency,
        paymentMethodId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        payment_method_types: ['card'],
        confirmation_method: 'manual',
        confirm: false,
        // Add return_url as fallback in case backend doesn't respect allow_redirects: never
        return_url: `${process.env.EXPO_PUBLIC_API_URL || 'https://www.thepickleco.mx'}/payment-success`
      };

      // Creating payment intent with card-only configuration
      console.log('Payment intent config:', JSON.stringify({
        amount,
        currency,
        automatic_payment_methods: requestBody.automatic_payment_methods,
        payment_method_types: requestBody.payment_method_types
      }, null, 2));

      const response = await fetch(`${this.baseUrl}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Payment intent response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment intent error response:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.message || `Failed to create payment intent (${response.status})`);
        } catch (parseError) {
          throw new Error(`Failed to create payment intent (${response.status}): ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      
      return {
        clientSecret: data.clientSecret || data.client_secret,
        paymentIntentId: data.paymentIntentId || data.payment_intent_id || data.id,
        amount: data.amount,
        currency: data.currency,
        status: data.status
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm a payment after Stripe processing (matching PRD specification)
   */
  async confirmPayment(
    paymentIntentId: string,
    metadata: Record<string, any>,
    returnUrl?: string
  ): Promise<{ success: boolean; payment: any }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const requestBody = {
        paymentIntentId,
        metadata,
        return_url: returnUrl,
      };
      
      // Confirming payment
      
      const response = await fetch(`${this.baseUrl}/api/stripe/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Confirm payment error response:', responseText);
        console.error('Response status:', response.status);
        console.error('Request body was:', JSON.stringify(requestBody));
        
        try {
          const error = JSON.parse(responseText);
          // If it's a Stripe return_url error, provide more helpful guidance
          if (error.details && error.details.includes('return_url')) {
            throw new Error('Payment configuration error: The backend needs to properly configure automatic_payment_methods with allow_redirects: never for card-only payments.');
          }
          throw new Error(error.error || error.message || `Failed to confirm payment (${response.status})`);
        } catch (parseError) {
          throw new Error(`Failed to confirm payment (${response.status}): ${responseText.substring(0, 200)}`);
        }
      }

      const result = await response.json();
      console.log('Payment confirmation successful:', result);
      return result;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Process an existing payment intent (for use with payment sheet)
   */
  async processExistingPaymentIntent(clientSecret: string): Promise<{ success: boolean; payment_intent_id?: string }> {
    try {
      // Present the Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          return { success: false };
        }
        throw new Error(presentError.message);
      }

      // Extract payment intent ID from client secret
      const paymentIntentId = clientSecret.split('_secret_')[0];
      return { success: true, payment_intent_id: paymentIntentId };
    } catch (error) {
      console.error('Error processing payment intent:', error);
      return { success: false };
    }
  }

  /**
   * Download invoice PDF (matching PRD specification)
   */
  async downloadInvoice(invoiceId: string): Promise<string> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/api/stripe/invoice/${invoiceId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download invoice');
      }

      const data = await response.json();
      return data.pdf_url;
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }

  /**
   * Process a payment using the Payment Sheet
   */
  async processPayment(
    userId: string,
    amount: number,
    description: string,
    currency: string = 'mxn'
  ): Promise<{ success: boolean; payment_intent_id?: string }> {
    try {
      // For now, just collect payment method using setup intent
      // This will show the Stripe payment sheet to collect card info
      const paymentMethodAdded = await this.addPaymentMethod(userId);
      
      if (!paymentMethodAdded) {
        return { success: false }; // User canceled
      }

      // For now, return success after payment method is added
      // TODO: Create actual payment intent once all backend endpoints are ready
      Alert.alert(
        'Payment Method Added',
        'Your payment method has been saved. For now, please contact support to complete your membership purchase.',
        [{ text: 'OK' }]
      );
      
      return { success: false }; // Don't complete yet until full payment flow is ready
    } catch (error) {
      console.error('Error processing payment:', error);
      return { success: false };
    }
  }
}

export const stripeService = new StripeService();