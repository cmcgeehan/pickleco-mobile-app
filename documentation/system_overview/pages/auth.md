# Authentication Pages

This document covers authentication pages (`/login`, `/auth/*`) - login, signup, and password reset.

## Overview

**Primary File:** `app/login/page.tsx`
**URL:** `/login`

The login page handles both sign-in and sign-up flows, plus password reset. User data is stored in the [users table](../data/schema.md#users) with authentication managed by [Supabase Auth](../integrations/supabase.md).

---

## Page Modes

The login page has three modes:

| Mode | State | Description |
|------|-------|-------------|
| Sign In | `isSignUp = false` | Default - email/password login |
| Sign Up | `isSignUp = true` | Create new account |
| Password Reset | `isResettingPassword = true` | Request password reset |

---

## Sign In Flow

1. User enters email and password
2. Client validates input
3. Calls `signIn(email, password)` from `useAuthStore` (see [Supabase integration](../integrations/supabase.md))
4. On success: redirect to [/play](./play.md)
5. On failure: show error toast

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // Validate
  const validationErrors = validateForm()
  if (validationErrors.length > 0) {
    setFormErrors(validationErrors)
    return
  }

  // Sign in via [Supabase](../integrations/supabase.md)
  await signIn(formData.email, formData.password)

  toast({ title: t('auth', 'welcomeBack'), ... })
  router.push('/play')  // Redirect to [play page](./play.md)
}
```

---

## Sign Up Flow

Additional fields (stored in [users table](../data/schema.md#users)):
- First Name (required)
- Last Name (required)
- Phone (optional, international format)

Password requirements:
- Minimum 6 characters
- Lowercase letter
- Uppercase letter
- Number
- Special character

```typescript
// Password validation
const hasLowercase = /[a-z]/.test(formData.password)
const hasUppercase = /[A-Z]/.test(formData.password)
const hasNumber = /\d/.test(formData.password)
const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)

if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
  errors.push(t('auth', 'passwordRequirementsNotMet'))
}
```

### Sign Up API Call

Creates user in [Supabase Auth](../integrations/supabase.md) and [users table](../data/schema.md#users):
```typescript
await signUp(formData.email, formData.password, {
  first_name: formData.first_name,
  last_name: formData.last_name,
  phone: formData.phone,
})
```

---

## Password Reset Flow

1. User clicks "Forgot Password"
2. Enter email
3. API sends reset email via [Supabase](../integrations/supabase.md)
4. User clicks link in email
5. User sets new password

```typescript
const handlePasswordReset = async (e: React.FormEvent) => {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.email }),
  })

  if (!response.ok) throw new Error('Failed to send reset email')

  toast({
    title: t('auth', 'resetEmailSent'),
    description: t('auth', 'resetEmailInstructions'),
  })
}
```

---

## Form Validation

Client-side validation before submit:

```typescript
const validateForm = () => {
  const errors: string[] = []

  // Sign up specific
  if (isSignUp) {
    if (!formData.first_name?.trim()) errors.push(t('auth', 'firstNameRequired'))
    if (!formData.last_name?.trim()) errors.push(t('auth', 'lastNameRequired'))
  }

  // Email validation
  if (!formData.email?.trim()) errors.push(t('auth', 'emailRequired'))
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (formData.email && !emailRegex.test(formData.email)) {
    errors.push(t('auth', 'invalidEmail'))
  }

  // Password validation
  if (!formData.password?.trim()) errors.push(t('auth', 'passwordRequired'))
  if (isSignUp && formData.password.length < 6) {
    errors.push(t('auth', 'passwordTooShort'))
  }

  // Phone validation (sign up only)
  if (isSignUp && formData.phone && !formData.phone.startsWith('+')) {
    errors.push(t('auth', 'invalidPhone'))
  }

  return errors
}
```

---

## Error Handling

[Supabase](../integrations/supabase.md)-specific errors are translated:

```typescript
if (isSignUp && error) {
  const errorStr = error.toString().toLowerCase()

  if (errorStr.includes('password') && errorStr.includes('weak')) {
    errorMessage = t('auth', 'passwordTooWeak')
  } else if (errorStr.includes('email') && errorStr.includes('already')) {
    errorMessage = t('auth', 'emailAlreadyExists')
  }
  // ... more error mappings
}
```

---

## Password Strength Indicator

Visual indicator for password requirements:

```tsx
{formData.password && (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${
        formData.password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'
      }`} />
      <span>At least 6 characters</span>
    </div>
    {/* Similar for lowercase, uppercase, number, special char */}
  </div>
)}
```

---

## Terms & Privacy

Sign up includes legal links:

```tsx
{isSignUp && (
  <div className="text-xs">
    {t('auth', 'byCreatingAccount')}{' '}
    <Link href="/privacy">{t('footer', 'privacy')}</Link>
    {' '}{t('auth', 'and')}{' '}
    <Link href="/terms">{t('footer', 'terms')}</Link>
  </div>
)}
```

---

## Auth Store Integration

Uses `useAuthStore` from `@/contexts/auth` (wraps [Supabase Auth](../integrations/supabase.md)):

```typescript
const { signIn, signUp, initialized, supabase } = useAuthStore()
```

| Method | Purpose |
|--------|---------|
| `signIn(email, password)` | Login existing user |
| `signUp(email, password, metadata)` | Create new account in [users table](../data/schema.md#users) |
| `initialized` | Auth store ready |
| `supabase` | [Supabase client](../integrations/supabase.md) |

---

## Post-Login Redirect

On successful auth, redirects to [/play](./play.md):

```typescript
router.push('/play' as Route)
```

Other pages that require authentication redirect to `/login`:
- [/account](./account.md) pages
- [/lessons](./lessons.md) booking
- [/reserve](./reserve.md) court booking
- Event registration on [/calendar](./calendar.md), [/play](./play.md), [homepage](./homepage.md)
- [/membership](./membership.md) checkout

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `Card` | Form container |
| `Input` | Text inputs |
| `PhoneInput` | International phone input |
| `Button` | Submit button |
| `Spinner` | Loading state |

---

## Auth Error Page

**File:** `app/auth/error/page.tsx`

Displays authentication errors from [Supabase](../integrations/supabase.md) OAuth flows.

---

## Translation Keys

Uses `auth` namespace:
- `auth.signInTitle`
- `auth.createAccount`
- `auth.email`
- `auth.password`
- `auth.firstNameRequired`
- `auth.passwordRequirementsNotMet`
- etc.

---

## Implementing Auth Checks in New Code

For detailed implementation patterns, see [../integrations/supabase.md](../integrations/supabase.md). Here's a quick reference:

### Client Components (React)

Use `useAuthStore()` hook:
```typescript
import { useAuthStore } from '@/contexts/auth'

function MyComponent() {
  const { user, initialized } = useAuthStore()

  if (!initialized) return <Loading />
  if (!user) {
    router.push('/login')
    return null
  }

  // User is authenticated, proceed...
}
```

### API Routes

Extract JWT from header and verify with Supabase:
```typescript
export async function POST(request: NextRequest) {
  // 1. Extract JWT
  const authHeader = request.headers.get('authorization')
  const jwt = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null

  // 2. Create client with JWT
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: jwt ? `Bearer ${jwt}` : '' } } }
  )

  // 3. Verify user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // User is authenticated, user.id is available
}
```

### Server Components

Use `getServerClient()` which reads cookies:
```typescript
import { getServerClient } from '@/lib/supabase-server'

export default async function Page() {
  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // User is authenticated
}
```

See [../integrations/supabase.md](../integrations/supabase.md) for the full patterns including admin client usage.

---

## Related Documentation

- [./account.md](./account.md) - Account management (requires auth)
- [./play.md](./play.md) - Post-login redirect destination
- [./membership.md](./membership.md) - Requires auth for checkout
- [./lessons.md](./lessons.md) - Requires auth to book
- [./reserve.md](./reserve.md) - Requires auth to reserve courts
- [./calendar.md](./calendar.md) - Requires auth to register for events
- [./homepage.md](./homepage.md) - Requires auth to register for events
- [../integrations/supabase.md](../integrations/supabase.md) - Supabase auth integration (detailed implementation patterns)
- [../data/schema.md](../data/schema.md) - Users table
- [../data/rls_policies.md](../data/rls_policies.md) - Row Level Security based on auth
