# Account Deletion Implementation

**Started:** 2025-01-06
**Status:** Completed
**PR:** TBD

## Overview

Implemented account deletion functionality to comply with Apple App Store Review Guideline 5.1.1(v), which requires apps that support account creation to also allow users to initiate deletion of their account within the app.

This addresses the App Store rejection reason: "Account deletion not offered".

## Related Documentation

Documents reviewed before starting:
- [pages/account.md](../system_overview/pages/account.md) - Understood account page structure
- [pages/auth.md](../system_overview/pages/auth.md) - Understood auth flow patterns
- [integrations/supabase.md](../system_overview/integrations/supabase.md) - Database patterns and client usage
- [PRIVACY_POLICY.md](../../PRIVACY_POLICY.md) - Referenced existing claims about account deletion

## Changes Made

### Store (`stores/authStore.ts`)

Added `deleteAccount` function to AuthState interface and implementation:
- Anonymizes user data in the `users` table (sets `deleted_at`, clears personal info)
- Signs out the user after data is anonymized
- Cleans up notifications

The soft-delete approach:
- Sets `first_name` to "Deleted", `last_name` to "User"
- Clears `phone`, `gender`
- Disables all notifications
- Sets `deleted_at` timestamp
- Preserves the record for business/legal compliance while removing personal data

### Screen (`screens/MoreScreen.tsx`)

Added delete account UI:
- Delete account button (styled subtly, placed after sign out)
- Confirmation modal with warning and details about what will be deleted
- Loading state during deletion
- Success/error alerts

### Translations

Added new translation keys to both `i18n/locales/en.json` and `i18n/locales/es.json`:
- `more.deleteAccount` - Button text
- `more.deleteAccountDescription` - Button description
- `more.deleteAccountTitle` - Modal title
- `more.deleteAccountWarning` - Warning message
- `more.deleteAccountDetails` - Detailed explanation
- `more.deleteAccountConfirm` - Confirm button text
- `more.deleteAccountSuccess` - Success message
- `more.deleteAccountError` - Error message
- `more.deleting` - Loading state text

## User Flow

1. User navigates to "More" tab
2. Scrolls down past "Sign Out" to find "Delete Account" button
3. Taps button, sees confirmation modal with warning
4. Can cancel or confirm deletion
5. On confirm: data is anonymized, user is signed out
6. Success alert shown

## Apple Requirements Compliance

Per Apple's guidelines:
- Account deletion is easy to find in app settings (More > Delete Account)
- Users can delete the account along with their personal data
- No external flows required (phone call, email) - done entirely in-app
- Verification step via confirmation modal

## Testing

- [ ] Tested on iOS simulator
- [ ] Tested account deletion flow end-to-end
- [ ] Verified user data is anonymized in database
- [ ] Verified user is signed out after deletion
- [ ] Tested cancellation flow
- [ ] Tested error handling
- [ ] Verified translations display correctly (EN/ES)

## Documentation Updates Needed

After deployment:
- [ ] Update `PRIVACY_POLICY.md` if needed (already claims deletion is available)
- [ ] Update `pages/account.md` to document new feature

## Future Improvements

1. **Full auth user deletion**: Currently only anonymizes `users` table. Could add server-side function to delete `auth.users` record entirely.
2. **Stripe cleanup**: If user has Stripe customer, may want to delete/anonymize that data too.
3. **Data export**: Before deletion, offer user ability to export their data (for GDPR compliance).
