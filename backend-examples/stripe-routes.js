// Backend API routes for Stripe integration
// You'll need to implement these on your server

const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Enhanced middleware to verify authentication with security features
const authenticateUser = async (req, res, next) => {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No valid authorization token provided',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token.length < 10) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ 
        success: false,
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_USER'
      });
    }

    // Check if user is active/not banned
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, email, status')
      .eq('id', user.id)
      .single();

    if (userProfile?.status === 'banned' || userProfile?.status === 'inactive') {
      return res.status(403).json({ 
        success: false,
        error: 'Account access restricted',
        code: 'ACCOUNT_RESTRICTED'
      });
    }

    // Add user to request object for use in route handlers
    req.user = user;
    req.userProfile = userProfile;
    
    // Add timestamp for request tracking
    req.authTime = new Date().toISOString();
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authentication system error',
      code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

// Input validation middleware for common Stripe operations
const validateStripeInput = (req, res, next) => {
  const { body, params, query } = req;
  
  // Validate common IDs
  if (params.invoiceId && !params.invoiceId.match(/^in_[a-zA-Z0-9_]+$/)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid invoice ID format',
      code: 'INVALID_INVOICE_ID'
    });
  }
  
  if (body.paymentIntentId && !body.paymentIntentId.match(/^pi_[a-zA-Z0-9_]+$/)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid payment intent ID format',
      code: 'INVALID_PAYMENT_INTENT_ID'
    });
  }
  
  if (body.customer_id && !body.customer_id.match(/^cus_[a-zA-Z0-9_]+$/)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid customer ID format',
      code: 'INVALID_CUSTOMER_ID'
    });
  }

  // Validate UUID format for userId
  if (query.userId && !query.userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid user ID format',
      code: 'INVALID_USER_ID'
    });
  }

  next();
};

// Create or get Stripe customer
router.post('/customers', authenticateUser, async (req, res) => {
  try {
    const { userId, email } = req.body;

    // Check if customer already exists in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (existingUser?.stripe_customer_id) {
      // Return existing customer
      const customer = await stripe.customers.retrieve(existingUser.stripe_customer_id);
      return res.json(customer);
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        user_id: userId,
      },
    });

    // Update user record with Stripe customer ID
    await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    res.json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Setup Intent - POST /api/stripe/setup-intent  
router.post('/setup-intent', authenticateUser, async (req, res) => {
  try {
    const { customer_id, payment_method_types = ['card'], usage = 'off_session' } = req.body;

    let customerId = customer_id;

    // If no customer_id provided, get/create customer for authenticated user
    if (!customerId) {
      const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id, email')
        .eq('id', req.user.id)
        .single();

      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      customerId = user.stripe_customer_id;

      // Create customer if they don't have one
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: req.user.id,
          },
        });

        customerId = customer.id;

        // Update user record with Stripe customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', req.user.id);
      }
    } else {
      // Verify user authorization for provided customer_id
      const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', req.user.id)
        .single();
      
      if (user?.stripe_customer_id !== customer_id) {
        return res.status(403).json({ 
          success: false,
          error: 'Unauthorized - customer does not belong to authenticated user' 
        });
      }
    }

    // Create Setup Intent for future off-session payments
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types,
      usage,
      metadata: {
        user_id: req.user.id,
        created_via: 'mobile_app'
      }
    });

    res.json({
      success: true,
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
      customer_id: customerId,
      status: setupIntent.status,
      usage: setupIntent.usage,
      payment_method_types: setupIntent.payment_method_types
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request parameters',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to create setup intent',
      details: error.message 
    });
  }
});

// Get user's payment methods
router.get('/payment-methods', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.query;

    // Get user's Stripe customer ID
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return res.json({ paymentMethods: [] });
    }

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(user.stripe_customer_id);
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    // Fetch payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripe_customer_id,
      type: 'card',
    });

    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      },
      is_default: pm.id === defaultPaymentMethod,
    }));

    res.json({ paymentMethods: formattedMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set default payment method
router.post('/payment-methods/default', authenticateUser, async (req, res) => {
  try {
    const { user_id, payment_method_id } = req.body;

    // Get user's Stripe customer ID
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    if (!user?.stripe_customer_id) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Update customer's default payment method
    await stripe.customers.update(user.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove payment method
router.delete('/payment-methods', authenticateUser, async (req, res) => {
  try {
    const { paymentMethodId } = req.query;

    await stripe.paymentMethods.detach(paymentMethodId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing payment method:', error);
    res.status(500).json({ error: error.message });
  }
});

// 1. Payment History - GET /api/stripe/payment-history
router.get('/payment-history', authenticateUser, validateStripeInput, async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;

    // Verify user authorization - users can only access their own data
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized - can only access your own payment history' });
    }

    // Get user's Stripe customer ID
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return res.json({ 
        payments: [], 
        totalPayments: 0, 
        totalAmount: 0 
      });
    }

    // Fetch payment intents for the customer with expanded data
    const paymentIntents = await stripe.paymentIntents.list({
      customer: user.stripe_customer_id,
      limit: parseInt(limit),
      expand: ['data.charges.data.payment_method_details']
    });

    // Fetch invoices for the customer 
    const invoices = await stripe.invoices.list({
      customer: user.stripe_customer_id,
      limit: parseInt(limit),
      expand: ['data.payment_intent']
    });

    // Format payment data with complete information
    const formattedPayments = paymentIntents.data.map((pi) => {
      // Find associated invoice
      const associatedInvoice = invoices.data.find(inv => 
        inv.payment_intent === pi.id
      );

      // Get charge details for receipt URL and payment method
      const charge = pi.charges.data[0];
      
      return {
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status,
        description: pi.description || 'Payment',
        created: pi.created,
        receipt_url: charge?.receipt_url || null,
        metadata: pi.metadata || {},
        invoice: associatedInvoice ? {
          id: associatedInvoice.id,
          number: associatedInvoice.number,
          pdf: associatedInvoice.hosted_invoice_url,
          invoice_pdf: associatedInvoice.invoice_pdf,
        } : null,
        payment_method: charge?.payment_method_details?.card ? {
          card: {
            brand: charge.payment_method_details.card.brand,
            last4: charge.payment_method_details.card.last4,
          }
        } : null,
      };
    });

    // Calculate totals
    const totalAmount = formattedPayments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({ 
      success: true,
      payments: formattedPayments,
      totalPayments: formattedPayments.length,
      totalAmount,
      totalAmountFormatted: `${(totalAmount / 100).toFixed(2)} ${formattedPayments[0]?.currency?.toUpperCase() || 'MXN'}`
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch payment history',
      details: error.message 
    });
  }
});

// 3. Invoice PDF Download - GET /api/stripe/invoice/{invoiceId}/pdf
router.get('/invoice/:invoiceId/pdf', authenticateUser, validateStripeInput, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Input validation
    if (!invoiceId) {
      return res.status(400).json({ 
        success: false,
        error: 'Invoice ID is required' 
      });
    }

    // Retrieve the invoice from Stripe with customer data
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['customer']
    });

    // Verify user authorization - check if invoice belongs to authenticated user
    if (invoice.customer) {
      const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', req.user.id)
        .single();
      
      if (user?.stripe_customer_id !== invoice.customer.id) {
        return res.status(403).json({ 
          success: false,
          error: 'Unauthorized - invoice does not belong to authenticated user' 
        });
      }
    } else {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized - invalid invoice access' 
      });
    }

    // Check if invoice has a PDF available
    if (!invoice.hosted_invoice_url && !invoice.invoice_pdf) {
      return res.status(404).json({ 
        success: false,
        error: 'PDF not available for this invoice' 
      });
    }

    // For direct PDF download, we can redirect to Stripe's hosted URL
    // Or return the PDF URL for the client to handle
    if (req.query.download === 'true') {
      // Set proper headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.number || invoiceId}.pdf"`);
      
      // Redirect to Stripe's hosted PDF
      return res.redirect(invoice.hosted_invoice_url);
    }

    // Return invoice information with PDF URLs
    res.json({ 
      success: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        created: invoice.created,
        due_date: invoice.due_date,
        pdf_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        description: invoice.description,
        metadata: invoice.metadata
      }
    });
  } catch (error) {
    console.error('Error downloading invoice:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({ 
        success: false,
        error: 'Invoice not found',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to download invoice',
      details: error.message 
    });
  }
});

module.exports = router;

// Create Payment Intent - moved to separate route as per PRD
router.post('/create-payment-intent', authenticateUser, async (req, res) => {
  try {
    const { amount, currency = 'mxn', paymentMethodId, metadata } = req.body;

    // Get user's Stripe customer ID from metadata.userId
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', metadata.userId)
      .single();

    if (!user?.stripe_customer_id) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: user.stripe_customer_id,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      metadata,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Payment Confirmation - POST /api/stripe/confirm-payment
router.post('/confirm-payment', authenticateUser, validateStripeInput, async (req, res) => {
  try {
    const { paymentIntentId, metadata = {} } = req.body;

    // Input validation
    if (!paymentIntentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment intent ID is required' 
      });
    }

    // Retrieve the payment intent to verify ownership
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges.data.payment_method_details', 'customer']
    });

    // Verify user authorization - check if payment belongs to authenticated user
    if (paymentIntent.customer) {
      const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', req.user.id)
        .single();
      
      if (user?.stripe_customer_id !== paymentIntent.customer.id) {
        return res.status(403).json({ 
          success: false,
          error: 'Unauthorized - payment does not belong to authenticated user' 
        });
      }
    }

    // Verify payment intent status
    if (paymentIntent.status === 'succeeded') {
      // Handle membership activation based on payment type
      if (metadata.type === 'membership') {
        try {
          // Activate membership in your database
          const { data: membership, error: membershipError } = await supabase
            .from('memberships')
            .upsert({
              user_id: req.user.id,
              stripe_payment_intent_id: paymentIntent.id,
              membership_type: metadata.membershipType || 'standard',
              status: 'active',
              activated_at: new Date().toISOString(),
              expires_at: metadata.expiresAt || null,
              amount_paid: paymentIntent.amount,
              currency: paymentIntent.currency
            })
            .select()
            .single();

          if (membershipError) {
            console.error('Error activating membership:', membershipError);
          }
        } catch (dbError) {
          console.error('Database error during membership activation:', dbError);
        }
      }

      // Handle other payment types (court reservations, lessons, etc.)
      if (metadata.type === 'court_reservation') {
        try {
          await supabase
            .from('court_reservations')
            .update({ 
              payment_status: 'paid',
              stripe_payment_intent_id: paymentIntent.id 
            })
            .eq('id', metadata.reservationId);
        } catch (dbError) {
          console.error('Error updating court reservation:', dbError);
        }
      }

      if (metadata.type === 'lesson_booking') {
        try {
          await supabase
            .from('lesson_bookings')
            .update({ 
              payment_status: 'paid',
              stripe_payment_intent_id: paymentIntent.id 
            })
            .eq('id', metadata.lessonId);
        } catch (dbError) {
          console.error('Error updating lesson booking:', dbError);
        }
      }

      // Create invoice if specified in metadata
      let invoiceData = null;
      if (metadata.createInvoice) {
        try {
          await stripe.invoiceItems.create({
            customer: paymentIntent.customer,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            description: metadata.description || `Payment ${paymentIntent.id}`,
          });

          const invoice = await stripe.invoices.create({
            customer: paymentIntent.customer,
            payment_intent: paymentIntent.id,
            auto_advance: true,
            metadata: {
              payment_type: metadata.type || 'payment',
              user_id: req.user.id
            }
          });

          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
          
          invoiceData = {
            id: finalizedInvoice.id,
            number: finalizedInvoice.number,
            pdf_url: finalizedInvoice.hosted_invoice_url,
            invoice_pdf: finalizedInvoice.invoice_pdf
          };
        } catch (invoiceError) {
          console.error('Error creating invoice:', invoiceError);
        }
      }

      res.json({
        success: true,
        payment: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          description: paymentIntent.description,
          receipt_url: paymentIntent.charges?.data[0]?.receipt_url,
          created: paymentIntent.created,
          metadata: paymentIntent.metadata
        },
        invoice: invoiceData,
        services_activated: metadata.type ? [metadata.type] : []
      });
    } else {
      res.json({
        success: false,
        error: 'Payment not yet completed',
        payment_status: paymentIntent.status,
        requires_action: paymentIntent.status === 'requires_action'
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to confirm payment',
      details: error.message 
    });
  }
});

module.exports = router;

/* 
===============================================================================
🏓 THE PICKLE CO - STRIPE API ENDPOINTS IMPLEMENTATION
===============================================================================

✅ IMPLEMENTED ENDPOINTS:

1. 📊 Payment History - GET /api/stripe/payment-history?userId={userId}
   - Retrieves complete payment history from Stripe
   - Includes receipt URLs and invoice PDF links  
   - Calculates total payments and amounts
   - User authorization verified

2. ✅ Payment Confirmation - POST /api/stripe/confirm-payment
   - Confirms successful payments and activates services
   - Handles membership, court reservation, and lesson activations
   - Supports invoice creation
   - Secure token-based authentication

3. 📄 Invoice PDF Download - GET /api/stripe/invoice/{invoiceId}/pdf
   - Secure PDF download with user authorization
   - Proper content headers for file download
   - Direct download option with ?download=true

4. 🔧 Setup Intent - POST /api/stripe/setup-intent
   - Creates setup intents for adding payment methods
   - Handles customer creation automatically
   - Supports future off-session payments

🔐 SECURITY FEATURES:
- Bearer Token Authentication with enhanced validation
- User Authorization (users can only access their own data)
- Input validation for all Stripe IDs and UUIDs
- Account status verification (banned/inactive check)
- Comprehensive error handling with error codes
- SQL injection protection via Supabase RLS

🚀 USAGE IN YOUR SERVER:

// Express.js setup
const stripeRoutes = require('./stripe-routes');

// Mount the routes
app.use('/api/stripe', stripeRoutes);

// Alternative mounting for backward compatibility
app.use('/api', stripeRoutes);

📋 REQUIRED ENVIRONMENT VARIABLES:
- STRIPE_SECRET_KEY: Your Stripe secret key
- SUPABASE_URL: Your Supabase project URL  
- SUPABASE_SERVICE_KEY: Your Supabase service role key

🗄️ REQUIRED DATABASE TABLES:
- users: id, email, stripe_customer_id, status
- memberships: user_id, stripe_payment_intent_id, membership_type, status
- court_reservations: id, payment_status, stripe_payment_intent_id
- lesson_bookings: id, payment_status, stripe_payment_intent_id

💡 MOBILE APP INTEGRATION:
The endpoints are designed to work seamlessly with the existing
stripeService.ts in your mobile app. All endpoints return consistent
JSON responses with success/error status.

🔗 AUTHENTICATION FLOW:
1. User logs in via Supabase Auth
2. Mobile app gets access token
3. Include token in Authorization header: "Bearer {token}"
4. Server validates token and user permissions
5. Endpoints return user-specific data only

===============================================================================
*/