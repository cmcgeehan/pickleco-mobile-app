// Backend API routes for User Profile Management
// Based on Web Team's implementation patterns

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key has admin privileges
);

// Middleware to verify authentication
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// GET /api/users/profile - Get user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    
    // Verify user can only access their own profile
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        gender,
        instagram_handle,
        role,
        created_at,
        updated_at,
        email_notifications,
        sms_notifications,
        whatsapp_notifications,
        email_verified,
        has_signed_waiver
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    // Fetch active membership
    const { data: activeMembership } = await supabase
      .from('memberships')
      .select(`
        id,
        membership_types (
          id,
          name,
          description,
          cost_mxn
        ),
        locations (
          id,
          name,
          address
        ),
        status,
        start_date,
        end_date
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // Fetch membership history
    const { data: membershipHistory } = await supabase
      .from('memberships')
      .select(`
        id,
        membership_types (
          id,
          name,
          description,
          cost_mxn
        ),
        locations (
          id,
          name,
          address
        ),
        status,
        start_date,
        end_date
      `)
      .eq('user_id', userId)
      .neq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(10);

    res.json({
      profile: {
        ...profile,
        active_membership: activeMembership,
        membership_history: membershipHistory || []
      }
    });
  } catch (error) {
    console.error('Error in GET /profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/profile - Update user profile
router.patch('/profile', authenticateUser, async (req, res) => {
  try {
    const { userId, updates } = req.body;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify user can only update their own profile
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Prepare update data (only include allowed fields)
    const allowedFields = [
      'first_name',
      'last_name',
      'phone',
      'gender',
      'instagram_handle',
      'email_notifications',
      'sms_notifications',
      'whatsapp_notifications'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update user profile using service key (bypasses RLS)
    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        first_name,
        last_name,
        phone,
        gender,
        instagram_handle,
        email_notifications,
        sms_notifications,
        whatsapp_notifications,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ 
        error: `Failed to update user profile: ${error.message}` 
      });
    }

    res.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error in PATCH /profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/profile - Update user preferences (notification settings)
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    
    if (!userId || !preferences) {
      return res.status(400).json({ error: 'User ID and preferences are required' });
    }

    // Verify user can only update their own preferences
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update notification preferences
    const updateData = {
      email_notifications: preferences.email_notifications,
      sms_notifications: preferences.sms_notifications,
      whatsapp_notifications: preferences.whatsapp_notifications,
      updated_at: new Date().toISOString()
    };

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        email_notifications,
        sms_notifications,
        whatsapp_notifications,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return res.status(500).json({ 
        error: `Failed to update preferences: ${error.message}` 
      });
    }

    res.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error in PUT /profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

/* 
===============================================================================
🏓 THE PICKLE CO - USER PROFILE API ENDPOINTS
===============================================================================

✅ IMPLEMENTED ENDPOINTS:

1. 📊 Get Profile - GET /api/users/profile?userId={userId}
   - Retrieves complete user profile
   - Includes active membership and history
   - User authorization verified

2. ✅ Update Profile - PATCH /api/users/profile
   - Updates user profile information
   - Only allowed fields can be updated
   - Secure token-based authentication

3. 🔔 Update Preferences - PUT /api/users/profile
   - Updates notification preferences
   - Email, SMS, WhatsApp settings
   - User authorization verified

🔐 SECURITY:
- Bearer Token Authentication required
- Users can only access/update their own profile
- Service key used for database operations (bypasses RLS)
- Input validation on all fields

🚀 USAGE IN YOUR SERVER:

// Express.js setup
const userRoutes = require('./user-profile-routes');

// Mount the routes
app.use('/api/users', userRoutes);

📋 REQUIRED ENVIRONMENT VARIABLES:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_KEY: Your Supabase service role key

===============================================================================
*/