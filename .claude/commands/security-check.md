---
description: Security review before merging a feature branch
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

# Security Check

Perform a security review of changes before merging to main.

## Step 1: Identify Changes

Get the diff against main:
```bash
git fetch origin main
git diff origin/main...HEAD --name-only
```

List all modified files for review.

## Step 2: Check for Sensitive Data

### Hardcoded Secrets
Search for potential secrets in changed files:
```
Grep for: password, secret, api_key, apikey, token, credential, private_key
```

**Red flags:**
- Hardcoded API keys
- Hardcoded passwords
- Private keys in code
- .env files being committed
- Stripe keys hardcoded in source

### Environment Variables
Verify sensitive values come from env vars:
```typescript
// GOOD
const apiKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY

// BAD
const apiKey = "pk_live_abc123..."
```

## Step 3: Check Authentication

### API Calls
For each new/modified API call in `lib/`:

1. **Authentication**: Does it include the auth token?
   ```typescript
   // Should have auth header
   headers: { Authorization: `Bearer ${session.access_token}` }
   ```

2. **Authorization**: Does it handle 401/403 responses correctly?

3. **Waiver check**: If booking-related, does it check `has_signed_waiver`?

## Step 4: Check Input Validation

### User Input
Verify form inputs are validated:
- Required fields checked before API call
- Types validated (numbers, dates, etc.)
- Reasonable limits on string lengths

### Deep Link / URL Handling
If any URL parsing is involved:
- Validate URL scheme matches expected
- No injection via URL parameters

## Step 5: Check Data Exposure

### Logging
Verify no sensitive data is logged:
```typescript
// BAD - logs auth token
console.log('Session:', session)

// GOOD - log only what's needed
console.log('User logged in:', user.id)
```

### AsyncStorage
Check what's stored in AsyncStorage:
- No plaintext passwords
- Tokens should be stored securely
- No PII beyond what's necessary

## Step 6: Check Environment Configuration

Verify the build uses correct environment per stage:

| Stage | API URL | Stripe Keys |
|-------|---------|-------------|
| Simulator | staging.thepickleco.mx | Test keys |
| TestFlight | staging.thepickleco.mx | Test keys |
| App Store | www.thepickleco.mx | Live keys |

**Red flags:**
- Production API URL in a test build
- Live Stripe key in TestFlight build
- Staging API URL in App Store build

## Step 7: Check Dependencies

If package.json was modified:
```bash
npm audit
```

Review any new dependencies for:
- Known vulnerabilities
- Suspicious packages
- Unnecessary permissions

## Step 8: Generate Report

```markdown
## Security Review: [branch-name]

**Date:** YYYY-MM-DD
**Reviewer:** Claude
**Files Changed:** [count]

### Checklist

- [ ] No hardcoded secrets or API keys
- [ ] Authentication on all API calls
- [ ] Waiver checks on booking flows
- [ ] Input validation present
- [ ] No sensitive data in logs
- [ ] AsyncStorage usage appropriate
- [ ] Environment config correct
- [ ] Dependencies secure (npm audit)

### Findings

#### Critical
(None / List issues)

#### Warnings
(None / List issues)

#### Notes
(Any observations)

### Verdict

[ ] APPROVED - Safe to merge
[ ] NEEDS CHANGES - Issues must be fixed first
[ ] BLOCKED - Critical security issues
```

## Step 9: Report to User

If approved:
```
Security check PASSED

No critical issues found. Safe to proceed with /merge
```
