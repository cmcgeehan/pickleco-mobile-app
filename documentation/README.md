# The Pickle Co - Mobile App Documentation

This documentation provides comprehensive guidance for developing and maintaining The Pickle Co mobile application. It's designed to ensure consistency, enable feature reuse, and provide essential context for all team members.

## Documentation Structure

```
documentation/
├── README.md                    # This file - overview and navigation
├── system_overview/             # Core system architecture and concepts
│   ├── README.md               # System overview entry point
│   ├── general.md              # Tech stack and architecture
│   ├── mobile_architecture.md  # Mobile-specific patterns (NEW)
│   ├── core_concepts/          # Business logic concepts
│   │   ├── pricing.md          # Pricing system and discounts
│   │   ├── memberships.md      # Membership tiers and management
│   │   ├── waiver.md           # Digital waiver requirements
│   │   └── translations.md     # i18n implementation
│   ├── data/                   # Database documentation
│   │   ├── schema.md           # Database schema reference
│   │   └── rls_policies.md     # Row Level Security policies
│   ├── integrations/           # Third-party integrations
│   │   ├── stripe.md           # Payment processing
│   │   ├── supabase.md         # Database and auth
│   │   └── dupr.md             # DUPR rating integration
│   ├── users/                  # User type documentation
│   │   ├── player.md           # Player capabilities
│   │   ├── coach.md            # Coach features and dashboard
│   │   └── admin.md            # Admin functionality
│   ├── screens/                # Mobile screen documentation (NEW)
│   │   ├── play.md             # PlayScreen - Home/Discovery
│   │   ├── membership.md       # MembershipScreen
│   │   ├── calendar.md         # CalendarScreen
│   │   ├── lessons.md          # LessonsScreen
│   │   └── more.md             # MoreScreen - Account/Settings
│   └── ops/                    # Operations and deployment
│       └── environments.md     # Environment configuration
├── implementations/            # Feature implementation details
│   ├── README.md               # Implementation docs index
│   ├── coach-availability-system-documentation.md
│   ├── MOBILE_STRIPE_INTEGRATION_GUIDE.md
│   ├── mobile-direct-api-usage-guide.md
│   └── [other implementation docs]
├── migrations/                 # Database migration records
└── prds/                       # Product requirements documents
```

## Quick Reference

### Mobile Tech Stack
- **Framework**: React Native 0.79 + Expo 53
- **State Management**: Zustand 5.0
- **Database**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe React Native SDK
- **Navigation**: React Navigation 7
- **Localization**: i18next + react-i18next

### Key Files
| Purpose | Location |
|---------|----------|
| App Entry | `/App.tsx` |
| Auth State | `/stores/authStore.ts` |
| Feature Flags | `/stores/featureFlagsStore.ts` |
| Supabase Client | `/lib/supabase.ts` |
| Stripe Service | `/lib/stripeService.ts` |
| Pricing Logic | `/lib/pricing.ts` |

### Critical Patterns

1. **Participant Fields Denormalization**: Always send `participant_first_name` and `participant_last_initial` at registration time (RLS prevents reading other users' data).

2. **Soft Deletes**: All tables use `deleted_at` timestamp. Always filter with `.is('deleted_at', null)`.

3. **Waiver Enforcement**: Check `has_signed_waiver` before any booking operation.

4. **Direct Supabase + API Hybrid**: Use Supabase directly for reads/profile updates; use HTTP APIs for payments and complex operations.

## Mobile vs Web Differences

| Aspect | Mobile | Web |
|--------|--------|-----|
| Auth Session | AsyncStorage + JWT | Cookies |
| Payment UI | Stripe Payment Sheet | Stripe Elements |
| Real-time | Push Notifications | WebSocket subscriptions |
| State | Zustand stores | Context/Redux |
| API Access | Direct Supabase preferred | API routes |

## Feature Parity Status

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Event Registration | ✅ | ✅ | Full feature parity |
| Court Reservation | ✅ | ✅ | Via wizard component |
| Lesson Booking | ✅ | ✅ | Via wizard component |
| Membership Purchase | ✅ | ✅ | Stripe Payment Sheet |
| Coach Dashboard | ✅ | ❌ | Web only currently |
| Coach Availability Templates | ✅ | ❌ | Needs implementation |
| Admin Functions | ✅ | ❌ | Web only |
| DUPR Integration | ✅ | ⚠️ | Partial - display only |
| Pro Shop | ✅ | ❌ | Web only |

## Getting Started

1. **New Feature Development**: Start with `/system_overview/` to understand the system architecture
2. **Understanding a Feature**: Check `/implementations/` for detailed implementation docs
3. **Database Changes**: Review `/system_overview/data/schema.md` for current structure
4. **Payment Integration**: See `/implementations/MOBILE_STRIPE_INTEGRATION_GUIDE.md`

## Contributing to Documentation

When implementing new features:
1. Update relevant docs in `/system_overview/` if patterns change
2. Create implementation doc in `/implementations/` with date suffix
3. Update feature parity table in this README
4. Document any mobile-specific considerations
