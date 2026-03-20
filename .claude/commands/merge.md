---
description: Merge a feature branch to main
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(npm:*), Bash(npx:*)
---

# Merge to Main

Merge an approved feature branch to main.

## Branching Model

```
main (production)        ←── always deployable
  └── feature/*          ←── developed independently off main
```

Features are tested on simulator (and optionally TestFlight), then merged individually to `main`.

## Pre-Merge Checklist

Before running this command, ensure:
- [ ] Feature is complete and tested on iOS simulator
- [ ] `/security-check` has been run and passed
- [ ] User has approved the feature

## Step 1: Verify Branch State

```bash
git fetch origin main
git status
git branch --show-current
```

Confirm:
- You're on the feature branch (not main)
- All changes are committed
- Branch is up to date

## Step 2: Check TypeScript

```bash
cd /Users/connormcgeehan/Desktop/pickleco-mobile-app
npx tsc --noEmit
```

Fix any type errors before proceeding.

## Step 3: Rebase on Latest Main

```bash
git fetch origin main
git rebase origin/main
```

If conflicts occur:
1. List the conflicting files
2. Ask the user how to resolve
3. After resolving: `git rebase --continue`

Re-run TypeScript check after rebase:
```bash
npx tsc --noEmit
```

## Step 4: Merge to Main

```bash
# Switch to main
git checkout main

# Pull latest
git pull origin main

# Merge the feature branch (no fast-forward to preserve history)
git merge --no-ff feature/[branch-name] -m "$(cat <<'EOF'
Merge feature/[branch-name]: [Brief description]

[Summary of changes]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

# Push to remote
git push origin main
```

## Step 5: Clean Up

Delete the merged feature branch:

```bash
# Delete local branch
git branch -d feature/[branch-name]

# Delete remote branch
git push origin --delete feature/[branch-name]
```

## Step 6: Update Documentation

Check if any documentation needs updating:
- `documentation/system_overview/` - Architecture docs
- `documentation/implementations/` - Create implementation record

Use `/generate-impl-doc` if significant changes were made.

## Step 7: Report

```
## Merge Complete

**Branch:** feature/[branch-name] → main

### Changes
- [Summary of what was added/changed]

### Next Steps
- [ ] Run /ship to submit TestFlight build
- [ ] Documentation updated (if needed)

### Cleanup
- [x] Feature branch deleted (local + remote)
```

## Notes

- Always run `/security-check` before `/merge`
- After merge, run `/ship` to submit a new TestFlight build
- The merge commit preserves the feature branch history
