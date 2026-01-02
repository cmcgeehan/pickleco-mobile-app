# Analytics Implementation Plan for The Pickle Co Website

## Executive Summary
This document outlines a comprehensive plan to implement Google Analytics 4 (GA4) and Meta Pixel analytics for thepickleco.mx website. The implementation will enable tracking of website traffic, user behavior, conversion events, and attribution to marketing campaigns (ads and SEO).

# Meta Pixel Code
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '693234967136563');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=693234967136563&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->



## Current State Analysis

### Existing Setup
- **Google Analytics**: Basic GA4 implementation exists
  - GA Measurement ID: `G-PD9W10N1BM` (found in `.env.local`)
  - Component: `/components/google-analytics.tsx`
  - Integration: Loaded in root layout (`app/layout.tsx`)
  - Current tracking: Page views only

### Missing Components
- No Meta Pixel (Facebook) tracking
- No enhanced conversion tracking
- No custom event tracking
- No UTM parameter capture and attribution
- No e-commerce/membership tracking
- No form submission tracking
- No user engagement metrics

## Implementation Plan

### Phase 1: Enhanced Google Analytics 4 Setup

#### 1.1 Core Conversion Events Definition

**Primary Conversion Events for The Pickle Co:**

1. **Membership Purchase** - Completing payment for any membership plan
2. **Court Reservation** - Successfully booking a court through the reservation wizard
3. **Lesson Booking** - Completing a class/lesson booking through the booking wizard
4. **Event Registration** - Registering and paying for a tournament or special event

These are the KEY BUSINESS CONVERSIONS that directly generate revenue and should be tracked with the highest priority.

#### 1.2 Update GA4 Configuration
```typescript
// File: apps/web/lib/analytics/google-analytics.ts

export const GA_EVENTS = {
  // Page engagement
  PAGE_VIEW: 'page_view',
  SCROLL: 'scroll',
  CLICK: 'click',

  // User actions
  SIGN_UP: 'sign_up',
  LOGIN: 'login',

  // PRIMARY CONVERSIONS - These are our money events!
  MEMBERSHIP_PURCHASE: 'membership_purchase', // Conversion #1
  COURT_RESERVATION_COMPLETE: 'court_reservation_complete', // Conversion #2
  LESSON_BOOKING_COMPLETE: 'lesson_booking_complete', // Conversion #3
  EVENT_REGISTRATION_COMPLETE: 'event_registration_complete', // Conversion #4

  // Membership funnel events
  VIEW_MEMBERSHIP_PLANS: 'view_membership_plans',
  SELECT_MEMBERSHIP_PLAN: 'select_membership_plan',
  BEGIN_MEMBERSHIP_CHECKOUT: 'begin_membership_checkout',

  // Court reservation funnel events
  VIEW_COURT_AVAILABILITY: 'view_court_availability',
  SELECT_COURT_TIME: 'select_court_time',
  BEGIN_COURT_CHECKOUT: 'begin_court_checkout',

  // Lesson booking funnel events
  VIEW_LESSON_OPTIONS: 'view_lesson_options',
  SELECT_LESSON_TYPE: 'select_lesson_type',
  BEGIN_LESSON_CHECKOUT: 'begin_lesson_checkout',

  // Event registration funnel events
  VIEW_EVENT_DETAILS: 'view_event_details',
  SELECT_EVENT_CATEGORY: 'select_event_category',
  BEGIN_EVENT_REGISTRATION: 'begin_event_registration',

  // Lead generation (micro-conversions)
  CONTACT_FORM_SUBMIT: 'contact_form_submit',
  WAITLIST_JOIN: 'waitlist_join',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  WHATSAPP_CLICK: 'whatsapp_click'
} as const

export const trackEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...parameters,
      send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    })
  }
}

// PRIMARY CONVERSION TRACKING FUNCTIONS

export const trackMembershipPurchase = (data: {
  transaction_id: string
  membership_type: string
  value: number
  currency?: string
}) => {
  trackEvent(GA_EVENTS.MEMBERSHIP_PURCHASE, {
    ...data,
    currency: data.currency || 'MXN',
    conversion_value: data.value,
  })
}

export const trackCourtReservation = (data: {
  reservation_id: string
  court_number: string
  duration_minutes: number
  date: string
  time: string
  value: number
}) => {
  trackEvent(GA_EVENTS.COURT_RESERVATION_COMPLETE, {
    ...data,
    currency: 'MXN',
    conversion_value: data.value,
  })
}

export const trackLessonBooking = (data: {
  booking_id: string
  lesson_type: string
  instructor?: string
  date: string
  time: string
  value: number
}) => {
  trackEvent(GA_EVENTS.LESSON_BOOKING_COMPLETE, {
    ...data,
    currency: 'MXN',
    conversion_value: data.value,
  })
}

export const trackEventRegistration = (data: {
  registration_id: string
  event_name: string
  event_type: string
  date: string
  value: number
}) => {
  trackEvent(GA_EVENTS.EVENT_REGISTRATION_COMPLETE, {
    ...data,
    currency: 'MXN',
    conversion_value: data.value,
  })
}
```

#### 1.2 Enhanced Google Analytics Component
```tsx
// File: apps/web/components/analytics/google-analytics.tsx

'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void
    dataLayer: any[]
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && window.gtag) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

      // Track page view with enhanced data
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: url,
        // Capture UTM parameters
        utm_source: searchParams?.get('utm_source') || undefined,
        utm_medium: searchParams?.get('utm_medium') || undefined,
        utm_campaign: searchParams?.get('utm_campaign') || undefined,
        utm_term: searchParams?.get('utm_term') || undefined,
        utm_content: searchParams?.get('utm_content') || undefined,
      })
    }
  }, [pathname, searchParams])

  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
            send_page_view: false, // We'll send page views manually for better control
            cookie_flags: 'SameSite=None;Secure',
          });

          // Enhanced e-commerce tracking
          gtag('set', {
            'currency': 'MXN',
            'country': 'MX'
          });
        `}
      </Script>
    </>
  )
}
```

### Phase 2: Meta Pixel (Facebook) Implementation

#### 2.1 Meta Pixel Configuration
```typescript
// File: apps/web/lib/analytics/meta-pixel.ts

export const META_EVENTS = {
  // Standard Meta events
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  SEARCH: 'Search',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  PURCHASE: 'Purchase', // Maps to ALL our conversion types
  LEAD: 'Lead',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  CONTACT: 'Contact',
  SCHEDULE: 'Schedule',
} as const

export const META_CUSTOM_EVENTS = {
  // Custom events for specific conversion types
  MEMBERSHIP_PURCHASE: 'MembershipPurchase',
  COURT_RESERVATION: 'CourtReservation',
  LESSON_BOOKING: 'LessonBooking',
  EVENT_REGISTRATION: 'EventRegistration',
} as const

export const trackMetaEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters)
  }
}

export const trackMetaCustomEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, parameters)
  }
}

// Primary conversion tracking for Meta
export const trackMetaConversion = (
  conversionType: keyof typeof META_CUSTOM_EVENTS,
  value: number,
  additionalData?: Record<string, any>
) => {
  // Track as standard Purchase event (for Meta's algorithm)
  trackMetaEvent('Purchase', {
    value: value,
    currency: 'MXN',
    content_type: conversionType,
    ...additionalData
  })

  // Also track as custom event for granular reporting
  trackMetaCustomEvent(META_CUSTOM_EVENTS[conversionType], {
    value: value,
    currency: 'MXN',
    ...additionalData
  })
}
```

#### 2.2 Meta Pixel Component
```tsx
// File: apps/web/components/analytics/meta-pixel.tsx

'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    fbq: (command: string, ...args: any[]) => void
    _fbq: any
  }
}

export default function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && window.fbq) {
      // Track page view
      window.fbq('track', 'PageView')
    }
  }, [pathname])

  if (!process.env.NEXT_PUBLIC_META_PIXEL_ID) {
    return null
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');

          fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
```

### Phase 3: Unified Analytics Provider

#### 3.1 Analytics Context Provider
```tsx
// File: apps/web/components/analytics/analytics-provider.tsx

'use client'

import { createContext, useContext, useEffect } from 'react'
import { trackEvent as trackGAEvent } from '@/lib/analytics/google-analytics'
import { trackMetaEvent, trackMetaCustomEvent } from '@/lib/analytics/meta-pixel'

interface AnalyticsContextType {
  trackEvent: (eventName: string, parameters?: Record<string, any>) => void
  trackConversion: (type: string, value?: number, currency?: string) => void
  trackUserAction: (action: string, category: string, label?: string, value?: number) => void
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    // Track in GA4
    trackGAEvent(eventName, parameters)

    // Map to Meta events where appropriate
    const metaEventMap: Record<string, string> = {
      'sign_up': 'CompleteRegistration',
      'membership_purchase': 'Purchase',
      'court_reservation_complete': 'Purchase',
      'lesson_booking_complete': 'Purchase',
      'event_registration_complete': 'Purchase',
      'begin_membership_checkout': 'InitiateCheckout',
      'begin_court_checkout': 'InitiateCheckout',
      'begin_lesson_checkout': 'InitiateCheckout',
      'begin_event_registration': 'InitiateCheckout',
      'contact_form_submit': 'Lead',
      'view_membership_plans': 'ViewContent',
      'view_court_availability': 'ViewContent',
      'view_lesson_options': 'ViewContent',
      'view_event_details': 'ViewContent',
    }

    const metaEvent = metaEventMap[eventName]
    if (metaEvent) {
      trackMetaEvent(metaEvent, parameters)
    }

    // Also track custom events for primary conversions
    if (['membership_purchase', 'court_reservation_complete', 'lesson_booking_complete', 'event_registration_complete'].includes(eventName)) {
      const customEventMap: Record<string, string> = {
        'membership_purchase': 'MembershipPurchase',
        'court_reservation_complete': 'CourtReservation',
        'lesson_booking_complete': 'LessonBooking',
        'event_registration_complete': 'EventRegistration',
      }
      trackMetaCustomEvent(customEventMap[eventName], parameters)
    }
  }

  const trackConversion = (type: 'membership' | 'court' | 'lesson' | 'event', value: number, additionalData?: Record<string, any>) => {
    const conversionData = {
      conversion_type: type,
      value: value,
      currency: 'MXN',
      timestamp: new Date().toISOString(),
      ...additionalData,
    }

    // Map conversion type to specific event
    const conversionEventMap = {
      'membership': 'membership_purchase',
      'court': 'court_reservation_complete',
      'lesson': 'lesson_booking_complete',
      'event': 'event_registration_complete',
    }

    // Track as specific GA4 conversion event
    trackGAEvent(conversionEventMap[type], conversionData)

    // Track as Meta Purchase event (standard conversion)
    trackMetaEvent('Purchase', {
      ...conversionData,
      content_type: type,
    })

    // Track as Meta custom event for granular reporting
    const customEventMap = {
      'membership': 'MembershipPurchase',
      'court': 'CourtReservation',
      'lesson': 'LessonBooking',
      'event': 'EventRegistration',
    }
    trackMetaCustomEvent(customEventMap[type], conversionData)
  }

  const trackUserAction = (
    action: string,
    category: string,
    label?: string,
    value?: number
  ) => {
    trackEvent('user_action', {
      action,
      category,
      label,
      value,
    })
  }

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackConversion, trackUserAction }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider')
  }
  return context
}
```

### Phase 4: Implementation in Key Components

#### 4.1 Membership Purchase Tracking
```tsx
// File: apps/web/components/membership/checkout-tracking.tsx

import { useAnalytics } from '@/components/analytics/analytics-provider'
import { trackMembershipPurchase } from '@/lib/analytics/google-analytics'

// In your membership checkout component
const { trackEvent, trackConversion } = useAnalytics()

// When user views membership plans
const handleViewPlans = () => {
  trackEvent('view_membership_plans', {
    page_location: 'membership_page',
  })
}

// When user selects a plan
const handleSelectPlan = (plan: any) => {
  trackEvent('select_membership_plan', {
    plan_id: plan.id,
    plan_name: plan.name,
    price: plan.price,
  })
}

// When checkout begins
const handleBeginCheckout = (membershipPlan: any) => {
  trackEvent('begin_membership_checkout', {
    item_id: membershipPlan.id,
    item_name: membershipPlan.name,
    price: membershipPlan.price,
    currency: 'MXN',
  })
}

// On successful membership purchase (PRIMARY CONVERSION #1)
const handleMembershipPurchaseComplete = (transactionData: any) => {
  // Track the conversion with full details
  trackConversion('membership', transactionData.amount, {
    transaction_id: transactionData.id,
    membership_type: transactionData.membershipName,
    membership_duration: transactionData.duration,
    user_id: transactionData.userId,
  })

  // Also use the specific tracking function
  trackMembershipPurchase({
    transaction_id: transactionData.id,
    membership_type: transactionData.membershipName,
    value: transactionData.amount,
  })
}
```

#### 4.2 Court Reservation Tracking
```tsx
// File: apps/web/components/reservations/court-reservation-tracking.tsx

import { useAnalytics } from '@/components/analytics/analytics-provider'
import { trackCourtReservation } from '@/lib/analytics/google-analytics'

const { trackEvent, trackConversion } = useAnalytics()

// When user views available courts
const handleViewAvailability = () => {
  trackEvent('view_court_availability', {
    date: selectedDate,
    time_range: timeRange,
  })
}

// When user selects a time slot
const handleSelectTime = (court: any, timeSlot: any) => {
  trackEvent('select_court_time', {
    court_number: court.number,
    date: timeSlot.date,
    time: timeSlot.time,
    duration: timeSlot.duration,
  })
}

// When checkout begins
const handleBeginReservation = (reservationDetails: any) => {
  trackEvent('begin_court_checkout', {
    court: reservationDetails.court,
    date: reservationDetails.date,
    time: reservationDetails.time,
    price: reservationDetails.price,
  })
}

// On successful court reservation (PRIMARY CONVERSION #2)
const handleReservationComplete = (reservationData: any) => {
  // Track the conversion
  trackConversion('court', reservationData.totalPrice, {
    reservation_id: reservationData.id,
    court_number: reservationData.courtNumber,
    date: reservationData.date,
    time: reservationData.time,
    duration_minutes: reservationData.duration,
    user_id: reservationData.userId,
  })

  // Also use specific tracking
  trackCourtReservation({
    reservation_id: reservationData.id,
    court_number: reservationData.courtNumber,
    duration_minutes: reservationData.duration,
    date: reservationData.date,
    time: reservationData.time,
    value: reservationData.totalPrice,
  })
}
```

#### 4.3 Lesson Booking Tracking
```tsx
// File: apps/web/components/lessons/lesson-booking-tracking.tsx

import { useAnalytics } from '@/components/analytics/analytics-provider'
import { trackLessonBooking } from '@/lib/analytics/google-analytics'

const { trackEvent, trackConversion } = useAnalytics()

// When user views lesson options
const handleViewLessons = () => {
  trackEvent('view_lesson_options', {
    category: lessonCategory,
  })
}

// When user selects a lesson type
const handleSelectLesson = (lesson: any) => {
  trackEvent('select_lesson_type', {
    lesson_id: lesson.id,
    lesson_type: lesson.type,
    instructor: lesson.instructor,
    price: lesson.price,
  })
}

// When booking begins
const handleBeginBooking = (lessonDetails: any) => {
  trackEvent('begin_lesson_checkout', {
    lesson_type: lessonDetails.type,
    date: lessonDetails.date,
    time: lessonDetails.time,
    price: lessonDetails.price,
  })
}

// On successful lesson booking (PRIMARY CONVERSION #3)
const handleLessonBookingComplete = (bookingData: any) => {
  // Track the conversion
  trackConversion('lesson', bookingData.price, {
    booking_id: bookingData.id,
    lesson_type: bookingData.lessonType,
    instructor: bookingData.instructor,
    date: bookingData.date,
    time: bookingData.time,
    user_id: bookingData.userId,
  })

  // Also use specific tracking
  trackLessonBooking({
    booking_id: bookingData.id,
    lesson_type: bookingData.lessonType,
    instructor: bookingData.instructor,
    date: bookingData.date,
    time: bookingData.time,
    value: bookingData.price,
  })
}
```

#### 4.4 Event Registration Tracking
```tsx
// File: apps/web/components/events/event-registration-tracking.tsx

import { useAnalytics } from '@/components/analytics/analytics-provider'
import { trackEventRegistration } from '@/lib/analytics/google-analytics'

const { trackEvent, trackConversion } = useAnalytics()

// When user views event details
const handleViewEvent = (event: any) => {
  trackEvent('view_event_details', {
    event_id: event.id,
    event_name: event.name,
    event_type: event.type,
    event_date: event.date,
  })
}

// When user selects event category/division
const handleSelectCategory = (category: any) => {
  trackEvent('select_event_category', {
    event_id: event.id,
    category: category.name,
    skill_level: category.skillLevel,
  })
}

// When registration begins
const handleBeginRegistration = (eventDetails: any) => {
  trackEvent('begin_event_registration', {
    event_name: eventDetails.name,
    event_type: eventDetails.type,
    category: eventDetails.category,
    price: eventDetails.registrationFee,
  })
}

// On successful event registration (PRIMARY CONVERSION #4)
const handleEventRegistrationComplete = (registrationData: any) => {
  // Track the conversion
  trackConversion('event', registrationData.fee, {
    registration_id: registrationData.id,
    event_name: registrationData.eventName,
    event_type: registrationData.eventType,
    event_date: registrationData.eventDate,
    category: registrationData.category,
    user_id: registrationData.userId,
  })

  // Also use specific tracking
  trackEventRegistration({
    registration_id: registrationData.id,
    event_name: registrationData.eventName,
    event_type: registrationData.eventType,
    date: registrationData.eventDate,
    value: registrationData.fee,
  })
}
```

#### 4.5 Contact Form Tracking (Lead Generation)
```tsx
// File: apps/web/components/forms/contact-form-tracking.tsx

import { useAnalytics } from '@/components/analytics/analytics-provider'

const { trackEvent } = useAnalytics()

const handleFormSubmit = async (formData: any) => {
  // Track form submission
  trackEvent('contact_form_submit', {
    form_type: 'contact',
    form_location: 'footer',
    user_type: formData.userType || 'prospect',
  })

  // Submit form...
}
```

#### 4.3 WhatsApp Click Tracking
```tsx
// File: apps/web/components/whatsapp-button-tracking.tsx

import { useAnalytics } from '@/components/analytics/analytics-provider'

const { trackEvent } = useAnalytics()

const handleWhatsAppClick = () => {
  trackEvent('whatsapp_click', {
    button_location: 'floating',
    page: window.location.pathname,
  })

  // Open WhatsApp...
}
```

### Phase 5: UTM Parameter Strategy

#### 5.1 UTM Parameter Persistence
```typescript
// File: apps/web/lib/analytics/utm-tracker.ts

export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export class UTMTracker {
  private static STORAGE_KEY = 'utm_params'
  private static EXPIRY_DAYS = 30

  static captureUTMParams(): void {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const utmParams: UTMParams = {}

    // Capture all UTM parameters
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

    utmKeys.forEach(key => {
      const value = params.get(key)
      if (value) {
        utmParams[key as keyof UTMParams] = value
      }
    })

    // Store if we found any UTM parameters
    if (Object.keys(utmParams).length > 0) {
      this.storeUTMParams(utmParams)
    }
  }

  static storeUTMParams(params: UTMParams): void {
    const data = {
      params,
      timestamp: new Date().toISOString(),
      expiry: new Date(Date.now() + this.EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
  }

  static getUTMParams(): UTMParams | null {
    if (typeof window === 'undefined') return null

    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return null

    try {
      const data = JSON.parse(stored)

      // Check if expired
      if (new Date(data.expiry) < new Date()) {
        localStorage.removeItem(this.STORAGE_KEY)
        return null
      }

      return data.params
    } catch {
      return null
    }
  }

  static clearUTMParams(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.STORAGE_KEY)
  }
}
```

#### 5.2 UTM Attribution in Conversions
```typescript
// File: apps/web/lib/analytics/attribution.ts

import { UTMTracker } from './utm-tracker'

export const getAttributionData = () => {
  const utmParams = UTMTracker.getUTMParams()
  const referrer = document.referrer

  return {
    ...utmParams,
    referrer: referrer || 'direct',
    landing_page: window.location.pathname,
    timestamp: new Date().toISOString(),
  }
}

// Use in conversion tracking
export const trackConversionWithAttribution = (conversionData: any) => {
  const attribution = getAttributionData()

  const enhancedData = {
    ...conversionData,
    attribution,
  }

  // Send to analytics
  trackEvent('conversion', enhancedData)
}
```

### Phase 6: Campaign URL Structure

#### 6.1 URL Builder Guidelines

**Google Ads:**
```
https://thepickleco.mx/?utm_source=google&utm_medium=cpc&utm_campaign=membership_q1_2025&utm_term={keyword}&utm_content={adgroup}
```

**Meta (Facebook/Instagram) Ads:**
```
https://thepickleco.mx/?utm_source=facebook&utm_medium=paid_social&utm_campaign=brand_awareness_2025&utm_content={ad_name}
```

**Email Campaigns:**
```
https://thepickleco.mx/?utm_source=email&utm_medium=newsletter&utm_campaign=january_promo&utm_content=header_cta
```

**SEO/Organic:**
- No UTM parameters needed (tracked automatically)

### Phase 7: Implementation Steps

#### 7.1 Environment Variables
Add to `.env.local`:
```env
# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-PD9W10N1BM
NEXT_PUBLIC_META_PIXEL_ID=YOUR_META_PIXEL_ID_HERE
NEXT_PUBLIC_GTM_ID=GTM-XXXXXX # Optional: Google Tag Manager
```

#### 7.2 Update Root Layout
```tsx
// File: apps/web/app/layout.tsx

import GoogleAnalytics from '@/components/analytics/google-analytics'
import MetaPixel from '@/components/analytics/meta-pixel'
import { AnalyticsProvider } from '@/components/analytics/analytics-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
        <GoogleAnalytics />
        <MetaPixel />
      </body>
    </html>
  )
}
```

### Phase 8: Testing & Validation

#### 8.1 Testing Checklist
- [ ] GA4 Debug View shows all events
- [ ] Meta Pixel Helper extension validates pixel firing
- [ ] UTM parameters persist across page navigation
- [ ] Conversion events fire on:
  - [ ] Form submissions
  - [ ] Membership purchases
  - [ ] WhatsApp clicks
  - [ ] Reservation completions
- [ ] Attribution data included in conversion events
- [ ] No duplicate event firing
- [ ] Performance impact < 50ms

#### 8.2 Validation Tools
1. **Google Analytics:**
   - GA4 DebugView
   - GA4 Realtime Reports
   - Google Tag Assistant

2. **Meta:**
   - Meta Pixel Helper Chrome Extension
   - Facebook Events Manager
   - Test Events in Events Manager

### Phase 9: Conversion Configuration in Analytics Platforms

#### 9.1 Google Analytics 4 Conversion Setup

**Step 1: Mark Events as Conversions**
1. Go to GA4 Admin → Events
2. Find these events and toggle "Mark as conversion":
   - `membership_purchase`
   - `court_reservation_complete`
   - `lesson_booking_complete`
   - `event_registration_complete`

**Step 2: Set Conversion Values**
1. Go to Admin → Conversions
2. For each conversion, configure:
   - Counting method: "Once per event" (recommended for purchases)
   - Default value: Set average transaction values
   - Currency: MXN

**Step 3: Create Conversion Goals**
```javascript
// GA4 Configuration via gtag
gtag('event', 'conversion', {
  'send_to': 'G-PD9W10N1BM/conversion_id',
  'value': 1500.00,
  'currency': 'MXN',
  'transaction_id': '12345'
});
```

#### 9.2 Meta Business Manager Conversion Setup

**Step 1: Create Custom Conversions**
1. Go to Events Manager → Custom Conversions
2. Create four custom conversions:
   - Membership Purchase (URL contains: /membership/success OR custom event: MembershipPurchase)
   - Court Reservation (URL contains: /reservation/confirmation OR custom event: CourtReservation)
   - Lesson Booking (URL contains: /lesson/confirmed OR custom event: LessonBooking)
   - Event Registration (URL contains: /event/registered OR custom event: EventRegistration)

**Step 2: Set Attribution Windows**
- Click: 7-day click
- View: 1-day view
- Recommended for services with consideration period

**Step 3: Configure Conversion Values**
```javascript
// Dynamic value tracking
fbq('track', 'Purchase', {
  value: 1500.00,
  currency: 'MXN',
  content_type: 'membership',
  content_ids: ['membership_123'],
  num_items: 1
});
```

#### 9.3 Conversion Tracking Validation

**Testing Checklist:**
```bash
# 1. Test each conversion path:
- [ ] Complete a test membership purchase
- [ ] Make a test court reservation
- [ ] Book a test lesson
- [ ] Register for a test event

# 2. Verify in GA4 DebugView:
- [ ] Events fire with correct parameters
- [ ] Conversion value is captured
- [ ] User properties are set

# 3. Verify in Meta Events Manager:
- [ ] Test events show in real-time
- [ ] Parameters match expected schema
- [ ] Conversions are attributed correctly

# 4. Check data layer:
console.log(window.dataLayer); // Should show conversion events
console.log(fbq.getState()); // Should show pixel state
```

### Phase 10: Dashboard & Reporting

#### 10.1 Key Metrics to Track

**Traffic Sources:**
- Organic search traffic
- Paid search (Google Ads)
- Social media (paid & organic)
- Direct traffic
- Referral traffic

**User Behavior:**
- Page views & unique visitors
- Session duration
- Bounce rate
- Pages per session
- User flow

**Primary Conversions (Revenue Generating):**
1. **Membership Purchases**
   - Total conversions
   - Conversion rate
   - Average order value
   - Revenue by membership type

2. **Court Reservations**
   - Total bookings
   - Booking conversion rate
   - Average reservation value
   - Peak booking times

3. **Lesson Bookings**
   - Total lessons booked
   - Conversion rate by lesson type
   - Average lesson value
   - Instructor performance

4. **Event Registrations**
   - Total registrations
   - Registration rate by event
   - Average registration fee
   - Event category performance

**Secondary Conversions (Lead Generation):**
- Contact form submissions
- WhatsApp interactions
- Newsletter signups
- Waitlist joins

**Attribution:**
- First-touch attribution
- Last-touch attribution
- Multi-touch attribution
- Time to conversion

#### 9.2 Custom Reports Setup

**Google Analytics 4:**
1. Acquisition reports by UTM parameters
2. Conversion path analysis
3. User lifetime value reports
4. Custom audiences for remarketing

**Meta Business Manager:**
1. Custom conversions setup
2. Audience creation based on events
3. Attribution window configuration
4. ROAS tracking

### Phase 10: Privacy & Compliance

#### 10.1 Cookie Consent
```tsx
// File: apps/web/components/cookie-consent.tsx

'use client'

import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setShowBanner(false)
    // Enable analytics
    window.gtag?.('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'granted'
    })
  }

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected')
    setShowBanner(false)
    // Disable analytics
    window.gtag?.('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied'
    })
  }

  if (!showBanner) return null

  return (
    <div className="cookie-consent-banner">
      {/* Banner UI */}
    </div>
  )
}
```

#### 10.2 Privacy Policy Updates
- Add analytics data collection disclosure
- Specify data retention periods
- Include opt-out instructions
- List third-party services used

### Implementation Timeline

**Week 1:**
- Set up Meta Pixel account
- Implement enhanced GA4 tracking
- Add Meta Pixel to website
- Test basic page view tracking

**Week 2:**
- Implement conversion tracking
- Add UTM parameter persistence
- Set up custom events
- Test with staging environment

**Week 3:**
- Deploy to production
- Configure custom reports
- Set up conversion goals
- Train team on dashboards

**Week 4:**
- Monitor and optimize
- Fine-tune events
- Create remarketing audiences
- Document best practices

### Success Metrics

**Technical Success:**
- 100% page view tracking accuracy
- < 5% data sampling in reports
- All conversion events firing correctly
- UTM parameters properly attributed

**Business Success:**
- Identify top traffic sources
- Calculate CAC by channel
- Measure ROAS for paid campaigns
- Optimize marketing spend allocation

### Maintenance & Optimization

**Monthly Tasks:**
- Review tracking accuracy
- Update conversion values
- Audit custom events
- Check for tracking errors

**Quarterly Tasks:**
- Review attribution models
- Update remarketing audiences
- Optimize page load performance
- Audit privacy compliance

### Resources & Documentation

**Google Analytics:**
- [GA4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [Enhanced E-commerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

**Meta Pixel:**
- [Meta Pixel Setup](https://www.facebook.com/business/help/952192354843755)
- [Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Event Reference](https://developers.facebook.com/docs/meta-pixel/reference)

**Next.js Specific:**
- [Next.js Analytics](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)
- [Third-party Scripts](https://nextjs.org/docs/app/building-your-application/optimizing/scripts)

---

## Next Steps

1. **Obtain Meta Pixel ID** from Facebook Business Manager
2. **Review and approve** this implementation plan
3. **Create development branch** for analytics implementation
4. **Implement Phase 1-3** (Core tracking setup)
5. **Test in staging** environment
6. **Deploy to production** after validation
7. **Configure dashboards** and reports
8. **Train team** on analytics tools

This implementation will provide comprehensive tracking of user behavior, marketing attribution, and conversion data to optimize your marketing strategy and improve ROI.