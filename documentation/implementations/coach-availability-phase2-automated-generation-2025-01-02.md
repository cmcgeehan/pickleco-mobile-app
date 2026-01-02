# Coach Availability Phase 2: Automated Schedule Generation
**Implementation Date: January 2, 2025**

## Overview
Phase 2 implements the automated weekly generation of coach availability from templates, with a 5-day review cycle and notification system. This ensures coaches always have 4 weeks of availability ready for players to book.

## Current Status
- ✅ Phase 1 Complete: Templates and manual review UI
- 🚧 Phase 2 In Progress: Automated generation system
- ⏳ Phase 3 Pending: Player-facing integration
- ⏳ Phase 4 Pending: Admin tools

## System Architecture

### Timeline & Booking Window
```
Current System:
- Players can book: 4 weeks in advance
- Coaches review: Week 5 (generated on Tuesday, due Sunday)
- Weekly release: Monday 6 AM

Example for Week of Jan 6-12, 2025:
- Monday Jan 6: Week of Feb 3-9 opens for players
- Tuesday Jan 7: Generate Feb 10-16 for coach review
- Sunday Jan 12: Coach review deadline
- Monday Jan 13: Feb 10-16 opens for players
```

### Key Components

#### 1. Generation Service
- **Trigger**: Cron job every Tuesday at 2 AM CST
- **Action**: Generate Week 5 availability from templates
- **Status**: Set as `template_generated`

#### 2. Notification System
- **Initial**: Email on Tuesday when generated
- **Reminder 1**: Friday (3 days before deadline)
- **Reminder 2**: Sunday morning (day of deadline)
- **Final**: Sunday evening if not reviewed

#### 3. Auto-Approval Logic
- **Sunday 11:59 PM**: Check all `template_generated` slots
- **Decision Tree**:
  - If reviewed by coach → Use coach's changes
  - If not reviewed → Auto-approve (change to `coach_reviewed`)
  - Special case: Coach can set "vacation mode" to not generate

## Implementation Plan

### Step 1: Database Enhancements
```sql
-- Add generation tracking
ALTER TABLE coach_availability ADD COLUMN generation_week DATE;
ALTER TABLE coach_availability ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE;

-- Coach preferences table
CREATE TABLE coach_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    auto_approve_enabled BOOLEAN DEFAULT TRUE,
    vacation_mode BOOLEAN DEFAULT FALSE,
    vacation_start DATE,
    vacation_end DATE,
    notification_email VARCHAR(255),
    notification_preferences JSONB DEFAULT '{"initial": true, "reminders": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation log for tracking
CREATE TABLE availability_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_date DATE NOT NULL,
    target_week_start DATE NOT NULL,
    coaches_processed INTEGER DEFAULT 0,
    coaches_notified INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### Step 2: Generation Service API

#### `/api/coaches/availability/generate-weekly`
```typescript
// Weekly generation endpoint (called by cron)
export async function POST(request: Request) {
  const targetWeekStart = getWeek5StartDate() // 5 weeks from today's Monday

  // 1. Get all active coaches
  const coaches = await getActiveCoaches()

  // 2. For each coach
  for (const coach of coaches) {
    // Check vacation mode
    if (await isCoachOnVacation(coach.id, targetWeekStart)) {
      continue
    }

    // Get their template
    const template = await getCoachTemplate(coach.id)

    // Generate availability for target week
    await generateWeekFromTemplate(coach.id, template, targetWeekStart)

    // Send notification
    await sendGenerationNotification(coach.id, targetWeekStart)
  }

  // Log generation
  await logGeneration(targetWeekStart, coaches.length)
}
```

#### `/api/coaches/availability/auto-approve`
```typescript
// Auto-approval endpoint (called Sunday 11:59 PM)
export async function POST(request: Request) {
  const currentWeek5 = getWeek5StartDate()

  // Get all template_generated slots for this week
  const pendingSlots = await getPendingSlots(currentWeek5)

  // Group by coach
  const coachesPending = groupByCoach(pendingSlots)

  for (const [coachId, slots] of coachesPending) {
    const preferences = await getCoachPreferences(coachId)

    if (preferences.auto_approve_enabled) {
      // Auto-approve all slots
      await approveSlots(slots)
      await sendAutoApprovalNotification(coachId, slots.length)
    } else {
      // Hide slots from booking
      await hideSlots(slots)
      await sendMissedReviewNotification(coachId)
    }
  }
}
```

### Step 3: Notification Templates

#### Initial Generation Email
```
Subject: Your schedule for [Week Dates] is ready for review

Hi [Coach Name],

Your availability for the week of [Monday Date] - [Sunday Date] has been generated from your template and is ready for review.

**Review Deadline: Sunday, [Deadline Date] at 11:59 PM**

[Review Your Schedule Button]

Your current template shows:
- Monday: [times]
- Tuesday: [times]
- ...

If you don't review by the deadline, your schedule will be auto-approved as shown.

Thanks,
The Pickle Co Team
```

#### Reminder Email
```
Subject: Reminder: Review your schedule by Sunday

Hi [Coach Name],

Quick reminder: You have [X] days left to review your schedule for [Week Dates].

[Review Now Button]

After Sunday at 11:59 PM, any unreviewed slots will be automatically approved.

Thanks,
The Pickle Co Team
```

### Step 4: Cron Job Setup

Using Vercel Cron Jobs (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/generate-coach-availability",
    "schedule": "0 7 * * 2"  // Every Tuesday at 7 AM UTC (2 AM CST)
  }, {
    "path": "/api/cron/auto-approve-availability",
    "schedule": "59 4 * * 1"  // Every Monday at 4:59 AM UTC (Sunday 11:59 PM CST)
  }, {
    "path": "/api/cron/send-review-reminders",
    "schedule": "0 13 * * 5,0"  // Friday and Sunday at 1 PM UTC (8 AM CST)
  }]
}
```

### Step 5: Coach Preferences UI

New tab in Coach Dashboard: "Settings"

```typescript
// Components needed:
- VacationModeToggle
- AutoApprovalToggle
- NotificationPreferences
- EmailSettings
```

Features:
1. **Vacation Mode**
   - Toggle on/off
   - Set date range
   - No availability generated during vacation

2. **Auto-Approval**
   - Toggle on/off
   - If off, unreviewed slots are hidden

3. **Notifications**
   - Email address for notifications
   - Toggle for each notification type

### Step 6: Admin Monitoring Dashboard

Add to admin panel:
1. **Generation Status**
   - Last run time
   - Coaches processed
   - Errors

2. **Review Status**
   - Coaches pending review
   - Auto-approvals scheduled
   - Missed reviews

3. **Manual Controls**
   - Trigger generation for specific coach
   - Force approve/reject pending slots
   - Override vacation mode

## Testing Plan

### Week 1: Component Testing
- [ ] Generation service creates correct slots
- [ ] Notifications sent successfully
- [ ] Auto-approval logic works
- [ ] Vacation mode prevents generation

### Week 2: Integration Testing
- [ ] Full cycle: Generate → Notify → Review → Approve
- [ ] Edge cases: Coach on vacation, no template, partial template
- [ ] Multiple coaches simultaneously

### Week 3: Production Testing
- [ ] Deploy with 1 test coach
- [ ] Monitor for 2 full cycles
- [ ] Check all notifications delivered
- [ ] Verify booking window integrity

## Success Metrics

1. **Generation Success Rate**: >99% of coaches have availability generated weekly
2. **Review Rate**: >80% of coaches review before deadline
3. **Notification Delivery**: >95% successful email delivery
4. **System Uptime**: No missed generation cycles

## Rollback Plan

If issues occur:
1. Disable cron jobs immediately
2. Manually generate availability for affected coaches
3. Notify coaches via WhatsApp/email
4. Fix issues and re-enable after testing

## Next Steps

### Immediate (Today):
1. ✅ Create this implementation doc
2. 🔄 Create database migration for new tables
3. ⏳ Build generation service endpoint

### This Week:
4. ⏳ Implement notification system
5. ⏳ Create cron job configuration
6. ⏳ Build coach preferences UI

### Next Week:
7. ⏳ Test full generation cycle
8. ⏳ Deploy to production
9. ⏳ Monitor first live cycle

## Questions to Resolve

1. **Holiday Handling**: Should we skip generation for Mexican holidays?
2. **Coach Limit**: Maximum number of hours per week a coach can be available?
3. **Conflict Resolution**: What if a coach manually adds availability that conflicts with template?
4. **Retroactive Changes**: Can coaches modify availability after it's been booked?

## Technical Debt from Phase 1

From cleanup summary:
- Database permission issue with users table
- Direct database connection timeouts
- Need to ensure all coaches have `is_coach: true` flag

These should be addressed before or during Phase 2 implementation.

---

## Implementation Log

### January 2, 2025
- ✅ Created Phase 2 implementation plan
- ✅ Defined system architecture
- ✅ Outlined database schema changes
- ✅ Specified API endpoints needed
- ✅ Created notification templates
- ✅ Created database migration file (`20250102_coach_availability_phase2.sql`)
- ✅ Added coach dashboard link to header navigation (only visible to coaches)
- ✅ Implemented Google Analytics and Meta Pixel tracking

### Migration Features Added:
1. **Enhanced coach_availability table**:
   - `generation_week` - tracks which week slots were generated for
   - `auto_approved` - marks if slot was auto-approved

2. **New tables**:
   - `coach_preferences` - vacation mode, auto-approval settings, notifications
   - `availability_generation_log` - tracks each generation run
   - `coach_notifications` - log of all notifications sent

3. **Helper functions**:
   - `get_coaches_for_generation()` - lists coaches needing generation
   - `generate_availability_from_template()` - creates slots from template
   - `auto_approve_pending_slots()` - auto-approves unreviewed slots

4. **Security**:
   - RLS policies for all new tables
   - Coaches can manage their own data
   - Admins have full access

### Next Steps:
- Apply migration to database
- Build generation service API endpoints
- Create notification system
- Build coach preferences UI