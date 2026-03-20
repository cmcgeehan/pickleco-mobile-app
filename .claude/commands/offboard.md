---
description: Update all documentation to reflect current session's changes
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git branch:*), mcp__claude_ai_Slack__slack_send_message
---

# Agent Offboarding

You are finishing a work session on this project. Your job is to ensure all documentation is accurate and complete so the next agent (or your future self) can `/onboard` and have full, correct context.

## Step 1: Identify What Changed

```bash
git branch --show-current
git diff main --name-only
git log main..HEAD --oneline
```

Categorize all changed files:

| Category | File patterns |
|----------|--------------|
| Screens | `screens/**` |
| Components | `components/**` |
| State / Stores | `stores/**` |
| Business Logic | `lib/**` |
| Types | `types/**` |
| Translations | `i18n/locales/*.json` |
| Navigation | `navigation/**` |
| Config | `app.json`, `eas.json`, `lib/environment.ts` |
| Documentation | `documentation/**` |
| Commands | `.claude/**` |

List the changes for the user before proceeding.

## Step 2: Generate or Update Implementation Doc

Check if an implementation doc already exists for this work:

```bash
ls /Users/connormcgeehan/Desktop/pickleco-mobile-app/documentation/implementations/
```

**If no implementation doc exists:** Create one at:
`/documentation/implementations/<feature-name>-<YYYY-MM-DD>.md`

```markdown
# [Feature Name] Implementation

**Started:** YYYY-MM-DD
**Status:** Completed
**Branch:** [branch-name]

## Overview
[What was built and why]

## Changes Made

### Screens
- [screen]: [what changed]

### Components
- [component]: [what changed]

### State / Stores
- [store]: [what changed]

### API / Services
- [service]: [what changed]

### Translations
- Added keys: [list]

## Testing
- [x] Tested on iOS simulator
- [ ] Tested on TestFlight
- [ ] Released to App Store

## Documentation Updates
- [ ] [doc] - [what to update]
```

**If one exists:** Update it with new changes, mark as Completed if done.

## Step 3: Audit Affected Documentation

For each category of change, read and verify corresponding docs. **Actually read the code AND the doc, then fix any discrepancies.**

| If these files changed... | Read and verify these docs... |
|---------------------------|-------------------------------|
| `screens/CalendarScreen.tsx`, `screens/PlayScreen.tsx` | `documentation/system_overview/pages/calendar.md`, `pages/play.md` |
| `screens/MoreScreen.tsx` | `documentation/system_overview/pages/more.md` |
| `stores/authStore.ts` | `documentation/system_overview/integrations/supabase.md` |
| `lib/membershipService.ts` | `documentation/system_overview/pages/membership.md` |
| `components/EventPaymentModal.tsx`, `components/MembershipCheckoutWizard.tsx` | `documentation/system_overview/integrations/stripe.md` |
| `i18n/locales/*.json` | `documentation/system_overview/core_concepts/translations.md` |
| `lib/environment.ts` | `documentation/system_overview/ops/environments.md` |
| `types/events.ts` | `documentation/system_overview/data/schema.md` |
| `.claude/commands/**` | `documentation/system_overview/development_workflow.md` |

## Step 4: Check Translation Parity

If `i18n/locales/en.json` or `i18n/locales/es.json` changed:

1. Read both files
2. Identify keys present in one but not the other
3. Add missing keys with proper translations
4. Report any keys needing human review for translation quality

## Step 5: Verify Cross-Cutting Concerns

For any code touched in this session:

- [ ] All booking/payment flows check `has_signed_waiver`
- [ ] New user-facing text exists in both `en.json` and `es.json`
- [ ] Auth token included in all authenticated API calls
- [ ] Environment URLs correct (staging for dev/TestFlight, production for App Store)

If any issues found, flag them in the implementation doc for follow-up.

## Step 6: Commit Documentation Changes

```bash
git add documentation/ .claude/
git commit -m "docs: Update documentation after [feature/fix description]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## Step 7: Send Slack Summary

Send a message to the `#pickleco-software` channel (ID: `C0A5TD4KV1T`) summarizing what changed. Use the `slack_send_message` tool.

```
📱 *Mobile App Update — [feature/fix short description]*

*Branch:* `[branch name]`
*Status:* [Merged to main / Ready for review / In progress]

*What changed:*
• [Concise bullet point of each meaningful change]
• [Focus on user-facing or behavioral changes]

*Files affected:* [N files across N areas]

*Docs updated:* [Yes/No — list if yes]
```

## Step 8: Report

```
============================================
OFFBOARDING COMPLETE
============================================

Session Summary:
- Branch: [branch name]
- Commits: [N commits]
- Files changed: [N files]

--------------------------------------------
DOCUMENTATION UPDATED
--------------------------------------------

Implementation Doc:
- [Created/Updated] /documentation/implementations/[name].md

System Docs Updated:
- [doc path] - [what was updated]

System Docs Verified (no changes needed):
- [doc path] - Up to date

--------------------------------------------
CROSS-CUTTING CONCERNS
--------------------------------------------

[Any issues found, or "All checks passed"]

============================================
Ready for the next agent to /onboard.
============================================
```
