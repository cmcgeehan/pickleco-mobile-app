---
description: Audit documentation for staleness and missing coverage
allowed-tools: Read, Glob, Grep, Bash(git log:*)
---

# Documentation Audit

You are a documentation auditor for The Pickle Co mobile app. Your job is to detect documentation that may be out of sync with the codebase and identify gaps in coverage.

## Step 1: Screen Documentation Audit

Find all screens and check documentation:

1. Find all screen files:
   ```
   Glob: screens/*.tsx
   ```

2. Read screen documentation:
   ```
   Glob: documentation/system_overview/pages/*.md
   ```

3. For each screen found:
   - Extract the screen name
   - Check if there's corresponding documentation
   - Note what features it implements

4. Report:
   - Screens without documentation
   - Documented screens that may not exist anymore

## Step 2: API / Service Documentation Audit

Find all lib services and check documentation:

1. Find all service files:
   ```
   Glob: lib/*.ts
   ```

2. Read API documentation:
   ```
   Glob: documentation/system_overview/api/*.md
   ```

3. For each service found:
   - Identify API endpoints called
   - Check if they're documented

4. Report:
   - API calls not documented anywhere
   - Documented APIs that may have changed

## Step 3: Type Documentation Audit

Check if TypeScript types match documentation:

1. Read type files:
   ```
   Glob: types/*.ts
   ```

2. Read schema documentation:
   ```
   documentation/system_overview/data/schema.md
   ```

3. Compare types to docs — flag discrepancies.

## Step 4: Implementation Doc Status Audit

1. List all implementation docs:
   ```bash
   ls /Users/connormcgeehan/Desktop/pickleco-mobile-app/documentation/implementations/
   ```

2. For docs with status "In Progress":
   - Check the "Started" date
   - If older than 2 weeks, flag as potentially stale

3. Report:
   - Docs still "In Progress"
   - Docs that should likely be marked "Completed"

## Step 5: Documentation Freshness Check

For key documentation files vs related code:

```bash
git log -1 --format="%ai" -- documentation/system_overview/pages/calendar.md
git log -1 --format="%ai" -- screens/CalendarScreen.tsx
```

Flag docs where code is significantly newer (>1 week).

## Step 6: Translation Parity Check

```bash
# Compare keys in both locale files
```

1. Read `i18n/locales/en.json`
2. Read `i18n/locales/es.json`
3. Report keys present in one but not the other

## Step 7: Generate Audit Report

```markdown
# Documentation Audit Report

Generated: [date]

## Summary

| Category | Coverage | Issues |
|----------|----------|--------|
| Screens | X/Y screens | Z undocumented |
| API/Services | X/Y services | Z undocumented |
| Types | X/Y types | Z undocumented |
| Impl Docs | X completed | Y still in progress |
| Translations | en: X keys / es: Y keys | Z mismatches |

---

## Screen Documentation

### Undocumented Screens
- [ ] `ScreenName.tsx` - No corresponding page doc

---

## API Documentation

### Undocumented Endpoints
- [ ] `GET /api/endpoint` - Called in `lib/service.ts` but not documented

---

## Implementation Docs

### Still In Progress
- [ ] `feature-name.md` - Started: [date] (X days ago)

---

## Translation Mismatches

### Keys in en.json but not es.json
- [ ] `namespace.key`

### Keys in es.json but not en.json
- [ ] `namespace.key`

---

## Stale Documentation

| Document | Last Updated | Related Code | Code Updated |
|----------|--------------|--------------|--------------|
| pages/calendar.md | [date] | CalendarScreen.tsx | [date] |

---

## Recommended Actions

1. **High Priority**
   - [ ] Document screen X
   - [ ] Fix translation mismatch for key Y

2. **Medium Priority**
   - [ ] Update stale doc Z

3. **Low Priority**
   - [ ] Mark implementation doc as Completed
```
