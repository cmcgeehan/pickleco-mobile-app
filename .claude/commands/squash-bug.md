---
description: Structured bug squashing workflow - investigate, fix, test, deploy
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(npx expo:*), Edit, Write
---

# Squash Bug

A structured workflow for investigating, fixing, and deploying bug fixes.

## Step 1: Gather Bug Report

Ask the user:

> What's the bug? Tell me:
> - **What's happening** (error message, wrong behavior, screenshot)
> - **What should happen** (expected behavior)
> - **Where** (which screen or feature)
> - **Environment** (simulator, TestFlight, App Store, or local)
> - **Steps to reproduce** (if known)

Wait for their response.

## Step 2: Triage

Categorize the bug and identify likely affected areas:

| Category | Where to look |
|----------|---------------|
| UI / rendering | `screens/`, `components/` |
| API / network error | `lib/` services, API endpoint |
| State / data issues | `stores/`, state management |
| Auth / permissions | `stores/authStore.ts`, `lib/` auth helpers |
| Payments | `components/EventPaymentModal.tsx`, Stripe integration |
| Translations | `i18n/locales/en.json`, `i18n/locales/es.json` |
| Booking flow | Event registration, waiver check |

Review relevant system docs:
- `documentation/system_overview/mobile_architecture.md`
- `documentation/system_overview/api/`
- `documentation/system_overview/pages/`

## Step 3: Investigate

### 3a. Find the code path

Search for the relevant code using the bug's location:
- Grep for error messages, screen names, component names
- Read the affected files to understand the current logic
- Trace the full code path from UI → store → API call

### 3b. Common pitfalls checklist

Scan the affected code for these known issues:

- [ ] **Missing auth token** - API call without Authorization header
- [ ] **Missing waiver check** - Booking action without `has_signed_waiver` validation
- [ ] **Translation key mismatch** - Key exists in `en.json` but not `es.json` (or vice versa)
- [ ] **Wrong environment URL** - Staging URL hardcoded, or env var not loaded
- [ ] **Missing null/undefined check** - Data assumed to exist but API returned null
- [ ] **Race condition** - Async operations completing in unexpected order
- [ ] **Stale types** - TypeScript types out of sync with actual API response

### 3c. Check recent changes

```bash
git log --oneline -20 --all -- [affected-files]
```

See if a recent commit introduced the bug.

## Step 4: Root Cause

**STOP and present findings to the user before writing any code.**

Report:

```
## Bug Diagnosis

**Category:** [UI / API / State / Auth / Payment / etc.]
**Root cause:** [Clear explanation of why the bug happens]
**Affected file(s):** [file:line references]
**Common pitfall?** [Yes/No - which one from the checklist]

**Proposed fix:** [What needs to change and why]
```

Wait for user confirmation before proceeding.

## Step 5: Fix

### 5a. Implement the fix

- Make the minimal change needed to fix the bug
- Do not refactor surrounding code unless directly related
- If the fix touches user-facing text, update BOTH `en.json` and `es.json`
- If the fix touches a booking flow, verify waiver check is present

### 5b. Test on simulator

```bash
npx expo run:ios --device "iPhone 17 Pro"
```

Verify the fix works as expected.

## Step 6: Commit and Push

### 6a. Create feature branch (if not already on one)

```bash
git checkout main
git pull origin main
git checkout -b fix/[bug-name]
```

### 6b. Commit and push

```bash
git add [changed-files]
git commit -m "fix(<scope>): <description of what was fixed>

<explanation of root cause and fix>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin fix/[bug-name]
```

### 6c. Report to user

```
## Bug Fix Pushed

**Bug:** [what was broken]
**Root cause:** [why it happened]
**Fix:** [what changed]
**Branch:** fix/[bug-name]

Please verify the fix on simulator. Say "ship it" when ready for TestFlight/App Store.
(Use /ship to submit to TestFlight)
```
