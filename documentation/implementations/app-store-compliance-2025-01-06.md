# App Store Compliance Implementation

**Started:** 2025-01-06
**Status:** Completed
**PR:** TBD

## Overview

This implementation addresses multiple Apple App Store compliance issues identified during an audit of the codebase. The app was rejected due to missing account deletion functionality, but the audit revealed additional compliance gaps.

### Issues Addressed

| Issue | Guideline | Priority | Status |
|-------|-----------|----------|--------|
| Account Deletion | 5.1.1(v) | Critical | Implemented |
| Privacy Policy In-App Access | 5.1.1 | High | Implemented |
| Terms of Service Access | 3.1.2 | High | Implemented |

## Related Documentation

Documents reviewed before starting:
- [pages/account.md](../system_overview/pages/account.md) - Account page structure
- [pages/auth.md](../system_overview/pages/auth.md) - Auth flow patterns
- [integrations/supabase.md](../system_overview/integrations/supabase.md) - Database patterns
- [PRIVACY_POLICY.md](../../PRIVACY_POLICY.md) - Privacy policy content

---

## 1. Account Deletion (Guideline 5.1.1(v))

### Requirement
Apple requires apps that support account creation to allow users to initiate deletion of their account within the app.

### Implementation

#### Files Modified
- `stores/authStore.ts` - Added `deleteAccount()` function
- `screens/MoreScreen.tsx` - Added delete button and confirmation modal
- `i18n/locales/en.json` - Added translation keys
- `i18n/locales/es.json` - Added Spanish translations

#### How It Works
1. User navigates to More tab
2. Taps "Delete Account" button (below Sign Out)
3. Confirmation modal appears with warning about data loss
4. User confirms → data is anonymized → user is signed out

#### Technical Details

The `deleteAccount()` function in authStore calls the server-side API:
```typescript
deleteAccount: async () => {
  // Call API endpoint to fully delete account
  const response = await fetch(`${apiUrl}/api/users/delete-account`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  // Sign out locally
  await supabase.auth.signOut()
}
```

The API endpoint (`DELETE /api/users/delete-account`) handles:
1. Verifying user authentication
2. Deleting `auth.users` record (Supabase auth)
3. Deleting `public.users` record (profile data)

#### Translation Keys Added
- `more.deleteAccount` - Button text
- `more.deleteAccountTitle` - Modal title
- `more.deleteAccountWarning` - Warning message
- `more.deleteAccountDetails` - Detailed explanation
- `more.deleteAccountConfirm` - Confirm button
- `more.deleteAccountSuccess` - Success message
- `more.deleteAccountError` - Error message
- `more.deleting` - Loading state

---

## 2. Privacy Policy In-App Access

### Requirement
Users must be able to access the privacy policy from within the app.

### Implementation

#### Files Modified
- `screens/MoreScreen.tsx` - Added Privacy Policy link in Legal section

#### Approach
Links open the web-hosted privacy policy using `Linking.openURL()`:
- **URL:** `https://www.thepickleco.mx/privacy`

This approach is preferred because:
- Policy can be updated without app updates
- Consistent with web experience
- Standard practice for mobile apps

---

## 3. Terms of Service Access

### Requirement
Users must be able to access Terms of Service from within the app.

### Implementation

#### Files Modified
- `screens/MoreScreen.tsx` - Added Terms of Service link in Legal section

#### Approach
Links open the web-hosted terms using `Linking.openURL()`:
- **URL:** `https://www.thepickleco.mx/terms`

---

## 4. Legal Section in More Screen

### New UI Element

Added a "Legal" section to the More screen between menu items and Sign Out:

```
┌─────────────────────────────────┐
│ LEGAL                           │
├─────────────────────────────────┤
│ 🔒 Privacy Policy            › │
├─────────────────────────────────┤
│ 📄 Terms of Service          › │
└─────────────────────────────────┘
```

#### Translation Keys Added
- `more.legal` - Section title

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `stores/authStore.ts` | Added `deleteAccount()` function |
| `screens/MoreScreen.tsx` | Added delete button, legal section with web links |
| `i18n/locales/en.json` | Added 11 translation keys |
| `i18n/locales/es.json` | Added 11 Spanish translations |

Note: `components/PolicyModal.tsx` was also updated with full privacy policy content for potential in-app use, but the primary implementation uses web URLs.

---

## Testing Checklist

### Account Deletion
- [ ] Delete button visible in More screen
- [ ] Confirmation modal appears on tap
- [ ] Cancel button closes modal
- [ ] Confirm button triggers deletion
- [ ] Loading state shows during deletion
- [ ] Success alert after deletion
- [ ] User is signed out after deletion
- [ ] User data is anonymized in database
- [ ] Error handling works if deletion fails

### Privacy Policy
- [ ] Privacy Policy link visible in Legal section
- [ ] Tapping opens Safari/browser with https://www.thepickleco.mx/privacy
- [ ] Page loads correctly

### Terms of Service
- [ ] Terms link visible in Legal section
- [ ] Tapping opens Safari/browser with https://www.thepickleco.mx/terms
- [ ] Page loads correctly

### Translations
- [ ] All new keys display in English
- [ ] All new keys display in Spanish
- [ ] Language switching works correctly

---

## App Store Submission Notes

When resubmitting to the App Store, include in the review notes:

> Account deletion is now available in the app. Users can find it in:
> More tab → scroll down → Delete Account button
>
> Privacy Policy and Terms of Service are accessible from:
> More tab → Legal section → Privacy Policy / Terms of Service

---

## Documentation Updates Needed

After deployment:
- [x] Create this implementation document
- [ ] Update `pages/account.md` to document account deletion feature
- [ ] Update README if needed

---

## Future Improvements

1. **Full auth user deletion**: Currently soft-deletes by anonymizing data. Could add server-side function to delete `auth.users` record entirely.

2. **Stripe customer cleanup**: If user has Stripe customer record, consider deleting/anonymizing that data too.

3. **Data export before deletion**: Offer users ability to export their data before deleting (for full GDPR compliance).

4. **Email confirmation**: Send confirmation email when account is deleted.
