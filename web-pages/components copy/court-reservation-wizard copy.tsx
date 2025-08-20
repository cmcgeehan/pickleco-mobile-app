'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Calendar } from './ui/calendar'
import { Button } from './ui/button'
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from './ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'
import { Label } from './ui/label'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { CheckoutModal } from '@/components/checkout-modal'
import { useAuthStore } from '@/contexts/auth'
import { useLanguage } from '@/contexts'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import { useTranslations } from '@/hooks/use-translations'
import type { Route } from 'next'
import { WaiverModal } from '@/components/waiver-modal'
import { useSupabase } from '@/hooks/use-supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { getInitializedClient } from '@/lib/supabase-simple'
import { hasFreeAccess } from '@/lib/roles'

type DbCourt = Database['public']['Tables']['courts']['Row']

interface Court extends DbCourt {
  calendarId: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  availableCourts: Court[];
}

interface EventCourt {
  id: string
  event_id: string
  court_id: string
  created_at: string
}

interface Event {
  id: string
  start_time: string
  end_time: string
  event_courts?: {
    court_id: string
  }[]
}

interface TimeRange {
  startTime: string
  endTime: string
}

const MAX_HOURS = 4

const AVAILABLE_TIMES = [
  { startTime: '06:00', endTime: '07:00', availableCourts: [] },
  { startTime: '07:00', endTime: '08:00', availableCourts: [] },
  { startTime: '08:00', endTime: '09:00', availableCourts: [] },
  { startTime: '09:00', endTime: '10:00', availableCourts: [] },
  { startTime: '10:00', endTime: '11:00', availableCourts: [] },
  { startTime: '11:00', endTime: '12:00', availableCourts: [] },
  { startTime: '12:00', endTime: '13:00', availableCourts: [] },
  { startTime: '13:00', endTime: '14:00', availableCourts: [] },
  { startTime: '14:00', endTime: '15:00', availableCourts: [] },
  { startTime: '15:00', endTime: '16:00', availableCourts: [] },
  { startTime: '16:00', endTime: '17:00', availableCourts: [] },
  { startTime: '17:00', endTime: '18:00', availableCourts: [] },
  { startTime: '18:00', endTime: '19:00', availableCourts: [] },
  { startTime: '19:00', endTime: '20:00', availableCourts: [] },
  { startTime: '20:00', endTime: '21:00', availableCourts: [] },
  { startTime: '21:00', endTime: '22:00', availableCourts: [] }
] as TimeSlot[]

interface CourtReservationWizardProps { 
  onClose?: () => void;
  locationId: string;
  userMembershipLocationId: string | null;
  locations?: Array<{ id: string; name: string }>;
  supabase: SupabaseClient<Database, "public", any> | null;
}

type User = Database['public']['Tables']['users']['Row'] & {
  role: 'admin' | 'coach' | 'member' | 'guest'
}

export function CourtReservationWizard({ 
  onClose,
  locationId,
  userMembershipLocationId,
  locations = [],
  supabase
}: CourtReservationWizardProps) {
  const { t } = useTranslations()
  const { language } = useLanguage()
  const { user, isAdmin, isCoach } = useAuthStore()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [selectedTime, setSelectedTime] = useState<TimeSlot | undefined>(undefined)
  const [selectedCourt, setSelectedCourt] = useState<Court | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(AVAILABLE_TIMES.map(slot => ({ ...slot, isAvailable: false })))
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [reservationCost, setReservationCost] = useState(0)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState(locationId)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string }>>([])

  const fetchUserProfile = useCallback(async () => {
    if (!supabase || !user?.id) return null;
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id as any)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    // Ensure required fields are present and convert to User type
    if (!profile?.email || !profile?.first_name || !profile?.last_name || !profile?.role || 
        profile?.has_signed_waiver === null || profile?.email_notifications === null || 
        profile?.sms_notifications === null || profile?.whatsapp_notifications === null) {
      console.error('Missing required user fields');
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone || undefined,
      role: profile.role,
      has_signed_waiver: profile.has_signed_waiver,
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || undefined,
      email_notifications: profile.email_notifications,
      sms_notifications: profile.sms_notifications,
      whatsapp_notifications: profile.whatsapp_notifications
    } as User;
  }, [supabase, user?.id])

  useEffect(() => {
    if (supabase && user?.id) {
      fetchUserProfile().then(profile => {
        if (profile) {
          setUserProfile(profile as unknown as User);
        }
      });
    }
  }, [user?.id, supabase, fetchUserProfile]);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!user?.id) return

      try {
        const response = await fetch('/api/payment-methods')
        if (!response.ok) throw new Error('Failed to fetch payment methods')
        
        const data = await response.json()
        setPaymentMethods(data.paymentMethods)
        
        // If there's only one payment method, select it automatically
        if (data.paymentMethods.length === 1) {
          setSelectedPaymentMethod(data.paymentMethods[0].id)
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error)
        toast({
          title: t('errors', 'errorFetchingPaymentMethods'),
          description: t('errors', 'tryAgainLater'),
          variant: 'destructive'
        })
      }
    }

    if (showCheckout) {
      fetchPaymentMethods()
    }
  }, [showCheckout, user?.id, t])

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ?? null)
    setSelectedTime(undefined)
    setSelectedCourt(undefined)
    setSelectedTimeRange([])
  }

  const checkCourtAvailability = useCallback(async () => {
    if (!selectedDate || !supabase || !selectedLocationId) return
    
    setIsCheckingAvailability(true)
    try {
      // First get the location details including launch date
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', selectedLocationId)
        .single()

      if (locationError) {
        console.error('Error fetching location:', locationError)
        return
      }

      // Check if the location has launched
      if (locationData.launch_date) {
        const launchDate = new Date(locationData.launch_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (today < launchDate) {
          setTimeSlots(AVAILABLE_TIMES.map(slot => ({ ...slot, isAvailable: false })))
          toast({
            title: t('errors', 'locationNotLaunched'),
            description: t('errors', 'locationLaunchDateMessage', { date: format(launchDate, 'PPP', { locale: language === 'es' ? es : enUS }) }),
            variant: 'destructive'
          })
          setIsCheckingAvailability(false)
          return
        }
      }

      // Fetch courts for the selected location
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .eq('location_id', selectedLocationId)
        .is('deleted_at', null)

      if (courtsError) {
        console.error('Error fetching courts:', courtsError)
        return
      }

      setCourts(courtsData || [])

      // Then fetch events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*, event_courts(*)')
        .eq('location_id', selectedLocationId)
        .gte('start_time', selectedDate.toISOString())
        .lte('start_time', new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .is('deleted_at', null)

      if (eventsError) {
        console.error('Error checking court availability:', eventsError)
        setTimeSlots(AVAILABLE_TIMES.map(slot => ({ ...slot, isAvailable: false })))
        return
      }

      // Update available time slots based on events
      const updatedTimeSlots = AVAILABLE_TIMES.map(time => {
        const timeSlotStart = new Date(selectedDate)
        const [hours, minutes] = time.startTime.split(':')
        timeSlotStart.setHours(parseInt(hours), parseInt(minutes))
        
        // Get all courts that are available for this time slot
        const availableCourts = courtsData?.filter(court => {
          // Check if the court is booked in any event during this time slot
          return !events.some(event => {
            const eventStart = new Date(event.start_time)
            const eventEnd = new Date(event.end_time)
            const isTimeOverlap = timeSlotStart >= eventStart && timeSlotStart < eventEnd
            
            if (!isTimeOverlap) return false

            // Check if this court is used in the event
            return event.event_courts?.some((ec: { court_id: string }) => ec.court_id === court.id)
          })
        }) || []

        return {
          ...time,
          isAvailable: availableCourts.length > 0,
          availableCourts
        }
      })

      setTimeSlots(updatedTimeSlots)
    } catch (error) {
      console.error('Error checking availability:', error)
      setTimeSlots(AVAILABLE_TIMES.map(slot => ({ ...slot, isAvailable: false })))
    } finally {
      setIsCheckingAvailability(false)
    }
  }, [selectedDate, supabase, selectedLocationId, t, language])

  useEffect(() => {
    if (selectedDate) {
      checkCourtAvailability()
    }
  }, [selectedDate, checkCourtAvailability])

  // Reset time slots and check availability when location changes
  useEffect(() => {
    setSelectedTime(undefined)
    setSelectedCourt(undefined)
    setSelectedTimeRange([])
    setTimeSlots(AVAILABLE_TIMES.map(slot => ({ ...slot, isAvailable: false })))
    if (selectedDate) {
      checkCourtAvailability()
    }
  }, [selectedLocationId, checkCourtAvailability, selectedDate])

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    setSelectedTime(timeSlot)
    setSelectedCourt(undefined)
  }

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court)
  }

  const handleReservationSubmit = useCallback(async () => {
    if (!supabase || !selectedDate || !selectedTimeRange.length || !selectedCourt || !user?.id || !selectedLocationId) {
      return
    }

    setIsLoading(true)

    try {
      // Create the reservation
      const response = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          courtId: selectedCourt.id,
          date: selectedDate.toISOString().split('T')[0],
          startTime: selectedTimeRange[0].startTime,
          endTime: selectedTimeRange[selectedTimeRange.length - 1].endTime,
          locationId: selectedLocationId,
          // Skip payment if admin or coach
          skipPayment: isAdmin || isCoach
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create reservation')
      }

      toast({
        title: t('common', 'success'),
        description: t('common', 'reservation_confirmed'),
      })

      // Reset form
      setSelectedDate(null)
      setSelectedTimeRange([])
      setSelectedCourt(undefined)
      
      // Close modal
      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Error creating reservation:', error)
      toast({
        title: t('common', 'error'),
        description: error instanceof Error ? error.message : t('common', 'error_creating_reservation'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedCourt, selectedDate, selectedTimeRange, user?.id, supabase, t, onClose, isAdmin, isCoach, selectedLocationId])

  const handlePaymentSuccess = async () => {
    if (!supabase) {
      toast({
        title: t('common', 'error'),
        description: t('common', 'error_confirming_reservation'),
        variant: 'destructive',
      })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/courts/confirm-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          courtId: selectedCourt?.id,
          locationId: locationId,
          date: selectedDate?.toISOString().split('T')[0],
          startTime: selectedTimeRange[0]?.startTime,
          endTime: selectedTimeRange[0]?.endTime,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to confirm reservation')
      }

      toast({
        title: t('common', 'success'),
        description: t('common', 'reservation_confirmed'),
      })

      // Reset the form
      setSelectedDate(null)
      setSelectedTimeRange([])
      setSelectedCourt(undefined)
      setShowCheckout(false)

      // Close the modal
      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Error confirming reservation:', error)
      toast({
        title: t('common', 'error'),
        description: error instanceof Error ? error.message : t('common', 'error_confirming_reservation'),
        variant: 'destructive',
      })
    }
  }

  const getHourCount = (ranges: TimeRange[]) => {
    return ranges.reduce((total, range) => {
      const start = parseInt(range.startTime)
      const end = parseInt(range.endTime)
      return total + (end - start)
    }, 0)
  }

  const isPastTimeSlot = (slot: TimeSlot) => {
    if (!selectedDate) return false
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDateStart = new Date(selectedDate)
    selectedDateStart.setHours(0, 0, 0, 0)

    // Only check for past hours if it's today
    if (selectedDateStart.getTime() === today.getTime()) {
      const currentHour = now.getHours()
      const slotHour = parseInt(slot.startTime)
      return slotHour < currentHour
    }
    return false
  }

  const isSequentialSelection = (slot: TimeSlot) => {
    if (selectedTimeRange.length === 0) return true
    const startHour = parseInt(slot.startTime)
    return selectedTimeRange.some(range => {
      const rangeStart = parseInt(range.startTime)
      const rangeEnd = parseInt(range.endTime)
      return startHour === rangeStart - 1 || startHour === rangeEnd
    })
  }

  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;

    const isSelected = selectedTimeRange.some(range => {
      const rangeStartHour = parseInt(range.startTime)
      const rangeEndHour = parseInt(range.endTime)
      const slotHour = parseInt(slot.startTime)
      return slotHour >= rangeStartHour && slotHour < rangeEndHour
    })

    if (isSelected) {
      // Deselect this slot and any slots after it
      setSelectedTimeRange(current => {
        const selectedHours = new Set(
          current.flatMap(range => {
            const start = parseInt(range.startTime)
            const end = parseInt(range.endTime)
            return Array.from({ length: end - start }, (_, i) => start + i)
          })
        )

        const deselectedHour = parseInt(slot.startTime)
        const updatedHours = Array.from(selectedHours)
          .filter(hour => hour < deselectedHour)
          .sort((a, b) => a - b)

        if (updatedHours.length === 0) return []

        return [{
          startTime: updatedHours[0].toString().padStart(2, '0') + ':00',
          endTime: (updatedHours[updatedHours.length - 1] + 1).toString().padStart(2, '0') + ':00'
        }]
      })
    } else {
      // Select this slot
      setSelectedTimeRange(current => {
        if (current.length === 0) {
          return [{
            startTime: slot.startTime,
            endTime: slot.endTime
          }]
        }

        const selectedHours = new Set(
          current.flatMap(range => {
            const start = parseInt(range.startTime)
            const end = parseInt(range.endTime)
            return Array.from({ length: end - start }, (_, i) => start + i)
          })
        )

        if (selectedHours.size >= MAX_HOURS) return current

        const startHour = parseInt(slot.startTime)
        if (isSequentialSelection(slot)) {
          selectedHours.add(startHour)
          const sortedHours = Array.from(selectedHours).sort((a, b) => a - b)
          return [{
            startTime: sortedHours[0].toString().padStart(2, '0') + ':00',
            endTime: (sortedHours[sortedHours.length - 1] + 1).toString().padStart(2, '0') + ':00'
          }]
        }

        return [{
          startTime: slot.startTime,
          endTime: slot.endTime
        }]
      })
    }
    setSelectedTime(slot)
  }

  const handleWaiverAccepted = async () => {
    if (!user?.id || !supabase) {
      toast({
        title: t('common', 'error'),
        description: t('common', 'error_updating_waiver'),
        variant: 'destructive',
      })
      return
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Failed to get session')
      }

      console.log('Submitting waiver acceptance for user:', user.id)
      const response = await fetch('/api/users/waiver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      console.log('Waiver API response status:', response.status)
      const data = await response.json()
      console.log('Waiver API response data:', data)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User profile not found. Please try logging out and back in.')
        }
        throw new Error(data.error || 'Failed to update waiver status')
      }

      if (!data.profile) {
        throw new Error('No profile data returned from server')
      }

      console.log('Updating user profile with waiver status')
              setUserProfile(data.profile as unknown as User)
      setShowWaiverModal(false)

      // Proceed with the reservation
      console.log('Proceeding with reservation, user role:', data.profile.role)
      if (hasFreeAccess(data.profile.role)) {
        handlePaymentSuccess()
      } else {
        setShowCheckout(true)
      }
    } catch (error) {
      console.error('Error updating waiver status:', error)
      toast({
        title: t('common', 'error'),
        description: error instanceof Error ? error.message : t('common', 'error_updating_waiver'),
        variant: "destructive",
      })
    }
  }

  const fetchCourts = useCallback(async () => {
    if (!supabase) {
      console.error('No Supabase client available');
      return [];
    }

    const { data: allCourts, error } = await supabase
      .from('courts')
      .select('*');

    if (error) {
      console.error('Error fetching courts:', error);
      return [];
    }

    return (allCourts || []).map(court => ({
      ...court,
      calendarId: String(court.id)
    }));
  }, [supabase])

  useEffect(() => {
    fetchCourts()
  }, [fetchCourts])

  // Show loading state while Supabase is initializing
  if (!supabase) {
    return (
      <div className="space-y-6">
        <div className="text-2xl font-semibold text-center">
          {t('common', 'reserveCourt')}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="max-w-sm">
              <Label htmlFor="location">{t('common', 'selectLocation')}</Label>
              <Select
                value={selectedLocationId}
                onValueChange={(value) => setSelectedLocationId(value)}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder={t('common', 'selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLocationId && (
              <div className="flex flex-col sm:flex-row sm:space-x-4 md:space-x-6 lg:space-x-8 space-y-4 sm:space-y-0">
                <div className="sm:w-[350px] flex-shrink-0">
                  <h3 className="mb-2 font-semibold">{t('reservations', 'selectDate')}</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    defaultMonth={selectedDate ?? new Date()}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return date < today
                    }}
                    initialFocus
                    locale={language === 'es' ? es : undefined}
                    className="rounded-md border"
                    classNames={{
                      day_selected: "bg-primary text-white focus:bg-primary focus:text-primary-foreground rounded-md",
                    }}
                  />
                </div>

                <div className="flex-1 min-w-[200px] space-y-8">
                  {selectedDate && (
                    <div>
                      <h3 className="mb-2 font-semibold">{t('reservations', 'selectTimeSlots')}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {timeSlots.map((slot) => {
                          const isSelected = selectedTimeRange.some(range => {
                            const rangeStartHour = parseInt(range.startTime)
                            const rangeEndHour = parseInt(range.endTime)
                            const slotHour = parseInt(slot.startTime)
                            return slotHour >= rangeStartHour && slotHour < rangeEndHour
                          })

                          const isDisabled = 
                            isPastTimeSlot(slot) ||
                            (!isSequentialSelection(slot) && !isSelected && selectedTimeRange.length > 0) || 
                            (getHourCount(selectedTimeRange) >= MAX_HOURS && !isSelected)

                          // Create a date object for the time slot
                          const timeDate = new Date(selectedDate)
                          timeDate.setHours(parseInt(slot.startTime), 0, 0, 0)

                          return (
                            <Button
                              key={slot.startTime}
                              variant="outline"
                              className={cn(
                                "h-12",
                                isSelected && "bg-primary text-white border-primary hover:bg-primary hover:border-primary hover:text-white",
                                (!slot.isAvailable || isDisabled) && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!slot.isAvailable || isDisabled}
                              onClick={() => handleTimeSlotClick(slot)}
                            >
                              {format(timeDate, 'h:mm a')}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedTimeRange.length > 0 && (
                    <div>
                      <h3 className="mb-2 font-semibold">{t('courts', 'selectCourt')}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 relative">
                        {isCheckingAvailability && (
                          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-md">
                            <div className="animate-pulse text-sm text-gray-500">
                              {t('common', 'checkingAvailability')}
                            </div>
                          </div>
                        )}
                        {courts.map((court) => {
                          // Check if the court is available for all selected time slots
                          const isAvailable = selectedTimeRange.length > 0 && timeSlots
                            .filter(slot => {
                              const slotHour = parseInt(slot.startTime);
                              return selectedTimeRange.some(range => {
                                const rangeStartHour = parseInt(range.startTime);
                                const rangeEndHour = parseInt(range.endTime);
                                return slotHour >= rangeStartHour && slotHour < rangeEndHour;
                              });
                            })
                            .every(slot => slot.availableCourts.some(ac => ac.id === court.id));
                          
                          const isSelected = selectedCourt?.id === court.id;
                          
                          return (
                            <Button
                              key={court.id}
                              variant="outline"
                              className={cn(
                                "h-12",
                                isSelected && "bg-primary text-white border-primary hover:bg-primary hover:border-primary hover:text-white",
                                !isAvailable && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!isAvailable || isCheckingAvailability}
                              onClick={() => handleCourtSelect(court)}
                            >
                              {court.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>{t('common', 'cancel')}</Button>
          <Button 
            className="text-white"
            onClick={handleReservationSubmit} 
            disabled={!selectedDate || selectedTimeRange.length === 0 || !selectedCourt || isLoading}
          >
            {isLoading ? t('common', 'creatingReservation') : 
             (isAdmin || isCoach) ? t('common', 'createReservation') : 
             t('reservations', 'submitReservation')}
          </Button>
        </CardFooter>
      </Card>

      {showWaiverModal && (
        <WaiverModal
          isOpen={true}
          onClose={() => setShowWaiverModal(false)}
          onAccept={handleWaiverAccepted}
          user={userProfile}
        />
      )}
      {showCheckout && !isAdmin && !isCoach && (
        <CheckoutModal
          isOpen={true}
          onClose={() => setShowCheckout(false)}
          amount={reservationCost}
          onSuccess={handlePaymentSuccess}
          selectedPaymentMethod={selectedPaymentMethod ?? undefined}
          metadata={{
            userId: user?.id ?? '',
            type: 'court_reservation',
            courtId: selectedCourt?.id ?? '',
            date: selectedDate?.toISOString().split('T')[0] ?? '',
            startTime: selectedTimeRange[0]?.startTime ?? '',
            endTime: selectedTimeRange[0]?.endTime ?? '',
            hours: selectedTimeRange.length
          }}
        />
      )}
    </div>
  )
}

export default CourtReservationWizard