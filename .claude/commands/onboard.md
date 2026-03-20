---
description: Get up to speed on the mobile app codebase and development workflow
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(ls:*)
---

# Agent Onboarding

You are a new agent joining this project. Get up to speed on the codebase, development workflow, and current state before starting work.

## Step 1: Read Core Documentation

Read these files in order:

1. **Development workflow**:
   ```
   /Users/connormcgeehan/Desktop/pickleco-mobile-app/documentation/system_overview/development_workflow.md
   ```

2. **System README** (architecture overview):
   ```
   /Users/connormcgeehan/Desktop/pickleco-mobile-app/documentation/system_overview/README.md
   ```

3. **Mobile architecture**:
   ```
   /Users/connormcgeehan/Desktop/pickleco-mobile-app/documentation/system_overview/mobile_architecture.md
   ```

## Step 2: Understand Current State

Check the git state:
```bash
git status
git branch -a
git log --oneline -10
```

Check for any in-progress work:
- Look at recent commits
- Check for uncommitted changes
- Note what branch you're on

## Step 3: Understand the Branching Model

```
main (production)        ←── always deployable, each merge can trigger App Store build
  └── feature/*          ←── developed independently off main
```

**Key rules to remember:**
- `main` = production. Always stable. Never commit directly to it.
- `feature/*` branches are created from `main` and developed independently.
- Testing: run on iOS simulator first, then build to TestFlight.
- To ship: merge feature branch to `main`, submit EAS build to App Store.

**Common workflows:**
- **Start work:** `git checkout main && git pull && git checkout -b feature/[name]`
- **Test:** `npx expo run:ios --device "iPhone 17 Pro"` on simulator
- **TestFlight:** `eas build --platform ios --profile production --auto-submit --non-interactive`
- **Ship to production:** After TestFlight approval, submit App Store build

## Step 4: Review Key Architecture

Skim these based on what you'll be working on:

| Area | Documentation |
|------|---------------|
| Mobile architecture | `documentation/system_overview/mobile_architecture.md` |
| API patterns | `documentation/system_overview/api/` |
| Screen structure | `documentation/system_overview/pages/` |
| Integrations | `documentation/system_overview/integrations/` |
| Core concepts | `documentation/system_overview/core_concepts/` |

## Step 5: Locate Key Files

Know where things are:

```
pickleco-mobile-app/
├── screens/               # App screens (CalendarScreen, PlayScreen, etc.)
├── components/            # Reusable UI components
├── stores/                # Zustand state management (authStore, etc.)
├── lib/                   # Business logic and API services
├── types/                 # TypeScript types
├── i18n/
│   └── locales/           # Translation files (en.json, es.json)
├── navigation/            # React Navigation setup
└── documentation/
    ├── system_overview/   # Architecture docs
    ├── implementations/   # Feature implementation records
    └── prds/              # Product requirements docs
```

## Step 6: Confirm Ready

After reading, summarize:

1. **What branch am I on?** (Should be `main` or a `feature/*` branch)
2. **Any uncommitted changes?**
3. **What active feature branches exist?** (`git branch -r | grep 'origin/feature/'`)
4. **What are the key patterns I need to follow?** (translations, waiver checks, etc.)
5. **Ready to receive task**

Then tell the user: "I'm onboarded and ready. What would you like me to work on?"

## Quick Reference Reminders

- Add translations to BOTH `i18n/locales/en.json` AND `i18n/locales/es.json`
- Check waiver for any booking features (`has_signed_waiver`)
- Environment: staging API for simulator/TestFlight, production API for App Store
- Commit with conventional format and `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Create feature branches from `main`
- Never commit directly to `main`
