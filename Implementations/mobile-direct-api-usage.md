# Mobile Team: Direct API Usage Guide

## 🚨 **IMPORTANT: DO NOT USE WEB APP API ENDPOINTS**

**The web app's API endpoints (`/api/users/profile`, `/api/stripe/*`, etc.) are NOT accessible from mobile apps due to authentication restrictions. You must use Supabase and Stripe APIs directly.**

## 📱 **Mobile App Architecture: Use Direct APIs**

### **Why This Approach:**
- ✅ **Works immediately** - No need to wait for web team to fix anything
- ✅ **Better performance** - Direct database access instead of HTTP overhead
- ✅ **Real-time updates** - Supabase provides real-time subscriptions
- ✅ **Consistent with web app** - Web app also uses Supabase directly for most operations

## 🔐 **1. Supabase Client Setup**

### **Install Dependencies:**
```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

### **Initialize Supabase Client:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **Get Supabase Credentials:**
Ask the web team for these values from your `.env` file:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 👤 **2. User Profile Management (Direct Supabase)**

### **Get User Profile:**
```typescript
const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
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
      whatsapp_notifications
    `)
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}
```

### **Update User Profile:**
```typescript
const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Usage example:
await updateUserProfile(userId, {
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  gender: 'male',
  instagram_handle: 'johndoe'
})
```

### **Update Notification Settings:**
```typescript
const updateNotifications = async (userId: string, notifications: NotificationSettings) => {
  const { data, error } = await supabase
    .from('users')
    .update({
      email_notifications: notifications.email,
      sms_notifications: notifications.sms,
      whatsapp_notifications: notifications.whatsapp,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
```

## 💳 **3. Stripe Integration (Direct Stripe API)**

### **Install Stripe SDK:**
```bash
npm install @stripe/stripe-js
# or
yarn add @stripe/stripe-js
```

### **Initialize Stripe:**
```typescript
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe('YOUR_STRIPE_PUBLISHABLE_KEY')
```

### **Get Stripe Credentials:**
Ask the web team for:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 🏦 **4. Payment Methods (Direct Stripe)**

### **Create Setup Intent:**
```typescript
const createSetupIntent = async () => {
  // This requires a backend endpoint - ask web team to create one
  const response = await fetch('/api/stripe/setup-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ userId })
  })
  
  const { clientSecret } = await response.json()
  return clientSecret
}
```

### **Add Payment Method:**
```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const addPaymentMethod = async () => {
  const stripe = await stripePromise
  const elements = useElements()
  
  const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
    payment_method: {
      card: elements.getElement(CardElement),
      billing_details: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    }
  })

  if (error) throw error
  return setupIntent.payment_method
}
```

### **List Payment Methods:**
```typescript
const listPaymentMethods = async (customerId: string) => {
  // This requires a backend endpoint - ask web team to create one
  const response = await fetch(`/api/stripe/payment-methods?customerId=${customerId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  const { paymentMethods } = await response.json()
  return paymentMethods
}
```

## 📊 **5. Payment History (Direct Stripe)**

### **Get Payment History:**
```typescript
const getPaymentHistory = async (customerId: string) => {
  // This requires a backend endpoint - ask web team to create one
  const response = await fetch(`/api/stripe/payment-history?customerId=${customerId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  const { payments } = await response.json()
  return payments
}
```

## 🔑 **6. Authentication & Session Management**

### **Get Current User:**
```typescript
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) throw error
  return user
}
```

### **Get Session:**
```typescript
const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) throw error
  return session
}
```

### **Sign Out:**
```typescript
const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  
  if (error) throw error
}
```

## 🎯 **7. Complete Implementation Example**

### **Profile Management Screen:**
```typescript
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const profileData = await getUserProfile(user.id)
      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async (updates) => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updatedProfile = await updateUserProfile(user.id, updates)
      setProfile(updatedProfile)
      
      // Show success message
    } catch (error) {
      console.error('Error saving profile:', error)
      // Show error message
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  
  return (
    <View>
      <TextInput
        value={profile?.first_name || ''}
        onChangeText={(text) => setProfile(prev => ({ ...prev, first_name: text }))}
        placeholder="First Name"
      />
      <TextInput
        value={profile?.last_name || ''}
        onChangeText={(text) => setProfile(prev => ({ ...prev, last_name: text }))}
        placeholder="Last Name"
      />
      <TextInput
        value={profile?.phone || ''}
        onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
        placeholder="Phone"
        keyboardType="phone-pad"
      />
      
      <Button
        title={saving ? 'Saving...' : 'Save Changes'}
        onPress={() => saveProfile(profile)}
        disabled={saving}
      />
    </View>
  )
}
```

## 🚫 **8. What NOT to Do**

### **❌ Don't Use These Web App Endpoints:**
- `GET /api/users/profile` - Use Supabase directly
- `PATCH /api/users/profile` - Use Supabase directly
- `GET /api/stripe/payment-methods` - Use Stripe directly
- `GET /api/stripe/payment-history` - Use Stripe directly

### **❌ Don't Try to Bypass Authentication:**
- Don't use hardcoded tokens
- Don't skip session validation
- Don't assume you can access web app APIs

## ✅ **9. What TO Do**

### **✅ Use These Direct APIs:**
- **Supabase client** for all database operations
- **Stripe SDK** for payment operations
- **Supabase Auth** for authentication
- **Real-time subscriptions** for live updates

### **✅ Follow This Pattern:**
1. Initialize Supabase client
2. Authenticate user with Supabase
3. Use Supabase client for database operations
4. Use Stripe SDK for payment operations
5. Handle errors gracefully

## 🔧 **10. Required Backend Endpoints**

**Ask the web team to create these minimal endpoints for Stripe operations that can't be done client-side:**

1. **`POST /api/stripe/setup-intent`** - Create setup intent for adding payment methods
2. **`GET /api/stripe/payment-methods`** - List user's payment methods
3. **`GET /api/stripe/payment-history`** - Get user's payment history

**These are the ONLY endpoints you need from the web team. Everything else should use Supabase directly.**

## 📱 **11. Mobile-Specific Considerations**

### **React Native Setup:**
```typescript
// For React Native, you might need additional setup
import { Platform } from 'react-native'

const supabaseUrl = Platform.select({
  ios: 'YOUR_SUPABASE_URL',
  android: 'YOUR_SUPABASE_URL',
  default: 'YOUR_SUPABASE_URL'
})
```

### **Offline Support:**
```typescript
// Supabase provides offline support out of the box
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
  .abortSignal(AbortSignal.timeout(5000)) // 5 second timeout
```

## 🎯 **Summary**

**The mobile app should:**
1. **Use Supabase client directly** for all database operations
2. **Use Stripe SDK directly** for payment operations  
3. **NOT try to access web app API endpoints**
4. **Ask web team for only 3 minimal Stripe endpoints**
5. **Implement proper authentication with Supabase**

**This approach will work immediately and provide better performance than trying to use the web app's API endpoints.**
