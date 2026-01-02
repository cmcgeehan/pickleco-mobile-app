# Coach Availability Management System Documentation

## System Overview
The coach availability management system provides a two-stage workflow for coaches to manage their schedules:
1. **Weekly Templates** - Define recurring availability patterns
2. **Availability Review** - Review and approve auto-generated availability before it goes live

## Database Structure

### `coach_weekly_templates` Table
Stores recurring weekly availability patterns for each coach.

**Fields:**
- `id` - UUID primary key
- `coach_id` - References the coach's user ID
- `day_of_week` - Integer 1-7 (1=Monday, 7=Sunday)
- `start_time` - TIME format (HH:MM:SS but displayed as HH:MM)
- `end_time` - TIME format (HH:MM:SS but displayed as HH:MM)
- `is_active` - Boolean (currently all active templates are used)
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Constraints:**
- `UNIQUE(coach_id, day_of_week, start_time, end_time)` - Prevents duplicate time slots

### `coach_availability` Table (existing, enhanced)
**New Field Added:**
- `booking_status` - VARCHAR(20) with three possible values:
  - `'template_generated'` - Auto-generated from template, awaiting review
  - `'coach_reviewed'` - Coach has approved, ready for booking
  - `'open_for_booking'` - Available for students to book (default for manual entries)

## User Interface Components

### 1. Coach Dashboard (`/coach-dashboard`)
Main hub with two tabs:

#### Weekly Template Tab
**Purpose:** Set recurring weekly availability

**Features:**
- Display all 7 days of the week
- Each day can be enabled/disabled
- Multiple time slots per day
- Time selection in 30-minute increments (7:00 AM - 7:30 PM)
- Default new slot: 9:00 AM - 11:00 AM
- Save overwrites entire template (delete & recreate)

**User Flow:**
1. Coach enables days they're available
2. Adds time slots for each day
3. Can add multiple slots per day (e.g., 9-11 AM and 2-4 PM)
4. Clicks "Guardar Plantilla" to save

#### Availability Review Tab
**Purpose:** Review and approve auto-generated availability

**Features:**
- Shows availability for current/selected week
- Displays slots with `template_generated` or `coach_reviewed` status
- Visual calendar view
- Edit capabilities before approval
- Bulk approve or modify individual slots

**User Flow:**
1. System generates availability from template weekly
2. Coach reviews generated slots
3. Can modify times or remove slots
4. Approves to change status to `coach_reviewed`
5. Slots become bookable by students

## API Endpoints

### GET `/api/coaches/[id]/template`
**Purpose:** Retrieve coach's weekly template
**Response:** Array of template slots with day_of_week, start_time, end_time

### POST `/api/coaches/[id]/template`
**Purpose:** Save/update weekly template
**Behavior:** 
- Deletes ALL existing templates for coach
- Inserts new template slots
- This ensures clean updates without constraint violations

**Request Body:**
```json
{
  "template": [
    {
      "day_of_week": 1,
      "start_time": "09:00",
      "end_time": "11:00"
    },
    {
      "day_of_week": 1,
      "start_time": "14:00",
      "end_time": "16:00"
    }
  ]
}
```

### DELETE `/api/coaches/[id]/template`
**Purpose:** Clear all templates for a coach
**Behavior:** Removes all template records

### GET `/api/coaches/[id]/availability/review`
**Purpose:** Get availability pending review
**Query Params:** `week_start`, `week_end`
**Response:** Availability slots with `template_generated` or `coach_reviewed` status

### PUT `/api/coaches/[id]/availability/review`
**Purpose:** Submit reviewed availability
**Behavior:** 
- Deletes old template-generated slots for the week
- Inserts reviewed slots with `coach_reviewed` status

### POST `/api/coaches/[id]/availability/generate-from-template`
**Purpose:** Generate availability from template
**Note:** Calls database function (if exists)

## Expected System Behavior

### Template Management
1. **Creating Template:**
   - Coach selects days and times
   - System saves to `coach_weekly_templates`
   - Old templates are completely replaced (not updated)

2. **Displaying Template:**
   - Database stores times as HH:MM:SS
   - UI strips seconds for display (HH:MM)
   - Select dropdowns match stored values

3. **Editing Template:**
   - Always replaces entire template
   - No partial updates
   - Prevents duplicate/conflict issues

### Availability Generation (Future Implementation)
1. **Weekly Generation:**
   - Cron job or manual trigger
   - Creates `coach_availability` records
   - Sets `booking_status = 'template_generated'`
   - Respects existing bookings

2. **Review Process:**
   - Coach reviews generated slots
   - Can modify before approval
   - Approval changes status to `coach_reviewed`
   - Only reviewed slots are bookable

### Time Handling
- **Storage:** TIME format in database (HH:MM:SS)
- **Display:** HH:MM format in UI
- **Options:** 30-minute increments from 7:00 AM to 7:30 PM
- **Defaults:** New slots default to 9:00 AM - 11:00 AM

## Testing Checklist

### Template Creation
- [ ] Can enable/disable days
- [ ] Can add multiple time slots per day
- [ ] Time dropdowns show 7:00 AM - 7:30 PM
- [ ] Save successfully replaces old template
- [ ] No duplicate time slot errors

### Template Display
- [ ] Saved times display correctly (not defaulting to first option)
- [ ] Multiple slots per day display properly
- [ ] Can edit existing slots
- [ ] Can delete individual slots

### Data Persistence
- [ ] Templates persist after page reload
- [ ] Correct coach_id association
- [ ] Database shows correct time values

### Edge Cases
- [ ] Empty template (all days disabled) saves correctly
- [ ] Overlapping times prevented (if implemented)
- [ ] Maximum slots per day (if limited)
- [ ] Timezone handling (if relevant)

## Known Limitations

1. **Manual Generation:** Currently no automatic weekly generation from templates
2. **No Overlap Prevention:** System allows overlapping time slots
3. **No Validation:** Minimal validation on time ranges (end > start)
4. **Single Coach View:** No admin view for managing multiple coaches
5. **No Notifications:** No email/alerts when availability is generated

## Future Enhancements

1. **Automated Generation**
   - Weekly cron job to generate availability
   - Configurable generation schedule
   - Respect holidays/blackout dates

2. **Conflict Management**
   - Prevent overlapping slots
   - Handle existing bookings
   - Vacation/absence management

3. **Bulk Operations**
   - Copy templates between weeks
   - Apply template to date range
   - Bulk approve generated availability

4. **Analytics**
   - Utilization reports
   - Popular time slots
   - Booking patterns

## Troubleshooting

### Common Issues

1. **Times Display Wrong**
   - Check database has HH:MM:SS format
   - Verify UI strips seconds (substring(0,5))
   - Ensure TIME_OPTIONS array matches

2. **Save Fails with 400/500 Error**
   - Check for UNIQUE constraint violations
   - Verify all old templates deleted first
   - Check validation schema matches data

3. **Port Mismatch**
   - Kill processes on port 3000
   - Restart with `PORT=3000 npm run dev:web`
   - Clear browser cache

4. **Template Not Loading**
   - Check authentication token
   - Verify coach_id matches user
   - Check database connection

## Support Information

- **Database:** Supabase PostgreSQL
- **Frontend:** Next.js 14 with React
- **Styling:** Tailwind CSS
- **Time Zones:** Currently uses server timezone
- **Languages:** Spanish UI with English technical implementation