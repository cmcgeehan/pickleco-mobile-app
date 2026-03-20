---
description: Plan a new mobile feature from a brain dump
allowed-tools: Read, Glob, Grep, Write, Bash(git:*)
---

# Feature Planning

Take a user's brain dump or rough idea and turn it into a structured plan ready for implementation.

## Step 1: Gather the Brain Dump

Ask the user:

> What's the feature you want to build? Give me everything - rough ideas, requirements, edge cases, anything you're thinking about. Don't worry about organization, just dump it all out.

Wait for their response.

## Step 2: Ask Clarifying Questions

After receiving the brain dump, ask 3-5 targeted questions to fill gaps:

- What problem does this solve for users?
- Who is the primary user (member, admin, coach, guest)?
- Any specific UI/UX preferences?
- Integration with existing features?
- Any edge cases you're already worried about?

Wait for their response.

## Step 3: Research Existing Code

Before planning, understand what exists:

1. **Check for similar patterns**:
   ```
   Search for related screens, components, or lib services
   ```

2. **Review relevant docs**:
   - `documentation/system_overview/mobile_architecture.md` - architecture overview
   - `documentation/system_overview/pages/` - screen patterns
   - `documentation/system_overview/api/` - API patterns

3. **Check for reusable components**:
   ```
   Glob for components that might be relevant
   ```

## Step 4: Create the Plan

Write a plan document at `/documentation/plans/[feature-name].md`:

```markdown
# [Feature Name] Plan

**Created:** YYYY-MM-DD
**Status:** Planning
**Branch:** feature/[feature-name]

## Overview

[2-3 sentence summary of what we're building and why]

## User Stories

- As a [user type], I want to [action] so that [benefit]
- ...

## Requirements

### Must Have
- [ ] Requirement 1
- [ ] Requirement 2

### Nice to Have
- [ ] Optional feature 1

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| [Key decision] | [Choice] | [Why] |

## Screens / UI

### New Screens
- `screens/NewScreen.tsx` - Does X

### Modified Screens
- `screens/ExistingScreen.tsx` - Add feature section

### New Components
- `components/NewComponent.tsx` - Handles Z

## API / Service Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/feature/list | List items |
| POST | /api/feature/create | Create item |

## State Management

- New store / updated store fields in `stores/`

## Implementation Steps

1. [ ] Define TypeScript types in `types/`
2. [ ] Add API service methods in `lib/`
3. [ ] Update/create store in `stores/`
4. [ ] Build UI screens and components
5. [ ] Translations (en.json + es.json)
6. [ ] Navigation integration
7. [ ] Test on iOS simulator
8. [ ] Documentation

## Security Considerations

- [ ] Auth token included in API requests
- [ ] Input validation on forms
- [ ] Waiver check for booking features

## Testing Plan

- [ ] Test on iOS simulator (iPhone 17 Pro)
- [ ] Test on Android simulator
- [ ] Test on physical device via TestFlight
- [ ] Payment flows with test cards (4242 4242 4242 4242)
- [ ] Manual testing checklist

## Open Questions

- [ ] Question that needs answering
```

## Step 5: Review with User

Present the plan summary:

1. **Overview** - What we're building
2. **Key decisions** - Important choices made
3. **Scope** - What's in vs out
4. **Estimated complexity** - Simple/Medium/Complex
5. **Open questions** - Things that need answers

Ask: "Does this capture what you want? Any changes before I save the plan?"

## Step 6: Save and Prepare

1. Save the plan document
2. Create the feature branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/[feature-name]
   ```
3. Report:
   ```
   Plan saved to: documentation/plans/[feature-name].md
   Branch created: feature/[feature-name] (from main)

   Ready to implement? Run /onboard in a new agent window, then start coding.
   ```

## Notes

- Plans live in `/documentation/plans/` (create dir if needed)
- Feature branches follow `feature/[name]` convention and are always created from `main`
- Plans can be updated as implementation reveals new needs
- Link to plan from implementation doc when complete
