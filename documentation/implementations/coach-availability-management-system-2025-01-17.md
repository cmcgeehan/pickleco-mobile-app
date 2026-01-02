# Coach Availability Management System
**Implementation Plan - January 17, 2025**

## Overview
Implementation of self-service coach availability management with a rolling 4-week booking window and conservative 5-day coach review cycle suitable for Mexican market pace.

## Goals
1. **Primary**: Minimize booking conflicts by giving coaches control over their availability
2. **Secondary**: Make availability management as easy as possible for coaches
3. **Business**: Maintain 4-week advance booking window for players

## System Design

### Booking Window Strategy
- **Player booking window**: Always 4 weeks in advance
- **Coach review cycle**: 5 days (Tuesday to Sunday)
- **Weekly release**: Every Monday at 6 AM

#### Timeline Example (Conservative Approach)
```
Week of Jan 13-19 (Current Week):
- Players can book: Jan 13 - Feb 9 (weeks 1-4)
- Tuesday Jan 14: Generate Week 5 (Feb 10-16) for coach review
- Sunday Jan 19: Coach review deadline
- Monday Jan 20: Week 5 opens for player booking
```

### Availability States
```sql
booking_status ENUM:
- 'template_generated' - Created from coach template, needs review
- 'coach_reviewed' - Coach has confirmed/modified  
- 'open_for_booking' - Players can book this slot
- 'past' - Historical record
```

## Implementation Phases

### Phase 1: Core UI & Templates (Testable Slice 1)
**Goal**: Coaches can set weekly availability templates
**Timeline**: 2-3 days
**Review Point**: After basic template creation works

#### Components to Build:
1. **Coach Dashboard Landing Page** (`/coach-dashboard`)
   - Simple navigation
   - Current week overview
   - Upcoming review notifications

2. **Weekly Template Editor** (`/coach-dashboard/template`)
   - 7-day grid (Mon-Sun)
   - Time slot selection (30-min increments, 6 AM - 10 PM)
   - Save template functionality

3. **Template Preview Component**
   - Shows current weekly template
   - Visual time blocks
   - Edit button to modify

#### Database Changes:
```sql
-- Add to existing coach_availability table
ALTER TABLE coach_availability ADD COLUMN booking_status VARCHAR(20) DEFAULT 'open_for_booking';
ALTER TABLE coach_availability ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE coach_availability ADD COLUMN template_day_of_week INTEGER; -- 1-7 for Mon-Sun

-- New table for coach templates
CREATE TABLE coach_weekly_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES users(id),
    day_of_week INTEGER NOT NULL, -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### API Endpoints:
- `GET /api/coaches/[id]/template` - Get weekly template
- `POST /api/coaches/[id]/template` - Save weekly template
- `PUT /api/coaches/[id]/template` - Update template

**Review Checkpoint 1**: Template creation and editing works, coaches can see their weekly pattern

---

### Phase 2: Review System (Testable Slice 2)
**Goal**: Coaches can review and modify upcoming weeks
**Timeline**: 2 days
**Review Point**: After coach can modify generated availability

#### Components to Build:
1. **Availability Review Page** (`/coach-dashboard/review`)
   - Shows next week's generated availability
   - Side-by-side template vs. generated comparison
   - Individual slot edit capabilities

2. **Week Modification Tools**
   - "Copy from template" button
   - "Copy last week" button  
   - Individual time slot add/remove
   - "Block entire day" quick action

3. **Review Status Indicator**
   - Shows which weeks need review
   - Deadline countdown
   - Auto-approval warning

#### New API Endpoints:
- `GET /api/coaches/[id]/availability/pending` - Get weeks needing review
- `POST /api/coaches/[id]/availability/generate` - Generate from template
- `PUT /api/coaches/[id]/availability/review` - Submit reviewed week

#### Background Process (Cron Job):
```javascript
// Tuesday 9 AM: Generate next week for review
// cron: "0 9 * * 2" 
async function generateWeekForReview() {
  const coaches = await getActiveCoaches();
  for (const coach of coaches) {
    const targetWeek = getWeekOffset(5); // 5 weeks out
    await generateAvailabilityFromTemplate(coach.id, targetWeek);
    await sendReviewNotification(coach.id, targetWeek);
  }
}
```

**Review Checkpoint 2**: Coaches get notifications, can modify generated weeks, system tracks review status

---

### Phase 3: Automated Release (Testable Slice 3)  
**Goal**: Weeks automatically open for booking after review period
**Timeline**: 1-2 days
**Review Point**: After automatic Monday releases work

#### Components to Build:
1. **Coach Notification System**
   - Email templates for review reminders
   - Dashboard notifications
   - Deadline warnings

2. **Administrative Monitoring**
   - Admin can see which coaches haven't reviewed
   - Manual override capabilities
   - System health dashboard

#### Background Processes:
```javascript
// Sunday 8 PM: Final reminder
// cron: "0 20 * * 0"
async function sendFinalReminder() {
  const pendingReviews = await getPendingReviews();
  for (const review of pendingReviews) {
    await sendReminderEmail(review.coach_id, review.week);
  }
}

// Monday 6 AM: Open for booking
// cron: "0 6 * * 1" 
async function openWeekForBooking() {
  const reviewWeek = getCurrentReviewWeek();
  
  // Auto-approve unreviewed (use template)
  await autoApproveFromTemplate(reviewWeek);
  
  // Change status to open
  await updateBookingStatus(reviewWeek, 'open_for_booking');
  
  // Notify coaches
  await notifyWeekOpened(reviewWeek);
}
```

**Review Checkpoint 3**: Full automation works, weeks open on schedule, coaches get appropriate notifications

---

### Phase 4: Edge Cases & Polish (Testable Slice 4)
**Goal**: Handle vacations, holidays, and error cases
**Timeline**: 1-2 days  
**Review Point**: After vacation/holiday handling works

#### Features to Add:
1. **Vacation Management**
   - Mark weeks as "vacation" up to 12 weeks ahead
   - Skip template generation for vacation weeks
   - Bulk vacation scheduling

2. **Holiday Awareness**
   - Mexican national holidays pre-configured
   - Modified availability suggestions
   - Holiday schedule templates

3. **Error Handling**
   - Coach missed review deadline
   - Template generation failures
   - Booking conflict resolution

4. **Mobile Optimization**
   - Responsive design for coach dashboard
   - Touch-friendly time slot selection
   - Mobile notifications

**Review Checkpoint 4**: System handles edge cases gracefully, mobile experience is solid

---

## Technical Specifications

### Authentication & Authorization
- Extend existing RLS policies for coach self-management
- Coach role verification middleware
- Session management for dashboard access

### UI/UX Principles
- Follow existing design system (shadcn/ui components)
- Conservative, clear interface suitable for less tech-savvy users
- Spanish language support throughout
- Offline-first approach where possible

### Notification Strategy
- Email notifications with clear Mexican Spanish
- In-app notifications on dashboard
- WhatsApp integration consideration for future

### Error Recovery
- Graceful template generation fallbacks
- Admin override capabilities
- Clear error messaging for coaches

## Review Checkpoints

1. **After Phase 1**: Template system working - coach can create and edit weekly patterns
2. **After Phase 2**: Review process working - coach can modify upcoming weeks  
3. **After Phase 3**: Automation working - weeks open automatically on Mondays
4. **After Phase 4**: Polish complete - handles edge cases and mobile ready

## Success Metrics
- Booking conflicts reduced by >80%
- Coach adoption rate >90% within 30 days
- Average review time <10 minutes per week
- Player booking lead time maintained at 4 weeks

## Next Steps after these phases
1. Slack notifications about new lessons, cancellations
2. Push + email notifications for players
2. Push + email notifications for coaches

---

## Current Status: Phase 1 Complete ✅

### Phase 1 Completed Items:
- ✅ Coach Dashboard Landing Page (`/coach-dashboard`)
- ✅ Weekly Template Editor Component
- ✅ Availability Review Component  
- ✅ Database Migration for Templates
- ✅ API Endpoints for Template Management
- ✅ API Endpoints for Availability Review

### Files Created:
1. `/apps/web/app/coach-dashboard/page.tsx` - Main dashboard
2. `/apps/web/components/coach/weekly-template-editor.tsx` - Template editor
3. `/apps/web/components/coach/availability-review.tsx` - Review interface
4. `/apps/web/migrations/20250117_create_coach_weekly_templates.sql` - Database schema
5. `/apps/web/app/api/coaches/[id]/template/route.ts` - Template API
6. `/apps/web/app/api/coaches/[id]/availability/review/route.ts` - Review API

**Ready for Testing**: Basic template creation and editing functionality

**Next Steps**: 
1. Run database migration
2. Test coach dashboard access
3. Verify template save/load functionality
4. Begin Phase 2 if Phase 1 tests pass