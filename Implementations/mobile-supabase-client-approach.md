# Mobile App Supabase Client Approach

## Overview

This document outlines the recommended approach for the mobile app to use the Supabase client directly instead of making HTTP requests to API endpoints. This approach will simplify development, improve performance, and reduce the number of API endpoints needed.

## Why Use Supabase Client Directly?

### Benefits

1. **Real-time subscriptions** - Listen for live updates to data
2. **Better performance** - Direct database queries are faster than HTTP requests
3. **Simpler code** - No need to create API endpoints for every database operation
4. **Automatic caching** - Supabase client handles caching automatically
5. **Type safety** - Full TypeScript support with generated types
6. **Consistent with web app** - Same patterns used in web application
7. **Reduced server load** - Fewer HTTP requests to handle

### Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Supabase Client** | Real-time, faster, simpler, type-safe | Requires client-side auth handling |
| **API Endpoints** | Centralized logic, server-side validation | More complex, slower, more endpoints to maintain |

## Setup Instructions

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

### 2. Configure Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 3. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Implementation Examples

### Fetching Courts

**Instead of HTTP request:**
```typescript
// ❌ Don't do this
const response = await fetch('/api/courts?locationId=123')
const { courts } = await response.json()
```

**Use Supabase client:**
```typescript
// ✅ Do this
const { data: courts, error } = await supabase
  .from('courts')
  .select('*')
  .eq('location_id', locationId)
  .is('deleted_at', null)
  .order('name')

if (error) {
  console.error('Error fetching courts:', error)
  return
}

setCourts(courts || [])
```

### Fetching Events

```typescript
// Fetch events with related data
const { data: events, error } = await supabase
  .from('events')
  .select(`
    *,
    event_types (
      id,
      name,
      cost_mxn
    ),
    event_courts (
      court:courts (
        id,
        name
      )
    ),
    event_registrations (
      id,
      user_id,
      users (
        first_name,
        last_name
      )
    )
  `)
  .eq('location_id', locationId)
  .gte('start_time', new Date().toISOString())
  .is('deleted_at', null)
  .order('start_time')
```

### User Authentication

```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Sign out
await supabase.auth.signOut()
```

### Real-time Subscriptions

```typescript
// Listen for real-time updates
const subscription = supabase
  .channel('events')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'events' },
    (payload) => {
      console.log('Event changed:', payload)
      // Update UI
    }
  )
  .subscribe()
```

## When to Use API Endpoints vs Supabase Client

### Use Supabase Client For:
- ✅ Simple CRUD operations (courts, events, users, etc.)
- ✅ Real-time data subscriptions
- ✅ User authentication
- ✅ File uploads/downloads
- ✅ Basic queries and filtering

### Use API Endpoints For:
- ✅ Complex business logic
- ✅ Payment processing (Stripe integration)
- ✅ External service integrations
- ✅ Server-side validation
- ✅ Operations requiring admin privileges
- ✅ Data processing/aggregation

## Specific Feature Implementations

### 1. Court Reservation Wizard

```typescript
// Fetch courts for location
const { data: courts, error } = await supabase
  .from('courts')
  .select('*')
  .eq('location_id', locationId)
  .is('deleted_at', null)

// Check availability
const { data: events } = await supabase
  .from('events')
  .select('*, event_courts(*)')
  .eq('location_id', locationId)
  .gte('start_time', selectedDate.toISOString())
  .lte('start_time', endDate.toISOString())
  .is('deleted_at', null)

// Create reservation (still use API for complex logic)
const response = await fetch('/api/reservations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reservationData)
})
```

### 2. Lesson Booking Wizard

```typescript
// Fetch coaches
const { data: coaches, error } = await supabase
  .from('users')
  .select(`
    id,
    first_name,
    last_name,
    coaching_rate,
    bio,
    specialties
  `)
  .eq('is_coach', true)
  .is('deleted_at', null)

// Check coach availability
const { data: availability } = await supabase
  .from('coach_availability')
  .select('*')
  .eq('coach_id', coachId)
  .gte('start_time', startTime)
  .lte('end_time', endTime)
  .is('deleted_at', null)

// Book lesson (use API for complex booking logic)
const response = await fetch('/api/lessons/book', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(lessonData)
})
```

### 3. Waiver Management

```typescript
// Check waiver status
const { data: user } = await supabase
  .from('users')
  .select('has_signed_waiver')
  .eq('id', userId)
  .single()

// Update waiver status
const { error } = await supabase
  .from('users')
  .update({ has_signed_waiver: true })
  .eq('id', userId)
```

## Authentication Patterns

### Session Management

```typescript
// Get current session
const { data: { session } } = await supabase.auth.getSession()

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Handle sign in
  } else if (event === 'SIGNED_OUT') {
    // Handle sign out
  }
})
```

### Protected Queries

```typescript
// Queries automatically use the user's session
const { data: userRegistrations } = await supabase
  .from('event_registrations')
  .select('*')
  .eq('user_id', session?.user?.id)
  .is('deleted_at', null)
```

## Error Handling

```typescript
const { data, error } = await supabase
  .from('courts')
  .select('*')

if (error) {
  if (error.code === 'PGRST116') {
    // No rows returned
    setCourts([])
  } else if (error.code === '42501') {
    // Permission denied
    console.error('Permission denied')
  } else {
    // Other error
    console.error('Database error:', error)
  }
  return
}

setCourts(data || [])
```

## Performance Optimization

### 1. Use Specific Column Selection

```typescript
// ✅ Good - only fetch needed columns
const { data } = await supabase
  .from('events')
  .select('id, name, start_time, end_time')

// ❌ Avoid - fetching all columns
const { data } = await supabase
  .from('events')
  .select('*')
```

### 2. Use Pagination

```typescript
// Paginate results
const { data, error } = await supabase
  .from('events')
  .select('*')
  .range(0, 9) // First 10 items
  .order('start_time')
```

### 3. Use Filters

```typescript
// Filter at database level
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('location_id', locationId)
  .gte('start_time', new Date().toISOString())
```

## Migration Strategy

### Phase 1: Setup Supabase Client
1. Install and configure Supabase client
2. Set up authentication
3. Test basic queries

### Phase 2: Replace Simple API Calls
1. Replace court fetching with direct queries
2. Replace event fetching with direct queries
3. Replace user profile queries

### Phase 3: Keep Complex API Endpoints
1. Keep payment processing endpoints
2. Keep complex business logic endpoints
3. Keep admin-only endpoints

## Testing

### Unit Tests

```typescript
// Mock Supabase client for testing
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockData }))
        }))
      }))
    }))
  }))
}))
```

### Integration Tests

```typescript
// Test with real Supabase instance
const { data, error } = await supabase
  .from('courts')
  .select('*')
  .limit(1)

expect(error).toBeNull()
expect(data).toBeDefined()
```

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS policies enabled
- Users can only access their own data
- Public data (courts, events) is accessible to all authenticated users

### Authentication
- Always check user session before sensitive operations
- Use `supabase.auth.getUser()` to verify authentication
- Handle auth state changes properly

### Data Validation
- Validate data on client side before sending to database
- Use TypeScript types for type safety
- Implement proper error handling

## Conclusion

Using the Supabase client directly in the mobile app will:

1. **Simplify development** - Fewer API endpoints to create and maintain
2. **Improve performance** - Direct database queries are faster
3. **Enable real-time features** - Live updates and subscriptions
4. **Reduce server load** - Fewer HTTP requests to handle
5. **Maintain consistency** - Same patterns as web application

The mobile app should use Supabase client for simple CRUD operations and keep API endpoints only for complex business logic, payment processing, and external integrations.

## Next Steps

1. Set up Supabase client in mobile app
2. Implement authentication flow
3. Replace simple API calls with direct queries
4. Test real-time subscriptions
5. Update mobile PRDs to reflect this approach
