# Mobile Account Management PRD

## Overview
This document provides the mobile team with comprehensive information about how the account page updates user information, including all API endpoints, data structures, validation rules, and implementation patterns.

## Table of Contents
1. [User Profile Data Structure](#user-profile-data-structure)
2. [API Endpoints](#api-endpoints)
3. [Authentication Requirements](#authentication-requirements)
4. [Form Validation](#form-validation)
5. [Update Operations](#update-operations)
6. [Phone Number Handling](#phone-number-handling)
7. [Notification Settings](#notification-settings)
8. [Error Handling](#error-handling)
9. [Mobile Implementation Guide](#mobile-implementation-guide)

## User Profile Data Structure

### Core User Fields
```typescript
interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  gender: string
  instagram_handle: string
  role: 'admin' | 'coach' | 'member' | 'guest'
  created_at: string
  updated_at: string
  email_notifications: boolean
  sms_notifications: boolean
  whatsapp_notifications: boolean
}
```

### Database Schema (users table)
```sql
-- Key fields that can be updated
first_name: text
last_name: text
phone: text
gender: text
instagram_handle: text
email_notifications: boolean
sms_notifications: boolean
whatsapp_notifications: boolean
updated_at: timestamp
```

## API Endpoints

### 1. Get User Profile
**Endpoint:** `GET /api/users/profile?userId={userId}`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Response:**
```json
{
  "profile": {
    "id": "user-uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "gender": "male",
    "role": "member",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "email_notifications": true,
    "sms_notifications": false,
    "whatsapp_notifications": true,
    "email_verified": true,
    "active_membership": {
      "id": "membership-uuid",
      "membership_types": { "name": "Premium" },
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-12-31T23:59:59Z",
      "locations": { "id": "location-uuid", "name": "Downtown" },
      "status": "active"
    },
    "membership_history": [...]
  }
}
```

### 2. Update User Profile
**Endpoint:** `PATCH /api/users/profile`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user-uuid",
  "updates": {
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "gender": "male",
    "instagram_handle": "johndoe",
    "email_notifications": true,
    "sms_notifications": false,
    "whatsapp_notifications": true
  }
}
```

**Response:**
```json
{
  "profile": {
    "id": "user-uuid",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "gender": "male",
    "instagram_handle": "johndoe",
    "email_notifications": true,
    "sms_notifications": false,
    "whatsapp_notifications": true,
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

### 3. Update User Preferences
**Endpoint:** `PUT /api/users/profile`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user-uuid",
  "preferences": {
    "email_notifications": true,
    "sms_notifications": false,
    "whatsapp_notifications": true
  }
}
```

## Authentication Requirements

### Bearer Token Authentication
- All API calls require a valid Bearer token in the Authorization header
- Token is obtained from Supabase auth session
- Token must match the user ID being updated

### Session Validation
```typescript
// Get session token
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Use in API calls
const response = await fetch('/api/users/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId, updates })
})
```

## Form Validation

### Validation Schema (Zod)
```typescript
const accountSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  gender: z.string().optional(),
  instagramHandle: z.string().optional(),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    whatsapp: z.boolean(),
  }),
})
```

### Field Requirements
- **First Name:** Required, minimum 1 character
- **Last Name:** Required, minimum 1 character
- **Email:** Required, must be valid email format
- **Gender:** Optional
- **Instagram Handle:** Optional
- **Phone:** Optional, but should include country code
- **Notifications:** All boolean values

## Update Operations

### 1. Profile Information Update
```typescript
const updateProfile = async (updates: Partial<UserProfile>) => {
  const response = await fetch('/api/users/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: user.id,
      updates: {
        first_name: updates.first_name,
        last_name: updates.last_name,
        phone: updates.phone,
        gender: updates.gender,
        instagram_handle: updates.instagram_handle,
        updated_at: new Date().toISOString(),
      }
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to update profile')
  }
  
  return response.json()
}
```

### 2. Notification Settings Update
```typescript
const updateNotifications = async (notifications: NotificationSettings) => {
  const response = await fetch('/api/users/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: user.id,
      updates: {
        email_notifications: notifications.email,
        sms_notifications: notifications.sms,
        whatsapp_notifications: notifications.whatsapp,
        updated_at: new Date().toISOString(),
      }
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to update notifications')
  }
  
  return response.json()
}
```

## Phone Number Handling

### Phone Input Component
The web app uses a sophisticated phone input component with:
- Country code selection
- Format validation
- International number support

### Phone Number Format
- Store with country code (e.g., "+1234567890")
- Support multiple country formats
- Validate based on selected country

### Country Codes Supported
```typescript
const COUNTRY_CODES = [
  { id: 'us', code: '+1', country: 'United States', flag: '🇺🇸', format: '(XXX) XXX-XXXX' },
  { id: 'ca', code: '+1', country: 'Canada', flag: '🇨🇦', format: '(XXX) XXX-XXXX' },
  { id: 'mx', code: '+52', country: 'Mexico', flag: '🇲🇽', format: 'XX XXXX XXXX' },
  { id: 'gb', code: '+44', country: 'United Kingdom', flag: '🇬🇧', format: 'XXXX XXXXXX' },
  // ... more countries
]
```

## Notification Settings

### Notification Types
1. **Email Notifications:** General account updates, event reminders
2. **SMS Notifications:** Event reminders, court reservations
3. **WhatsApp Notifications:** Event updates, social features

### Update Pattern
```typescript
const handleNotificationChange = async (type: 'email' | 'sms' | 'whatsapp') => {
  const newNotifications = { ...notifications, [type]: !notifications[type] }
  
  try {
    await updateNotifications(newNotifications)
    setNotifications(newNotifications)
    // Show success toast
  } catch (error) {
    // Revert changes and show error
    setNotifications(notifications)
  }
}
```

## Error Handling

### Common Error Responses
```typescript
// 400 - Bad Request
{ "error": "User ID is required" }

// 401 - Unauthorized
{ "error": "No authorization header" }
{ "error": "Invalid session" }
{ "error": "Unauthorized" }

// 500 - Internal Server Error
{ "error": "Failed to update user profile: [details]" }
```

### Error Handling Pattern
```typescript
try {
  const response = await fetch('/api/users/profile', options)
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to update profile')
  }
  
  const result = await response.json()
  return result
  
} catch (error) {
  console.error('Profile update error:', error)
  // Show user-friendly error message
  // Revert form changes if needed
}
```

## Mobile Implementation Guide

### 1. Form State Management
```typescript
const [profile, setProfile] = useState<UserProfile>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: '',
  instagramHandle: '',
  email_notifications: false,
  sms_notifications: false,
  whatsapp_notifications: false
})
```

### 2. Form Submission
```typescript
const onSubmit = async (data: AccountFormData) => {
  try {
    setSaving(true)
    
    const updates = {
      first_name: data.firstName,
      last_name: data.lastName,
      phone: profile.phone,
      gender: data.gender,
      instagram_handle: data.instagramHandle,
      email_notifications: data.notifications.email,
      sms_notifications: data.notifications.sms,
      whatsapp_notifications: data.notifications.whatsapp,
      updated_at: new Date().toISOString(),
    }
    
    const result = await updateProfile(updates)
    
    // Update local state
    setProfile(prev => ({ ...prev, ...result.profile }))
    
    // Show success message
    
  } catch (error) {
    // Handle error
  } finally {
    setSaving(false)
  }
}
```

### 3. Real-time Updates
```typescript
// Update local state immediately for better UX
const handleFieldChange = (field: keyof UserProfile, value: any) => {
  setProfile(prev => ({ ...prev, [field]: value }))
}

// Update notifications optimistically
const handleNotificationToggle = async (type: keyof NotificationSettings) => {
  const newValue = !notifications[type]
  
  // Update UI immediately
  setNotifications(prev => ({ ...prev, [type]: newValue }))
  
  try {
    await updateNotifications({ ...notifications, [type]: newValue })
  } catch (error) {
    // Revert on error
    setNotifications(prev => ({ ...prev, [type]: !newValue }))
  }
}
```

### 4. Phone Number Input
```typescript
// Use a phone input library like react-phone-number-input
import PhoneInput from 'react-phone-number-input'

<PhoneInput
  value={profile.phone}
  onChange={(phone) => handleFieldChange('phone', phone)}
  placeholder="Enter phone number"
  defaultCountry="US"
  international
  withCountryCallingCode
/>
```

### 5. Loading States
```typescript
const [saving, setSaving] = useState(false)

// Show loading indicator during updates
{saving && <ActivityIndicator size="small" />}

// Disable form during updates
<Button disabled={saving} onPress={onSubmit}>
  {saving ? 'Saving...' : 'Save Changes'}
</Button>
```

## Testing Considerations

### 1. Validation Testing
- Test required field validation
- Test email format validation
- Test phone number format validation

### 2. API Testing
- Test with valid authentication
- Test with invalid authentication
- Test with missing required fields
- Test with invalid data types

### 3. Error Handling Testing
- Test network failures
- Test server errors
- Test validation errors
- Test authentication errors

### 4. Edge Cases
- Test very long input values
- Test special characters in names
- Test international phone numbers
- Test notification toggle race conditions

## Security Considerations

### 1. Authentication
- Always validate user session before updates
- Ensure user can only update their own profile
- Use secure token transmission

### 2. Input Validation
- Validate all input on both client and server
- Sanitize user input to prevent injection attacks
- Limit input lengths to reasonable bounds

### 3. Data Privacy
- Only update fields that are explicitly allowed
- Log all profile changes for audit purposes
- Ensure sensitive data is properly encrypted

## Performance Considerations

### 1. Optimistic Updates
- Update UI immediately for better perceived performance
- Revert changes if API call fails
- Batch multiple updates when possible

### 2. Caching
- Cache user profile data locally
- Only fetch from server when needed
- Implement proper cache invalidation

### 3. Network Optimization
- Use appropriate HTTP methods (PATCH for partial updates)
- Minimize payload size
- Implement retry logic for failed requests

## Conclusion

This PRD provides the mobile team with all the necessary information to implement account management functionality that matches the web app's behavior. The key points are:

1. **Use the `/api/users/profile` endpoint** for all profile operations
2. **Implement proper authentication** with Bearer tokens
3. **Follow the validation schema** for form inputs
4. **Handle phone numbers** with country code support
5. **Implement optimistic updates** for better UX
6. **Provide proper error handling** and user feedback
7. **Support all notification types** (email, SMS, WhatsApp)

The mobile implementation should provide the same user experience as the web app while following mobile-specific design patterns and best practices.
