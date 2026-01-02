# PRD: Web Account Page - Mobile-First Design Migration

## Executive Summary

**Objective**: Migrate The Pickle Co's mobile "More" screen to replace the existing web account page, delivering a superior user experience with modern design and comprehensive account management features.

**Why**: The mobile account experience is significantly better designed, more intuitive, and provides better user engagement than the current web version. This migration will unify the user experience across platforms and improve user satisfaction.

## Current Mobile Experience Analysis

### **✅ What Works Exceptionally Well**

1. **Visual Hierarchy & Design**
   - Clean, modern card-based layout with proper spacing
   - Consistent color scheme (#2A62A2 brand blue)
   - Intuitive iconography and typography
   - Professional avatar management with camera overlay

2. **User Experience Flow**
   - Modal-based navigation keeps users in context
   - Logical grouping of related functionality
   - Clear visual feedback for actions
   - Graceful loading states and error handling

3. **Comprehensive Feature Set**
   - Complete profile management
   - Real-time membership status and history
   - Full billing management (payment methods + history)
   - Granular notification preferences
   - Easy contact options

4. **Technical Excellence**
   - Real-time data sync with Supabase
   - Stripe integration for payment management
   - Image upload with Supabase storage
   - International phone number support
   - Proper error boundaries and validation

---

## 🎯 Product Requirements

### **Primary Goals**
1. **Unify Experience**: Match mobile UX quality on web
2. **Improve Engagement**: Reduce bounce rate and increase user actions
3. **Enhance Functionality**: Provide all mobile features on web
4. **Modern Design**: Replace outdated web account page

### **Success Metrics**
- **User Engagement**: +40% time spent on account page
- **Feature Usage**: +60% users updating profile information  
- **Support Reduction**: -30% account-related support tickets
- **Payment Management**: +50% users adding/managing payment methods

---

## 🏗️ Technical Architecture

### **Frontend Framework**
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for responsive design
- **Framer Motion** for smooth animations

### **Backend Integration**
- **Supabase** for user data and authentication
- **Stripe** for payment management
- **Supabase Storage** for avatar uploads
- **Real-time subscriptions** for live data updates

### **Component Library**
- **Shadcn/ui** for consistent components
- **Radix UI** for accessibility
- **Custom components** matching mobile design

---

## 📱 Feature Specifications

### **1. User Profile Section**
```typescript
interface UserProfileSection {
  avatar: {
    display: "avatar image or initials"
    uploadOptions: ["camera", "file picker", "remove"]
    storage: "supabase-storage"
    validation: "image type, size limits"
  }
  
  personalInfo: {
    firstName: string
    lastName: string  
    email: string
    phone: string // with country code picker
    gender: "mens" | "womens" | null
    preferences: NotificationSettings
  }
  
  actions: {
    save: "real-time validation + save"
    cancel: "revert changes"
    feedback: "success/error states"
  }
}
```

**Visual Design**:
- Large avatar (80px) with camera overlay on hover
- Inline editing with validation
- Country code dropdown for phone numbers
- Toggle switches for gender selection
- Save/cancel actions with loading states

### **2. Membership Management**
```typescript
interface MembershipSection {
  activeMembership: {
    type: string
    status: "active" | "expired" | "cancelled"
    location: string
    startDate: Date
    endDate: Date | null
    monthlyCost: number
    currency: "MXN"
  }
  
  membershipHistory: MembershipRecord[]
  
  actions: {
    viewDetails: () => void
    upgradePlan: () => void
    cancelMembership: () => void
    renewMembership: () => void
  }
}
```

**Visual Design**:
- Prominent membership card with status indicator
- Color-coded status badges (green=active, gray=inactive)
- Expandable history section
- Quick action buttons for common tasks

### **3. Billing Dashboard**
```typescript
interface BillingSection {
  paymentMethods: {
    list: StripePaymentMethod[]
    default: string // payment method ID
    actions: {
      add: () => Promise<boolean>
      remove: (id: string) => Promise<void>
      setDefault: (id: string) => Promise<void>
    }
  }
  
  paymentHistory: {
    transactions: StripePaymentRecord[]
    filters: {
      dateRange: [Date, Date]
      status: "all" | "succeeded" | "failed"
      type: "all" | "membership" | "booking"
    }
    pagination: PaginationState
  }
}
```

**Visual Design**:
- Card-based payment method display
- Stripe Elements for secure card entry
- Tabular payment history with filtering
- Download receipt functionality

### **4. Notification Preferences**
```typescript
interface NotificationSettings {
  email: boolean
  sms: boolean  
  whatsapp: boolean
  
  categories: {
    bookings: boolean
    events: boolean
    membership: boolean
    marketing: boolean
  }
}
```

**Visual Design**:
- Toggle switches with descriptions
- Grouped by notification type and category
- Real-time save on toggle

### **5. Contact Information Hub**
```typescript
interface ContactSection {
  contactMethods: [
    {
      type: "address"
      icon: "📍"
      label: "Visit Us"
      value: "Av Moliere 46, Granada, Miguel Hidalgo, 11529 CDMX"
      action: "open in maps"
    },
    {
      type: "whatsapp-direct"
      icon: "💬"
      label: "WhatsApp Direct"
      value: "+52 56 3423 4298"
      action: "open WhatsApp chat"
    },
    {
      type: "whatsapp-group"
      icon: "👥"
      label: "Club Group"
      value: "Join community chat"
      action: "join WhatsApp group"
    },
    {
      type: "instagram"
      icon: "📸"
      label: "Instagram"
      value: "@the_pickle_co"
      action: "open Instagram profile"
    }
  ]
}
```

---

## 🎨 Visual Design System

### **Layout Structure**
```
┌─────────────────────────────────────┐
│ Header: Logo + User Name + Language │
├─────────────────────────────────────┤
│ User Profile Section                │ 
│ ┌─────────┐ Name, Email             │
│ │ Avatar  │ Quick Edit Button       │
│ │   📷   │                         │
│ └─────────┘                         │
├─────────────────────────────────────┤
│ Main Content (Responsive Grid)      │
│ ┌─────────────┐ ┌─────────────────┐ │
│ │ Membership  │ │ Personal Info   │ │
│ │ Card        │ │ Form            │ │
│ └─────────────┘ └─────────────────┘ │
│ ┌─────────────┐ ┌─────────────────┐ │
│ │ Billing     │ │ Notifications   │ │
│ │ Dashboard   │ │ Preferences     │ │
│ └─────────────┘ └─────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Contact Information Hub         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Footer: Sign Out + Support Links   │
└─────────────────────────────────────┘
```

### **Color Palette**
```css
:root {
  --brand-primary: #2A62A2;      /* Main blue */
  --brand-primary-light: #F0F7FF; /* Light blue bg */
  --text-primary: #020817;        /* Dark text */
  --text-secondary: #64748B;      /* Gray text */
  --background: #ffffff;          /* White bg */
  --background-subtle: #F8FAFC;   /* Light gray bg */
  --border: #E2E8F0;              /* Light border */
  --success: #10B981;             /* Green */
  --error: #DC2626;               /* Red */
}
```

### **Typography Scale**
```css
.text-3xl { font-size: 24px; font-weight: 700; } /* Headers */
.text-xl  { font-size: 18px; font-weight: 600; } /* Subheaders */
.text-lg  { font-size: 16px; font-weight: 500; } /* Body */
.text-base { font-size: 14px; font-weight: 400; } /* Secondary */
.text-sm  { font-size: 12px; font-weight: 400; } /* Captions */
```

---

## 📱 Responsive Design

### **Desktop (1024px+)**
- Two-column grid layout
- Sidebar navigation for sections
- Modal dialogs for detailed editing
- Hover states and animations

### **Tablet (768px - 1023px)**
- Single-column stack with larger cards
- Collapsible sections
- Touch-friendly buttons (44px min)

### **Mobile (< 768px)**
- Full-screen sections
- Bottom sheet modals
- Swipe gestures
- Native mobile interactions

---

## 🔗 API Requirements

### **User Management APIs**
```typescript
// GET /api/user/profile
interface UserProfileAPI {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  gender: string
  avatar_url?: string
  notification_preferences: NotificationSettings
  created_at: string
  updated_at: string
}

// PUT /api/user/profile
interface UpdateUserProfileAPI {
  first_name?: string
  last_name?: string  
  phone?: string
  gender?: string
  notification_preferences?: Partial<NotificationSettings>
}

// POST /api/user/avatar
interface AvatarUploadAPI {
  file: File
  returns: { avatar_url: string }
}
```

### **Membership APIs**
```typescript
// GET /api/user/membership
interface MembershipAPI {
  active_membership?: {
    id: string
    type: string
    status: string
    location: string
    start_date: string
    end_date?: string
    monthly_cost: number
  }
  membership_history: MembershipRecord[]
}
```

### **Billing APIs**
```typescript
// GET /api/user/payment-methods
interface PaymentMethodsAPI {
  payment_methods: StripePaymentMethod[]
  default_payment_method?: string
}

// GET /api/user/payment-history  
interface PaymentHistoryAPI {
  payments: StripePaymentRecord[]
  pagination: {
    total: number
    page: number
    per_page: number
    has_more: boolean
  }
}
```

---

## 🚀 Implementation Plan

### **Phase 1: Foundation (Week 1-2)**
- [ ] Set up Next.js project structure
- [ ] Install and configure dependencies
- [ ] Create design system components
- [ ] Set up Supabase and Stripe integration
- [ ] Build responsive layout framework

### **Phase 2: Core Features (Week 3-4)**
- [ ] User profile section with avatar upload
- [ ] Personal information form with validation
- [ ] Membership status display
- [ ] Basic navigation and routing

### **Phase 3: Advanced Features (Week 5-6)**
- [ ] Payment methods management
- [ ] Payment history with filtering
- [ ] Notification preferences
- [ ] Contact information hub
- [ ] Real-time data updates

### **Phase 4: Polish & Testing (Week 7-8)**
- [ ] Animation and micro-interactions
- [ ] Error handling and edge cases
- [ ] Mobile responsiveness testing
- [ ] Performance optimization
- [ ] Accessibility audit

### **Phase 5: Deployment (Week 9)**
- [ ] Production deployment
- [ ] A/B testing setup
- [ ] Analytics integration
- [ ] User feedback collection

---

## 🧪 Testing Strategy

### **Unit Testing**
- Individual component functionality
- Form validation logic
- API integration methods
- Error handling scenarios

### **Integration Testing**
- End-to-end user flows
- Payment processing
- File upload functionality
- Real-time data synchronization

### **User Testing**
- Usability testing with existing users
- Mobile responsiveness validation
- Cross-browser compatibility
- Performance testing

---

## 📊 Analytics & Metrics

### **User Engagement Metrics**
- Time spent on account page
- Feature usage rates (profile edit, billing, etc.)
- User retention and return visits
- Task completion rates

### **Business Metrics**
- Support ticket reduction
- Payment method adoption
- Profile completion rates
- User satisfaction scores

### **Technical Metrics**
- Page load performance
- Error rates and crashes
- API response times
- Mobile responsiveness scores

---

## 🎁 Future Enhancements

### **Phase 2 Features**
- **Social Integration**: Connect Instagram, share achievements
- **Preferences Hub**: Court preferences, playing style
- **Achievement System**: Badges, milestones, streaks
- **Friends & Following**: Social connections within the club

### **Advanced Features**
- **Calendar Integration**: Sync with Google/Apple Calendar
- **Smart Notifications**: AI-driven personalized alerts  
- **Offline Mode**: Cache data for offline access
- **Multi-language**: Full Spanish localization

---

## 🔒 Security & Privacy

### **Data Protection**
- GDPR compliance for user data
- Secure image upload with virus scanning
- PCI DSS compliance for payment data
- Encryption for sensitive information

### **Authentication**
- Supabase Auth integration
- Session management
- Multi-factor authentication support
- Password reset flows

---

## 🎯 Success Criteria

### **Must Have**
✅ Feature parity with mobile version
✅ Responsive design on all devices  
✅ Sub-2 second page load time
✅ 95%+ uptime and reliability
✅ Full accessibility compliance

### **Should Have**
🎯 40% increase in user engagement
🎯 30% reduction in support tickets
🎯 60% increase in profile completions
🎯 50% increase in payment method additions

### **Could Have**
💡 Social sharing features
💡 Advanced analytics dashboard
💡 Custom theming options
💡 Integration with external services

---

**This PRD provides a comprehensive roadmap for creating a world-class web account experience that matches and exceeds the quality of your mobile app. The focus is on maintaining the beautiful design and smooth interactions while adding web-specific enhancements.**