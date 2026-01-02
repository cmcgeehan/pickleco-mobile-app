# Calendar List View - Date Range Filter & Calendar View Implementation

**Started:** 2025-12-12
**Status:** Completed
**Deployed:** staging.thepickleco.mx (2025-12-12)

## Overview

1. Change the calendar page list view to show all future events by default instead of only today's events
2. Add a date range filter so users can optionally narrow down to a specific date range
3. Add a calendar view toggle to the "All Events" section (same as /play page has for spotlight)
4. Remove filters from EventSpotlight component (featured events are handpicked, should always display)

## Related Documentation

Documents reviewed before starting:
- [pages/calendar.md](../system_overview/pages/calendar.md) - Understood current calendar implementation
- [api/events_registration.md](../system_overview/api/events_registration.md) - Understood event fetching pattern
- [data/schema.md](../system_overview/data/schema.md) - Reviewed events table structure
- [data/rls_policies.md](../system_overview/data/rls_policies.md) - Understood RLS constraints
- [core_concepts/translations.md](../system_overview/core_concepts/translations.md) - Need to add translations for new UI

## Current Behavior (Before)

- `selectedDate` initialized to `new Date()` (today)
- Events filtered client-side with `isSameDay(eventDate, selectedDate)`
- Single date picker allows selecting one specific date
- API already returns ALL future events (good, no API changes needed)
- EventSpotlight had "Filter by Week" / "Show All" toggle controls

## Changes Made

### Components

#### `app/calendar/page.tsx`
- Changed from single `selectedDate` to date range (`startDate`, `endDate`)
- Default: `startDate = null`, `endDate = null` (shows all future events)
- Modified filter logic to check if event falls within range (when range is set)
- Replaced single date picker with date range picker UI
- Added "Clear filter" button to reset to showing all events
- Added `viewMode` state (`'list' | 'calendar'`) for toggle between views
- Added view toggle buttons (List/Calendar) to "All Events" section header
- Integrated `WeeklyCalendarView` component for calendar view mode

#### `components/event-spotlight.tsx`
- Removed week filter UI (the gradient header bar with navigation)
- Removed `showAllEvents` and `currentWeekStart` state
- Removed unused imports (date-fns functions, Button, icons)
- Component now simply displays all spotlight events as a clean grid
- This affects both `/play` and `/calendar` pages

### Translations

#### `messages/en.json`
- Added `calendar.dateRange` - "Date Range"
- Added `calendar.startDate` - "Start Date"
- Added `calendar.endDate` - "End Date"
- Added `calendar.clearFilter` - "Clear Filter"
- Added `calendar.allUpcoming` - "All Upcoming"
- Added `calendar.to` - "to"

#### `messages/es.json`
- Added Spanish translations for all new keys

## Testing

- [x] Tested on staging
- [x] Default view shows all future events
- [x] Can filter by start date only (shows events from that date forward)
- [x] Can filter by end date only (shows events up to that date)
- [x] Can filter by both start and end date (shows events in range)
- [x] Clear filter button resets to all events
- [x] Skill level filter still works alongside date range
- [x] Tested in both English and Spanish
- [x] List/Calendar view toggle works
- [x] Calendar view shows events in weekly grid
- [x] Clicking event in calendar view opens modal
- [x] EventSpotlight no longer has filter controls

## Documentation Updates

- [x] `pages/calendar.md` - Updated with view toggle and date range filter docs
- [x] `commiting_changes.md` - Added notes about disabled auto-deploys
- [x] `development_workflow.md` - Added deployment instructions with Stripe key warnings
