# Row Level Security (RLS) Policies

This document explains our RLS policies and their implications for API design. **Understanding this is critical before modifying any database queries.**

## What is RLS?

Row Level Security in Supabase/PostgreSQL restricts which rows a user can read, insert, update, or delete based on policies we define. When enabled, queries automatically filter rows the user isn't allowed to access.

## Our RLS Philosophy

1. **Users can only access their own data** by default
2. **Public data requires explicit denormalization** or admin client usage
3. **Admin operations bypass RLS** using the service role key

---

## Key RLS Constraints

### `users` Table

**Policy:** Users can only SELECT/UPDATE their own row.

```sql
-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

**Implication:** You **cannot** join to the users table to get other users' names, emails, or any personal information.

```typescript
// THIS WILL NOT WORK - RLS will filter out other users
const { data } = await supabase
  .from('event_registrations')
  .select(`
    *,
    user:users(first_name, last_name)  // ❌ Only returns YOUR user data
  `)
```

### `event_registrations` Table

**Policy:** Users can view all registrations (to see who's attending events), but only modify their own.

```sql
-- Anyone can view registrations
CREATE POLICY "Public read access" ON event_registrations
  FOR SELECT USING (true);

-- Users can only insert/update/delete their own
CREATE POLICY "Users manage own registrations" ON event_registrations
  FOR ALL USING (auth.uid() = user_id);
```

**Implication:** Registration records are readable by all, but the joined user data is not. This is why we have the `participant_first_name` pattern.

### `events` Table

**Policy:** Events are publicly readable, but only admins/creators can modify.

### `coaches` / `coach_availability`

**Policy:** Coaches can manage their own availability. Anyone can read availability.

---

## The Participant Fields Pattern

### The Problem

When displaying event participants, we need to show names like "John D." But:
1. Event registrations are public (anyone can see who registered)
2. User data is private (RLS blocks reading other users' names)
3. Joining `event_registrations` to `users` only returns the current user's data

### The Solution: Denormalization

At registration time, we copy the user's name to the registration record:

```typescript
// apps/web/app/api/play/book/route.ts:249-275

// Get user's name using admin client (bypasses RLS)
const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: userData } = await adminClient
  .from('users')
  .select('first_name, last_name')
  .eq('id', user.id)
  .single();

// Store denormalized name on registration
const { error: registrationError } = await adminClient
  .from('event_registrations')
  .insert({
    event_id: eventId,
    user_id: user.id,
    participant_first_name: userData?.first_name || 'Unknown',
    participant_last_initial: userData?.last_name?.charAt(0) || '?',
    created_at: new Date().toISOString()
  });
```

### Reading Participants

The calendar API can now read participant names without joining to users:

```typescript
// apps/web/app/api/calendar/route.ts:133-143

participants: (event.event_registrations || [])
  .filter((reg: any) =>
    !reg.deleted_at &&
    reg.participant_first_name &&
    reg.participant_last_initial
  )
  .map((reg: any) => ({
    firstName: reg.participant_first_name,
    lastInitial: reg.participant_last_initial,
  })),
```

### What About DUPR Ratings?

DUPR ratings are also stored on the users table, but we DO join to users for these:

```typescript
event_registrations (
  id,
  user_id,
  participant_first_name,
  participant_last_initial,
  user:users (
    dupr_singles_rating,
    dupr_singles_reliability,
    dupr_doubles_rating,
    dupr_doubles_reliability
  )
)
```

**Why does this work?** The calendar API uses an admin client (service role key), which bypasses RLS. The ratings are non-sensitive public data that we've decided to expose this way.

---

## When to Use Admin Client vs User Client

### Use User Client (anon key) when:
- Reading public data (events, courts, locations)
- User is reading/writing their own data
- You want RLS to enforce access control

### Use Admin Client (service role key) when:
- Writing data that other users need to read (e.g., registrations with participant names)
- Reading data across users (e.g., all registrations for an event)
- Background jobs / cron tasks
- Admin panel operations

See [../integrations/supabase.md](../integrations/supabase.md) for client creation patterns.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Joining to users table for participant names

```typescript
// WRONG - RLS will filter out other users
const { data } = await supabase
  .from('event_registrations')
  .select(`*, user:users(first_name, last_name)`)
```

**Fix:** Use the denormalized `participant_first_name` and `participant_last_initial` fields.

### ❌ Mistake 2: Using user client to insert registrations

```typescript
// WRONG - User client subject to RLS, may fail
const { error } = await supabase
  .from('event_registrations')
  .insert({ event_id, user_id })
```

**Fix:** Use admin client when inserting registrations that need participant fields.

### ❌ Mistake 3: Forgetting to populate participant fields

```typescript
// WRONG - Registration won't show in participant list
await adminClient
  .from('event_registrations')
  .insert({
    event_id: eventId,
    user_id: user.id,
    // Missing participant_first_name and participant_last_initial!
  });
```

**Fix:** Always populate `participant_first_name` and `participant_last_initial` at registration time.

### ❌ Mistake 4: Modifying calendar API to join users for names

If participants aren't showing, the problem is at **registration time**, not **read time**. Don't change the calendar API to try to get names from the users table - it won't work due to RLS.

---

## Checking RLS Policies in Supabase

1. Go to Supabase Dashboard → Database → Tables
2. Select a table
3. Click "RLS Policies" in the sidebar
4. Review active policies

Or query directly:

```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

---

## Related Documentation

- [schema.md](./schema.md) - Table structure and relationships
- [../integrations/supabase.md](../integrations/supabase.md) - Admin vs user client patterns
- [../api/events_registration.md](../api/events_registration.md) - Registration API implementation
