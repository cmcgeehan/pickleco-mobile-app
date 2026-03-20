---
description: Generate implementation documentation from git changes
allowed-tools: Read, Glob, Grep, Write, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
---

# Implementation Documentation Generator

Analyze git changes and generate or update implementation documentation for the mobile app.

## Step 1: Analyze Git Changes

```bash
git diff --name-only HEAD~1
git diff --stat HEAD~1
git log --oneline -5
git status --porcelain
```

If there are uncommitted changes, analyze those. Otherwise, analyze the last commit.

## Step 2: Categorize Changes

**Screens** (`screens/`)
- New screens
- Modified screens

**Components** (`components/`)
- New components
- Modified components

**State / Stores** (`stores/`)
- New stores
- Modified store fields

**Business Logic / Services** (`lib/`)
- New service methods
- Modified API calls

**Types** (`types/`)
- New types
- Modified interfaces

**Translations** (`i18n/locales/`)
- New keys added
- Modified translations

**Configuration** (`app.json`, `eas.json`, `lib/environment.ts`)
- Environment changes
- Build config changes

## Step 3: Extract Change Details

For each category with changes, read the changed files and extract:

**Screens:**
- Screen name and purpose
- Key user interactions

**Components:**
- Component name and props
- What it renders/handles

**Stores:**
- State fields added/changed
- Actions added/changed

**Services:**
- API endpoints called
- Request/response shapes

**Translations:**
- New translation keys and their namespaces

## Step 4: Determine Feature Scope

Based on changes, determine:
1. **Feature name** - Infer from file names and commit messages
2. **Feature type** - feat/fix/refactor/docs/chore
3. **Scope** - Which area (events, payments, auth, etc.)

## Step 5: Check for Existing Implementation Doc

```bash
ls /Users/connormcgeehan/Desktop/pickleco-mobile-app/documentation/implementations/
```

Search existing docs for related keywords. If found, update it. If not, create a new one.

## Step 6: Generate/Update Implementation Doc

**Save to:** `/documentation/implementations/<feature-name>-<YYYY-MM-DD>.md`

```markdown
# [Feature Name] Implementation

**Started:** YYYY-MM-DD
**Status:** In Progress | Completed
**Branch:** [branch-name]

## Overview

[What was built and why]

## Related Documentation

- [mobile_architecture.md](../system_overview/mobile_architecture.md)
- [pages/relevant.md](../system_overview/pages/relevant.md)

## Changes Made

### Screens
- `screens/X.tsx` - [what changed]

### Components
- `components/X.tsx` - [what changed]

### State / Stores
- `stores/X.ts` - [what changed]

### API / Services
- `lib/X.ts` - [what changed]

### Translations
- Added `namespace.key` (en + es)

## Testing

- [ ] Tested on iOS simulator
- [ ] Tested on TestFlight
- [ ] Released to App Store

## Documentation Updates Needed

- [ ] [doc] - [what to update]
```

## Step 7: Output Report

```
============================================
IMPLEMENTATION DOC GENERATED/UPDATED
============================================

Document: /documentation/implementations/[name].md
Action: [Created new / Updated existing]

--------------------------------------------
CHANGES DOCUMENTED
--------------------------------------------

Screens:
- [ScreenName] - [what changed]

Components:
- [ComponentName] - [what changed]

Stores:
- [storeName] - [what changed]

Services:
- [serviceName] - [what changed]

Translations:
- [namespace.key] - New key for X

--------------------------------------------
SYSTEM DOCS TO UPDATE
--------------------------------------------
After deployment, consider updating:
- [ ] pages/relevant.md - [reason]
- [ ] integrations/stripe.md - [reason]
```

## Date Format

Use ISO format: YYYY-MM-DD (e.g., 2026-03-19)
