# Supabase Integration

This document covers our Supabase setup, including database access patterns, authentication, and the critical distinction between admin and user clients.

## Overview

We use Supabase for:
- **PostgreSQL Database** - Primary data store
- **Authentication** - User signup/login via email, Google OAuth
- **Storage** - Image uploads (profile pictures, event images)
- **Row Level Security** - Access control at the database level

## Environments

| Environment | Supabase Project | URL |
|-------------|------------------|-----|
| Staging | pickleco-staging | `staging.thepickleco.mx` |
| Production | thepickleco | `www.thepickleco.mx` |

Each environment has its own Supabase project with separate databases. Migrations must be run on both.

---

## Client Types

**This is critical to understand.** We have different Supabase client types for different use cases.

### 1. User Client (Anon Key)

**Uses:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Subject to RLS:** Yes - queries are filtered based on the authenticated user

**When to use:**
- Client-side operations
- User reading/writing their own data
- Public data reads (events, courts, locations)

**Files:**
- `lib/supabase.ts` - Browser client
- `lib/supabase-server.ts:getServerClient()` - Server-side with cookie auth

```typescript
// Browser client
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side with cookies
import { getServerClient } from '@/lib/supabase-server'
const supabase = await getServerClient()
```

### 2. Admin Client (Service Role Key)

**Uses:** `SUPABASE_SERVICE_ROLE_KEY`

**Subject to RLS:** No - bypasses all RLS policies

**When to use:**
- Writing data that other users need to read (e.g., registrations with participant names)
- Reading data across multiple users
- Background jobs / cron tasks
- Admin panel operations
- Any operation that needs to access data outside the current user's scope

**Files:**
- `lib/supabase-server.ts:createAdminClient()` - SSR admin client with cookies
- `lib/supabase-server.ts:createSimpleAdminClient()` - Plain admin client without cookies

```typescript
// SSR admin client (for server components, needs cookies context)
import { createAdminClient } from '@/lib/supabase-server'
const supabaseAdmin = await createAdminClient()

// Simple admin client (for API routes where you've already authed via JWT)
import { createSimpleAdminClient } from '@/lib/supabase-server'
const adminClient = createSimpleAdminClient()

// Inline creation (common in API routes)
import { createClient } from '@supabase/supabase-js'
const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Common Patterns

### API Route with JWT Auth + Admin Operations

This is the pattern used in `/api/play/book/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  // 1. Extract JWT from Authorization header
  const authHeader = request.headers.get('authorization');
  let jwt: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwt = authHeader.replace('Bearer ', '');
  }

  // 2. Create user client to verify the user
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: jwt ? `Bearer ${jwt}` : ''
        }
      }
    }
  );

  // 3. Verify user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // 4. Create admin client for operations that need to bypass RLS
  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 5. Use admin client to read user data (needed for participant fields)
  const { data: userData } = await adminClient
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  // 6. Use admin client to insert registration (with denormalized fields)
  await adminClient
    .from('event_registrations')
    .insert({
      event_id: eventId,
      user_id: user.id,
      participant_first_name: userData?.first_name || 'Unknown',
      participant_last_initial: userData?.last_name?.charAt(0) || '?',
    });
}
```

### Server Component with User Context

```typescript
import { getServerClient } from '@/lib/supabase-server'

export default async function Page() {
  const supabase = await getServerClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Read user's own data (RLS allows this)
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Read public data (RLS allows this)
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .is('deleted_at', null)
}
```

### Background Job / Cron

```typescript
import { createSimpleAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Use admin client for all operations
  const supabase = createSimpleAdminClient()

  // Can read all users, all events, etc.
  const { data: users } = await supabase
    .from('users')
    .select('*')
}
```

---

## Environment Variables

```bash
# Public - safe to expose to browser
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Private - server-side only, never expose
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Warning:** Never use `SUPABASE_SERVICE_ROLE_KEY` in client-side code. It bypasses all security.

---

## Authentication Flow

1. User signs up/logs in via Supabase Auth (email or Google)
2. Supabase sets auth cookies (`sb-xxx-auth-token`)
3. Server components use `getServerClient()` which reads cookies
4. API routes can use JWT from `Authorization` header or cookies

### Session Management

Located in `components/auth/SessionManager.tsx`:
- Refreshes tokens automatically
- Syncs auth state on tab focus
- Handles session expiry

---

## Storage

Used for uploading images (profile pictures, event images).

```typescript
// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`)
```

---

## Troubleshooting

### "Permission denied" errors

**Cause:** Using user client for an operation that requires admin access.

**Fix:** Switch to admin client for operations that need to:
- Read other users' data
- Write data with denormalized fields
- Perform admin operations

### "Row not found" when joining users table

**Cause:** RLS filtering out rows the user can't access.

**Fix:** Don't join to users table for other users' data. Use denormalized fields or admin client.

### Auth state not persisting

**Check:**
1. Cookies are being set correctly
2. `sameSite` cookie setting matches your environment
3. Session refresh is working

---

## Related Documentation

- [../data/rls_policies.md](../data/rls_policies.md) - RLS policies and implications
- [../data/schema.md](../data/schema.md) - Database schema
- [../api/events_registration.md](../api/events_registration.md) - Registration API using these patterns
