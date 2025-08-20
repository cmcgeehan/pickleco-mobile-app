import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '@/stores/authStore';
import WaiverModal from './WaiverModal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { calculateCourtPrice, PricingCalculation, calculateSingleHourPricing } from '@/lib/pricing';

const { width, height } = Dimensions.get('window');

interface Court {
  id: string;
  name: string;
  location_id: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  price?: number;
  courts?: Court[]; // For "any court" flow - available courts for this time slot
}

interface CourtReservationWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AVAILABLE_TIMES = [
  { startTime: '08:00', endTime: '09:00', available: true, price: 2500 },
  { startTime: '09:00', endTime: '10:00', available: true, price: 2500 },
  { startTime: '10:00', endTime: '11:00', available: true, price: 2500 },
  { startTime: '11:00', endTime: '12:00', available: true, price: 2500 },
  { startTime: '12:00', endTime: '13:00', available: true, price: 2500 },
  { startTime: '13:00', endTime: '14:00', available: true, price: 2500 },
  { startTime: '14:00', endTime: '15:00', available: true, price: 2500 },
  { startTime: '15:00', endTime: '16:00', available: true, price: 2500 },
  { startTime: '16:00', endTime: '17:00', available: true, price: 2500 },
  { startTime: '17:00', endTime: '18:00', available: true, price: 2500 },
  { startTime: '18:00', endTime: '19:00', available: true, price: 2500 },
  { startTime: '19:00', endTime: '20:00', available: true, price: 2500 },
];

export default function CourtReservationWizard({
  visible,
  onClose,
  onSuccess,
}: CourtReservationWizardProps) {
  const { user, session, profile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [anyCourtSelected, setAnyCourtSelected] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(AVAILABLE_TIMES);
  const [isLoading, setIsLoading] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [needsWaiver, setNeedsWaiver] = useState(false);
  const [adjacentHours, setAdjacentHours] = useState<{
    hourBefore?: TimeSlot;
    hourAfter?: TimeSlot;
  }>({});
  const [pricing, setPricing] = useState<PricingCalculation>({
    basePrice: 0,
    discountAmount: 0,
    finalPrice: 0,
    discountPercentage: 0,
    membershipType: 'No Membership'
  });
  const [addHourPricing, setAddHourPricing] = useState<{
    basePrice: number;
    finalPrice: number;
    discountAmount: number;
    discountPercentage: number;
  }>({
    basePrice: 0,
    finalPrice: 0,
    discountAmount: 0,
    discountPercentage: 0
  });

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setStep(1);
      setSelectedCourt(null);
      setAnyCourtSelected(false);
      setSelectedDate('');
      setSelectedTimeSlots([]);
      
      // Check if user needs to sign waiver
      if (profile && !profile.has_signed_waiver) {
        setNeedsWaiver(true);
      } else {
        setNeedsWaiver(false);
      }
      
      loadCourts();
    }
  }, [visible, user]);

  // Check adjacent hours availability when we have all required selections
  useEffect(() => {
    const isCheckoutStep = (step === 4 && !anyCourtSelected) || (step === 5 && anyCourtSelected);
    console.log('Adjacent hours check:', {
      step,
      anyCourtSelected,
      isCheckoutStep,
      selectedTimeSlots: selectedTimeSlots.length,
      selectedDate: !!selectedDate,
      selectedCourt: !!selectedCourt,
      shouldCheck: isCheckoutStep && selectedTimeSlots.length > 0 && selectedDate && selectedCourt
    });
    
    if (isCheckoutStep && selectedTimeSlots.length > 0 && selectedDate && selectedCourt) {
      checkAdjacentHoursAvailability();
    } else {
      setAdjacentHours({});
    }
  }, [step, selectedTimeSlots, selectedDate, selectedCourt, anyCourtSelected]);

  // Debug connectivity
  useEffect(() => {
    if (visible && user) {
      console.log('Court wizard opened for user:', user.id);
    }
  }, [visible, user]);

  const loadCourts = async () => {
    if (!user) {
      console.log('No user available for loading courts');
      return;
    }

    console.log('Loading courts from Supabase...');
    
    try {
      const { data: courts, error } = await supabase
        .from('courts')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) {
        console.error('Supabase error loading courts:', error);
        throw error;
      }

      console.log('Courts data received from Supabase:', courts);
      setCourts(courts || []);
    } catch (error) {
      console.error('Error loading courts:', error);
      setCourts([]);
      Alert.alert('Error', 'Failed to load courts. Please try again.');
    }
  };

  // Calculate pricing based on selected court and time slots
  const updatePricing = useCallback(async () => {
    if (!user || selectedTimeSlots.length === 0) {
      setPricing({
        basePrice: 0,
        discountAmount: 0,
        finalPrice: 0,
        discountPercentage: 0,
        membershipType: 'No Membership'
      });
      return;
    }

    try {
      // Use base court rate from the first time slot (they should all have the same rate)
      const courtHourlyRate = selectedTimeSlots[0]?.price ? (selectedTimeSlots[0].price / 100) : 25; // Default to $25 if no price
      const durationHours = selectedTimeSlots.length;
      
      const pricingCalculation = await calculateCourtPrice(
        user.id,
        courtHourlyRate,
        durationHours
      );
      
      console.log('Court pricing calculation:', pricingCalculation);
      setPricing(pricingCalculation);
    } catch (error) {
      console.error('Error calculating court pricing:', error);
      const basePrice = selectedTimeSlots.reduce((total, slot) => total + (slot.price || 2500), 0) / 100;
      setPricing({
        basePrice,
        discountAmount: 0,
        finalPrice: basePrice,
        discountPercentage: 0,
        membershipType: 'Error calculating discount'
      });
    }
  }, [user, selectedTimeSlots]);

  // Update pricing when time slots change
  useEffect(() => {
    updatePricing();
  }, [updatePricing]);

  // Calculate add hour pricing for buttons
  const updateAddHourPricing = useCallback(async () => {
    if (!user || selectedTimeSlots.length === 0) {
      setAddHourPricing({
        basePrice: 0,
        finalPrice: 0,
        discountAmount: 0,
        discountPercentage: 0
      });
      return;
    }

    try {
      // Use base court rate from the first time slot
      const courtHourlyRate = selectedTimeSlots[0]?.price ? (selectedTimeSlots[0].price / 100) : 25;
      const result = await calculateSingleHourPricing(user.id, courtHourlyRate, 'court');
      setAddHourPricing(result);
    } catch (error) {
      console.error('Error calculating add hour pricing:', error);
      const courtHourlyRate = selectedTimeSlots[0]?.price ? (selectedTimeSlots[0].price / 100) : 25;
      setAddHourPricing({
        basePrice: courtHourlyRate,
        finalPrice: courtHourlyRate,
        discountAmount: 0,
        discountPercentage: 0
      });
    }
  }, [user, selectedTimeSlots]);

  // Update add hour pricing when time slots change
  useEffect(() => {
    updateAddHourPricing();
  }, [updateAddHourPricing]);

  const checkAvailability = async (date: string) => {
    if (!user) return;

    setIsLoading(true);
    console.log('Checking court availability for date:', date);
    
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all events/reservations for the selected date
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          event_courts (
            court_id
          )
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .is('deleted_at', null);

      if (error) {
        console.error('Error checking availability:', error);
        throw error;
      }

      console.log('Events data received:', events);

      // For now, use default time slots (could be enhanced to show actual availability)
      setTimeSlots(AVAILABLE_TIMES);
    } catch (error) {
      console.error('Error checking availability:', error);
      setTimeSlots(AVAILABLE_TIMES); // Fallback to default times
    } finally {
      setIsLoading(false);
    }
  };

  const checkAvailabilityAllCourts = async (date: string) => {
    if (!user) return;

    setIsLoading(true);
    console.log('Checking availability for all courts on date:', date);
    
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all events/reservations for all courts on the selected date
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          event_courts (
            court_id
          )
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .is('deleted_at', null);

      if (error) {
        console.error('Error checking availability for all courts:', error);
        throw error;
      }

      console.log('All courts availability data received:', events);

      // Create a map of busy courts for each time slot
      const busyCourts = new Map<string, Set<string>>();
      
      events?.forEach(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        
        // Check which time slots this event overlaps with
        AVAILABLE_TIMES.forEach(slot => {
          const slotStart = new Date(date);
          const [startHours, startMinutes] = slot.startTime.split(':');
          slotStart.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
          const slotEnd = new Date(date);
          const [endHours, endMinutes] = slot.endTime.split(':');
          slotEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
          
          // Check if the event overlaps with this time slot
          if (eventStart < slotEnd && eventEnd > slotStart) {
            if (!busyCourts.has(slot.startTime)) {
              busyCourts.set(slot.startTime, new Set());
            }
            // Add all courts associated with this event
            event.event_courts?.forEach((ec: any) => {
              busyCourts.get(slot.startTime)?.add(ec.court_id);
            });
          }
        });
      });

      // Create time slots with available courts
      const timeSlotsWithCourts = AVAILABLE_TIMES.map(slot => {
        const busyCourtIds = busyCourts.get(slot.startTime) || new Set();
        const availableCourts = courts.filter(court => !busyCourtIds.has(court.id));
        
        return {
          ...slot,
          available: availableCourts.length > 0,
          courts: availableCourts
        };
      });

      setTimeSlots(timeSlotsWithCourts);
    } catch (error) {
      console.error('Error checking availability for all courts:', error);
      setTimeSlots(AVAILABLE_TIMES); // Fallback to default times
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (day: any) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    setSelectedTimeSlots([]);
    if (anyCourtSelected) {
      checkAvailabilityAllCourts(dateString);
    } else {
      checkAvailability(dateString);
    }
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    const isSelected = selectedTimeSlots.some(slot => slot.startTime === timeSlot.startTime);
    
    if (isSelected) {
      // Remove the time slot if already selected
      setSelectedTimeSlots(selectedTimeSlots.filter(slot => slot.startTime !== timeSlot.startTime));
      return;
    }
    
    // Check if we can add this time slot (max 3 hours, must be consecutive)
    if (selectedTimeSlots.length === 0) {
      // First selection
      setSelectedTimeSlots([timeSlot]);
    } else if (selectedTimeSlots.length < 3) {
      // Check if it's consecutive
      const newSlots = [...selectedTimeSlots, timeSlot].sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      if (isConsecutiveHours(newSlots)) {
        setSelectedTimeSlots(newSlots);
      } else {
        Alert.alert('Invalid Selection', 'Time slots must be consecutive. You can book up to 3 consecutive hours.');
        return;
      }
    } else {
      Alert.alert('Maximum Hours', 'You can book up to 3 consecutive hours maximum.');
      return;
    }
    
    // Handle court selection for "any court" mode
    if (anyCourtSelected && selectedTimeSlots.length === 0) {
      if (timeSlot.courts && timeSlot.courts.length === 1) {
        setSelectedCourt(timeSlot.courts[0]);
      } else if (timeSlot.courts && timeSlot.courts.length > 1) {
        setSelectedCourt(null);
      }
    }
  };

  const isConsecutiveHours = (slots: TimeSlot[]): boolean => {
    if (slots.length <= 1) return true;
    
    const sortedSlots = slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const prevTime = parseInt(sortedSlots[i - 1].startTime.split(':')[0]);
      const currentTime = parseInt(sortedSlots[i].startTime.split(':')[0]);
      
      if (currentTime !== prevTime + 1) {
        return false;
      }
    }
    
    return true;
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    setAnyCourtSelected(false);
    if (selectedDate) {
      checkAvailability(selectedDate);
    }
  };

  const checkAdjacentHoursAvailability = async () => {
    console.log('Checking adjacent hours availability...', {
      selectedTimeSlots: selectedTimeSlots.length,
      selectedDate,
      maxHours: selectedTimeSlots.length >= 3
    });
    
    if (!selectedTimeSlots.length || !selectedDate || selectedTimeSlots.length >= 3) {
      console.log('Early return from adjacent hours check');
      setAdjacentHours({});
      return;
    }

    try {
      const sortedSlots = selectedTimeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const firstSlot = sortedSlots[0];
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      
      // Find hour before and after
      const firstHour = parseInt(firstSlot.startTime.split(':')[0]);
      const lastHour = parseInt(lastSlot.startTime.split(':')[0]);
      
      const hourBefore = AVAILABLE_TIMES.find(slot => parseInt(slot.startTime.split(':')[0]) === firstHour - 1);
      const hourAfter = AVAILABLE_TIMES.find(slot => parseInt(slot.startTime.split(':')[0]) === lastHour + 1);
      
      const adjacent: any = {};
      
      console.log('Checking hour before:', hourBefore?.startTime);
      // Check availability for hour before
      if (hourBefore && await isCourtHourAvailable(hourBefore)) {
        console.log('Hour before is available:', hourBefore.startTime);
        adjacent.hourBefore = hourBefore;
      }
      
      console.log('Checking hour after:', hourAfter?.startTime);
      // Check availability for hour after
      if (hourAfter && await isCourtHourAvailable(hourAfter)) {
        console.log('Hour after is available:', hourAfter.startTime);
        adjacent.hourAfter = hourAfter;
      }
      
      console.log('Setting adjacent hours:', adjacent);
      setAdjacentHours(adjacent);
    } catch (error) {
      console.error('Error checking adjacent hours:', error);
      setAdjacentHours({});
    }
  };

  const isCourtHourAvailable = async (timeSlot: TimeSlot): Promise<boolean> => {
    if (!selectedDate || !user) return false;

    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const slotStart = new Date(selectedDate);
      const [startHours, startMinutes] = timeSlot.startTime.split(':');
      slotStart.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      const slotEnd = new Date(selectedDate);
      const [endHours, endMinutes] = timeSlot.endTime.split(':');
      slotEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      if (anyCourtSelected) {
        // Check if any court is available
        const { data: events, error } = await supabase
          .from('events')
          .select(`
            *,
            event_courts (
              court_id
            )
          `)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .is('deleted_at', null);

        if (error) return false;

        const busyCourts = new Set<string>();
        events?.forEach(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          if (eventStart < slotEnd && eventEnd > slotStart) {
            event.event_courts?.forEach((ec: any) => {
              busyCourts.add(ec.court_id);
            });
          }
        });

        return courts.some(court => !busyCourts.has(court.id));
      } else if (selectedCourt) {
        // Check if specific court is available
        const { data: events, error } = await supabase
          .from('events')
          .select(`
            *,
            event_courts (
              court_id
            )
          `)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .is('deleted_at', null);

        if (error) return false;

        return !events?.some(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          const hasSelectedCourt = event.event_courts?.some((ec: any) => ec.court_id === selectedCourt.id);
          return hasSelectedCourt && eventStart < slotEnd && eventEnd > slotStart;
        });
      }

      return false;
    } catch (error) {
      console.error('Error checking court hour availability:', error);
      return false;
    }
  };

  const addAdjacentHour = (timeSlot: TimeSlot, position: 'before' | 'after') => {
    if (selectedTimeSlots.length >= 3) {
      Alert.alert('Maximum Hours', 'You can book up to 3 consecutive hours maximum.');
      return;
    }

    const newSlots = [...selectedTimeSlots, timeSlot].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setSelectedTimeSlots(newSlots);
    
    // Clear adjacent hours since we'll recalculate them
    setAdjacentHours({});
  };

  const handleAnyCourtSelect = () => {
    setSelectedCourt(null);
    setAnyCourtSelected(true);
    if (selectedDate) {
      checkAvailabilityAllCourts(selectedDate);
    }
  };

  const handleWaiverAccept = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    try {
      const { updateProfile } = useAuthStore.getState();
      await updateProfile({ has_signed_waiver: true });
      
      console.log('Waiver status updated successfully');
      setNeedsWaiver(false);
      setShowWaiverModal(false);
    } catch (error) {
      console.error('Error updating waiver status:', error);
      Alert.alert('Error', 'Failed to update waiver status. Please try again.');
    }
  };

  const handleReservation = async () => {
    if (!selectedDate || !selectedTimeSlots.length || !selectedCourt || !user?.id) {
      return;
    }

    if (needsWaiver) {
      setShowWaiverModal(true);
      return;
    }

    setIsLoading(true);
    try {
      // First, get the court reservation event type ID
      const { data: eventType, error: eventTypeError } = await supabase
        .from('event_types')
        .select('id')
        .or('name.ilike.%court%,name.ilike.%reservation%')
        .limit(1)
        .single();

      if (eventTypeError || !eventType) {
        console.error('Error finding court reservation event type:', eventTypeError);
        throw new Error('Could not find court reservation event type');
      }

      // Sort time slots to find earliest and latest times
      const sortedTimeSlots = [...selectedTimeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      // Calculate start time from first slot
      const startTime = new Date(selectedDate);
      const [startHours, startMinutes] = sortedTimeSlots[0].startTime.split(':');
      startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      
      // Calculate end time from last slot
      const endTime = new Date(selectedDate);
      const lastSlot = sortedTimeSlots[sortedTimeSlots.length - 1];
      const [endHours, endMinutes] = lastSlot.endTime.split(':');
      endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // Create a single court reservation event for all consecutive hours
      const totalHours = selectedTimeSlots.length;
      const reservationName = totalHours > 1 ? `Court Reservation (${totalHours} hours)` : 'Court Reservation';
      
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          name: reservationName,
          description_en: `${totalHours}-hour court reservation for ${selectedCourt.name}`,
          description_es: `Reserva de ${totalHours} hora${totalHours > 1 ? 's' : ''} para ${selectedCourt.name}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          created_by: user.id,
          event_type_id: eventType.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating reservation:', error);
        throw error;
      }

      // Create event registration for the user
      const { error: registrationError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: user.id,
        });

      if (registrationError) {
        console.error('Error creating event registration:', registrationError);
        throw registrationError;
      }

      // Link the event to the court
      const { error: courtError } = await supabase
        .from('event_courts')
        .insert({
          event_id: event.id,
          court_id: selectedCourt.id,
        });

      if (courtError) {
        console.error('Error linking court to event:', courtError);
      }

      Alert.alert(
        'Success!',
        `Your ${selectedTimeSlots.length}-hour court reservation has been confirmed.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create reservation');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    // For "any court" flow: 1->2->3->4(court selection)->5(checkout)
    // For specific court flow: 1->2->3->4(checkout)
    if (step === 3 && anyCourtSelected) {
      setStep(4); // Go to court selection step
    } else if (step === 4 && anyCourtSelected) {
      setStep(5); // Go to checkout step
    } else if (step === 5) {
      handleReservation(); // Book the reservation
    } else if (step < 3) {
      setStep(step + 1);
    } else if (step === 3 && !anyCourtSelected) {
      setStep(4); // Go directly to checkout for specific court flow
    } else {
      handleReservation(); // For specific court flow, book from checkout
    }
  };

  const prevStep = () => {
    if (step === 5) {
      setStep(4); // Go back to court selection from checkout
    } else if (step === 4 && anyCourtSelected) {
      setStep(3); // Go back to time selection from court selection
    } else if (step === 4 && !anyCourtSelected) {
      setStep(3); // Go back to time selection from checkout (specific court flow)
    } else if (step === 2.5) {
      setStep(2); // Go back to time selection from court selection
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedCourt !== null || anyCourtSelected;
      case 2:
        return selectedDate !== '';
      case 2.5:
        return selectedCourt !== null;
      case 3:
        return selectedTimeSlots.length > 0;
      case 4:
        return selectedCourt !== null;
      case 5:
        return selectedCourt !== null && selectedTimeSlots.length > 0;
      default:
        return false;
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const renderStepContent = () => {
    console.log('Rendering step:', step);
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose Court</Text>
            <Text style={styles.stepDescription}>Select your preferred court or choose any available court</Text>
            <ScrollView style={styles.courtsContainer}>
              <TouchableOpacity
                style={[
                  styles.courtButton,
                  anyCourtSelected && styles.selectedCourt,
                ]}
                onPress={handleAnyCourtSelect}
              >
                <Text style={[
                  styles.courtText,
                  anyCourtSelected && styles.selectedCourtText,
                ]}>
                  Any Available Court
                </Text>
                <Text style={[
                  styles.courtSubtext,
                  anyCourtSelected && styles.selectedCourtText,
                ]}>
                  Flexible scheduling
                </Text>
              </TouchableOpacity>
              {courts.map((court) => (
                <TouchableOpacity
                  key={court.id}
                  style={[
                    styles.courtButton,
                    selectedCourt?.id === court.id && styles.selectedCourt,
                  ]}
                  onPress={() => handleCourtSelect(court)}
                >
                  <Text style={[
                    styles.courtText,
                    selectedCourt?.id === court.id && styles.selectedCourtText,
                  ]}>
                    {court.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Date</Text>
            <Text style={styles.stepDescription}>Choose when you'd like to play</Text>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#2A62A2',
                },
              }}
              minDate={getMinDate()}
              theme={{
                selectedDayBackgroundColor: '#2A62A2',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#2A62A2',
                arrowColor: '#2A62A2',
              }}
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Time</Text>
            <Text style={styles.stepDescription}>
              Available times for {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </Text>
            <Text style={styles.multiHourNotice}>
              You can select up to 3 consecutive hours. Tap to select/deselect time slots.
            </Text>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2A62A2" />
                <Text style={styles.loadingText}>Checking availability...</Text>
              </View>
            ) : (
              <ScrollView style={styles.timeSlotsContainer}>
                {timeSlots.map((slot, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlotButton,
                      selectedTimeSlots.some(s => s.startTime === slot.startTime) && styles.selectedTimeSlot,
                      !slot.available && styles.unavailableTimeSlot,
                    ]}
                    onPress={() => handleTimeSlotSelect(slot)}
                    disabled={!slot.available}
                  >
                    <View style={styles.timeSlotContent}>
                      <View style={styles.timeSlotHeader}>
                        <Text style={[
                          styles.timeSlotText,
                          selectedTimeSlots.some(s => s.startTime === slot.startTime) && styles.selectedTimeSlotText,
                          !slot.available && styles.unavailableTimeSlotText,
                        ]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </View>
                      {anyCourtSelected && slot.courts && slot.courts.length > 0 && (
                        <View style={styles.availableCourtsContainer}>
                          <Text style={[
                            styles.availableCourtsLabel,
                            selectedTimeSlots.some(s => s.startTime === slot.startTime) && styles.selectedTimeSlotText,
                          ]}>
                            Available courts:
                          </Text>
                          <View style={styles.courtNamesContainer}>
                            {slot.courts.slice(0, 3).map((court, courtIndex) => (
                              <Text
                                key={court.id}
                                style={[
                                  styles.courtNameText,
                                  selectedTimeSlots.some(s => s.startTime === slot.startTime) && styles.selectedTimeSlotText,
                                ]}
                              >
                                {court.name}{courtIndex < Math.min(slot.courts!.length, 3) - 1 ? ', ' : ''}
                              </Text>
                            ))}
                            {slot.courts.length > 3 && (
                              <Text style={[
                                styles.courtNameText,
                                selectedTimeSlots.some(s => s.startTime === slot.startTime) && styles.selectedTimeSlotText,
                              ]}>
                                +{slot.courts.length - 3} more
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );

      case 2.5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose Court</Text>
            <Text style={styles.stepDescription}>
              Select from available courts for {selectedTimeSlot?.startTime} - {selectedTimeSlot?.endTime}
            </Text>
            <ScrollView style={styles.courtsContainer}>
              {selectedTimeSlot?.courts?.map((court) => (
                <TouchableOpacity
                  key={court.id}
                  style={[
                    styles.courtButton,
                    selectedCourt?.id === court.id && styles.selectedCourt,
                  ]}
                  onPress={() => setSelectedCourt(court)}
                >
                  <Text style={[
                    styles.courtText,
                    selectedCourt?.id === court.id && styles.selectedCourtText,
                  ]}>
                    {court.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Confirm Reservation</Text>
            <Text style={styles.stepDescription}>Review your reservation details</Text>

            {selectedCourt && selectedTimeSlot && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Reservation Summary</Text>
                <Text style={styles.summaryText}>Date: {format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
                <Text style={styles.summaryText}>Time: {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}</Text>
                <Text style={styles.summaryText}>Court: {selectedCourt.name}</Text>
                {selectedTimeSlot.price && (
                  <Text style={styles.summaryPrice}>
                    Total: ${(selectedTimeSlot.price / 100).toFixed(2)}
                  </Text>
                )}
              </View>
            )}
          </View>
        );

      case 4:
        if (anyCourtSelected) {
          // Court selection step for "any court" flow
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Select Court</Text>
              <Text style={styles.stepDescription}>
                Choose from available courts for {selectedTimeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ')}
              </Text>
              <ScrollView style={styles.courtsContainer}>
                {selectedTimeSlots[0]?.courts?.map((court) => (
                  <TouchableOpacity
                    key={court.id}
                    style={[
                      styles.courtButton,
                      selectedCourt?.id === court.id && styles.selectedCourt,
                    ]}
                    onPress={() => setSelectedCourt(court)}
                  >
                    <Text style={[
                      styles.courtText,
                      selectedCourt?.id === court.id && styles.selectedCourtText,
                    ]}>
                      {court.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        } else {
          // Checkout step for "specific court" flow
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Confirm Reservation</Text>
              <Text style={styles.stepDescription}>Review your reservation details</Text>

              {selectedCourt && selectedTimeSlots.length > 0 && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Reservation Summary</Text>
                  <Text style={styles.summaryText}>Date: {format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
                  <Text style={styles.summaryText}>
                    Time: {selectedTimeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ')} ({selectedTimeSlots.length} hours total)
                  </Text>
                  <Text style={styles.summaryText}>Court: {selectedCourt.name}</Text>
                  <View style={styles.pricingBreakdown}>
                    <View style={styles.pricingRow}>
                      <Text style={styles.pricingLabel}>Base Rate:</Text>
                      <Text style={styles.pricingValue}>${pricing.basePrice.toFixed(2)}</Text>
                    </View>
                    
                    {pricing.discountAmount > 0 && (
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingDiscountLabel}>
                          {pricing.membershipType} Discount ({pricing.discountPercentage}%):
                        </Text>
                        <Text style={styles.pricingDiscountValue}>-${pricing.discountAmount.toFixed(2)}</Text>
                      </View>
                    )}
                    
                    <View style={[styles.pricingRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total:</Text>
                      <Text style={styles.totalValue}>${pricing.finalPrice.toFixed(2)}</Text>
                    </View>
                    
                    {pricing.membershipType && pricing.membershipType !== 'No Membership' && (
                      <Text style={styles.membershipNote}>
                        💎 {pricing.membershipType} Member Pricing
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {selectedTimeSlots.length < 3 && (adjacentHours.hourBefore || adjacentHours.hourAfter) && (
                <View style={styles.additionalHoursContainer}>
                  <Text style={styles.additionalHoursTitle}>Add More Hours?</Text>
                  <Text style={styles.additionalHoursSubtitle}>
                    {selectedCourt ? selectedCourt.name : 'This court'} is also available at these times:
                  </Text>
                  
                  {adjacentHours.hourBefore && (
                    <TouchableOpacity
                      style={styles.addHourButton}
                      onPress={() => addAdjacentHour(adjacentHours.hourBefore!, 'before')}
                    >
                      <View style={styles.addHourContent}>
                        <Text style={styles.addHourTime}>
                          + Add 1 hour before
                        </Text>
                        <View style={styles.addHourPriceContainer}>
                          {addHourPricing.discountAmount > 0 ? (
                            <>
                              <Text style={styles.addHourOriginalPrice}>
                                +${addHourPricing.basePrice.toFixed(0)}
                              </Text>
                              <Text style={styles.addHourDiscountedPrice}>
                                +${addHourPricing.finalPrice.toFixed(0)}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.addHourPrice}>
                              +${addHourPricing.basePrice.toFixed(0)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {adjacentHours.hourAfter && (
                    <TouchableOpacity
                      style={styles.addHourButton}
                      onPress={() => addAdjacentHour(adjacentHours.hourAfter!, 'after')}
                    >
                      <View style={styles.addHourContent}>
                        <Text style={styles.addHourTime}>
                          + Add 1 hour after
                        </Text>
                        <View style={styles.addHourPriceContainer}>
                          {addHourPricing.discountAmount > 0 ? (
                            <>
                              <Text style={styles.addHourOriginalPrice}>
                                +${addHourPricing.basePrice.toFixed(0)}
                              </Text>
                              <Text style={styles.addHourDiscountedPrice}>
                                +${addHourPricing.finalPrice.toFixed(0)}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.addHourPrice}>
                              +${addHourPricing.basePrice.toFixed(0)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Confirm Reservation</Text>
            <Text style={styles.stepDescription}>Review your reservation details</Text>

            {selectedCourt && selectedTimeSlots.length > 0 && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Reservation Summary</Text>
                <Text style={styles.summaryText}>Date: {format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
                <Text style={styles.summaryText}>
                  Time: {selectedTimeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ')} ({selectedTimeSlots.length} hours total)
                </Text>
                <Text style={styles.summaryText}>Court: {selectedCourt.name}</Text>
                <View style={styles.pricingBreakdown}>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Base Rate:</Text>
                    <Text style={styles.pricingValue}>${pricing.basePrice.toFixed(2)}</Text>
                  </View>
                  
                  {pricing.discountAmount > 0 && (
                    <View style={styles.pricingRow}>
                      <Text style={styles.pricingDiscountLabel}>
                        {pricing.membershipType} Discount ({pricing.discountPercentage}%):
                      </Text>
                      <Text style={styles.pricingDiscountValue}>-${pricing.discountAmount.toFixed(2)}</Text>
                    </View>
                  )}
                  
                  <View style={[styles.pricingRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>${pricing.finalPrice.toFixed(2)}</Text>
                  </View>
                  
                  {pricing.membershipType && pricing.membershipType !== 'No Membership' && (
                    <Text style={styles.membershipNote}>
                      💎 {pricing.membershipType} Member Pricing
                    </Text>
                  )}
                </View>
              </View>
            )}

            {(() => {
              const shouldShow = selectedTimeSlots.length < 3 && (adjacentHours.hourBefore || adjacentHours.hourAfter);
              console.log('Should show adjacent hours UI:', {
                shouldShow,
                selectedTimeSlots: selectedTimeSlots.length,
                maxHours: selectedTimeSlots.length < 3,
                hourBefore: !!adjacentHours.hourBefore,
                hourAfter: !!adjacentHours.hourAfter,
                adjacentHours
              });
              return shouldShow;
            })() && (
              <View style={styles.additionalHoursContainer}>
                <Text style={styles.additionalHoursTitle}>Add More Hours?</Text>
                <Text style={styles.additionalHoursSubtitle}>
                  {selectedCourt ? selectedCourt.name : 'This court'} is also available at these times:
                </Text>
                
                {adjacentHours.hourBefore && (
                  <TouchableOpacity
                    style={styles.addHourButton}
                    onPress={() => addAdjacentHour(adjacentHours.hourBefore!, 'before')}
                  >
                    <View style={styles.addHourContent}>
                      <Text style={styles.addHourTime}>
                        + Add 1 hour before
                      </Text>
                      <View style={styles.addHourPriceContainer}>
                        {addHourPricing.discountAmount > 0 ? (
                          <>
                            <Text style={styles.addHourOriginalPrice}>
                              +${addHourPricing.basePrice.toFixed(0)}
                            </Text>
                            <Text style={styles.addHourDiscountedPrice}>
                              +${addHourPricing.finalPrice.toFixed(0)}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.addHourPrice}>
                            +${addHourPricing.basePrice.toFixed(0)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                
                {adjacentHours.hourAfter && (
                  <TouchableOpacity
                    style={styles.addHourButton}
                    onPress={() => addAdjacentHour(adjacentHours.hourAfter!, 'after')}
                  >
                    <View style={styles.addHourContent}>
                      <Text style={styles.addHourTime}>
                        + Add 1 hour after
                      </Text>
                      <View style={styles.addHourPriceContainer}>
                        {addHourPricing.discountAmount > 0 ? (
                          <>
                            <Text style={styles.addHourOriginalPrice}>
                              +${addHourPricing.basePrice.toFixed(0)}
                            </Text>
                            <Text style={styles.addHourDiscountedPrice}>
                              +${addHourPricing.finalPrice.toFixed(0)}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.addHourPrice}>
                            +${addHourPricing.basePrice.toFixed(0)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          >
            {Platform.OS === 'ios' && (
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
            )}
          </TouchableOpacity>

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.header}>
              <Text style={styles.title}>Reserve Court</Text>
              <Text style={styles.subtitle}>
                Step {step === 2.5 ? '2.5' : step} of {anyCourtSelected ? '5' : '4'}
              </Text>
            </View>

            <View style={styles.progressBar}>
              {(anyCourtSelected ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map((i) => (
                <View
                  key={i}
                  style={[
                    styles.progressStep,
                    (i < step || (i === 2 && step === 2.5) || (i === 3 && step >= 3) || (i === 4 && step >= 4) || (i === 5 && step >= 5)) && styles.progressStepActive,
                  ]}
                />
              ))}
            </View>

            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
              {renderStepContent()}
            </ScrollView>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.backButton, step === 1 && styles.disabledButton]}
                onPress={step === 1 ? onClose : prevStep}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>
                  {step === 1 ? 'Cancel' : 'Back'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !canProceed() && styles.disabledButton,
                ]}
                onPress={nextStep}
                disabled={!canProceed() || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {(step === 4 && !anyCourtSelected) || step === 5 ? 'Reserve Court' : 'Next'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <WaiverModal
        visible={showWaiverModal}
        onClose={() => setShowWaiverModal(false)}
        onAccept={handleWaiverAccept}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    flex: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#2A62A2',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendar: {
    borderRadius: 12,
  },
  simpleDateContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  simpleDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 12,
  },
  simpleDateButton: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedDateButton: {
    backgroundColor: '#2A62A2',
    borderColor: '#2A62A2',
  },
  simpleDateText: {
    fontSize: 14,
    color: '#020817',
    textAlign: 'center',
  },
  selectedDateText: {
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  timeSlotsContainer: {
    maxHeight: height * 0.4,
  },
  timeSlotButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTimeSlot: {
    backgroundColor: '#2A62A2',
    borderColor: '#2A62A2',
  },
  unavailableTimeSlot: {
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
  },
  selectedTimeSlotText: {
    color: '#ffffff',
  },
  unavailableTimeSlotText: {
    color: '#94A3B8',
  },
  courtsContainer: {
    maxHeight: height * 0.5,
  },
  courtButton: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCourt: {
    backgroundColor: '#2A62A2',
    borderColor: '#2A62A2',
  },
  courtText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    textAlign: 'center',
  },
  selectedCourtText: {
    color: '#ffffff',
  },
  summaryContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A62A2',
    marginTop: 8,
  },
  pricingBreakdown: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pricingDiscountLabel: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  pricingDiscountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A62A2',
  },
  membershipNote: {
    fontSize: 12,
    color: '#2A62A2',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#2A62A2',
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  courtSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  timeSlotContent: {
    flex: 1,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableCourtsContainer: {
    marginTop: 8,
  },
  availableCourtsLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  courtNamesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  courtNameText: {
    fontSize: 12,
    color: '#64748B',
  },
  multiHourNotice: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  additionalHoursContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A62A2',
  },
  additionalHoursTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A62A2',
    marginBottom: 8,
  },
  additionalHoursSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  addHourButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A62A2',
  },
  addHourContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addHourTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A62A2',
  },
  addHourPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2A62A2',
  },
  addHourPriceContainer: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  addHourOriginalPrice: {
    fontSize: 12,
    color: '#6B7280',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  addHourDiscountedPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
});