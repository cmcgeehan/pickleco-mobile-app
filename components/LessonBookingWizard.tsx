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
  Image,
} from 'react-native';
import { imageUploadService } from '@/lib/imageUploadService';
import { BlurView } from 'expo-blur';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '@/stores/authStore';
import WaiverModal from './WaiverModal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { calculateLessonPrice, PricingCalculation, calculateSingleHourPricing } from '@/lib/pricing';

const { width, height } = Dimensions.get('window');

interface Coach {
  id: string;
  first_name: string;
  last_name: string;
  coaching_rate: number;
  bio?: string;
  specialties?: string[];
  dupr_rating?: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
  coach_id?: string;
  coaches?: Coach[]; // For "any coach" flow - available coaches for this time slot
}

interface Court {
  id: string;
  name: string;
  location_id: string;
}

interface LessonBookingWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCoachId?: string;
}

const AVAILABLE_TIMES = [
  { time: '08:00', available: true },
  { time: '09:00', available: true },
  { time: '10:00', available: true },
  { time: '11:00', available: true },
  { time: '12:00', available: true },
  { time: '13:00', available: true },
  { time: '14:00', available: true },
  { time: '15:00', available: true },
  { time: '16:00', available: true },
  { time: '17:00', available: true },
  { time: '18:00', available: true },
  { time: '19:00', available: true },
];

export default function LessonBookingWizard({
  visible,
  onClose,
  onSuccess,
  initialCoachId,
}: LessonBookingWizardProps) {
  const { user, session, profile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [anyCoachSelected, setAnyCoachSelected] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [duration, setDuration] = useState<number>(60); // Default 60 minutes
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachAvatars, setCoachAvatars] = useState<Record<string, string | null>>({});
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
      setSelectedDate('');
      setSelectedTimeSlots([]);
      setSelectedCourt(null);
      setSelectedCoach(null);
      setAnyCoachSelected(false);
      
      // Check if user needs to sign waiver
      if (profile && !profile.has_signed_waiver) {
        setNeedsWaiver(true);
      } else {
        setNeedsWaiver(false);
      }
      
      loadCoaches();
      loadCourts();
    }
  }, [visible, user]);

  // Check adjacent hours availability when we have all required selections
  useEffect(() => {
    if (step === 5 && selectedTimeSlots.length > 0 && selectedDate && selectedCoach && selectedCourt) {
      checkAdjacentHoursAvailability();
    } else {
      setAdjacentHours({});
    }
  }, [step, selectedTimeSlots, selectedDate, selectedCoach, selectedCourt]);

  // Calculate pricing based on selected coach and time slots
  const updatePricing = useCallback(async () => {
    if (!user || !selectedCoach || selectedTimeSlots.length === 0) {
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
      const durationHours = selectedTimeSlots.length;
      const pricingCalculation = await calculateLessonPrice(
        user.id,
        selectedCoach.coaching_rate,
        durationHours
      );
      
      console.log('Pricing calculation:', pricingCalculation);
      setPricing(pricingCalculation);
    } catch (error) {
      console.error('Error calculating pricing:', error);
      setPricing({
        basePrice: selectedCoach.coaching_rate * selectedTimeSlots.length,
        discountAmount: 0,
        finalPrice: selectedCoach.coaching_rate * selectedTimeSlots.length,
        discountPercentage: 0,
        membershipType: 'Error calculating discount'
      });
    }
  }, [user, selectedCoach, selectedTimeSlots]);

  // Update pricing when coach or time slots change
  useEffect(() => {
    updatePricing();
  }, [updatePricing]);

  // Calculate add hour pricing for buttons
  const updateAddHourPricing = useCallback(async () => {
    if (!user || !selectedCoach) {
      setAddHourPricing({
        basePrice: 0,
        finalPrice: 0,
        discountAmount: 0,
        discountPercentage: 0
      });
      return;
    }

    try {
      const result = await calculateSingleHourPricing(user.id, selectedCoach.coaching_rate, 'lesson');
      setAddHourPricing(result);
    } catch (error) {
      console.error('Error calculating add hour pricing:', error);
      setAddHourPricing({
        basePrice: selectedCoach.coaching_rate,
        finalPrice: selectedCoach.coaching_rate,
        discountAmount: 0,
        discountPercentage: 0
      });
    }
  }, [user, selectedCoach]);

  // Update add hour pricing when coach changes
  useEffect(() => {
    updateAddHourPricing();
  }, [updateAddHourPricing]);

  const loadCoaches = async () => {
    if (!user) {
      console.log('No user available for loading coaches');
      return;
    }

    console.log('Loading coaches from Supabase...');
    
    try {
      const { data: coaches, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          coaching_rate,
          bio,
          specialties,
          dupr_rating
        `)
        .eq('is_coach', true)
        .is('deleted_at', null)
        .order('first_name');

      if (error) {
        console.error('Supabase error loading coaches:', error);
        throw error;
      }

      console.log('Coaches data received from Supabase:', coaches);
      
      // Filter and transform coaches data
      const coachesData = coaches?.filter(
        (coach: any) => coach.first_name && coach.last_name
      ) || [];
      
      setCoaches(coachesData);
      
      // Load coach avatars
      const avatarPromises = coachesData.map(async (coach: Coach) => {
        try {
          const avatarUrl = await imageUploadService.getUserAvatarUrl(coach.id);
          return { coachId: coach.id, avatarUrl };
        } catch (error) {
          console.error(`Error loading avatar for coach ${coach.id}:`, error);
          return { coachId: coach.id, avatarUrl: null };
        }
      });

      const avatarResults = await Promise.all(avatarPromises);
      const avatarMap = avatarResults.reduce((acc, { coachId, avatarUrl }) => {
        acc[coachId] = avatarUrl;
        return acc;
      }, {} as Record<string, string | null>);

      setCoachAvatars(avatarMap);
      
      // If initialCoachId is provided, set the selected coach
      if (initialCoachId) {
        const coach = coachesData.find((c: Coach) => c.id === initialCoachId);
        if (coach) {
          setSelectedCoach(coach);
        }
      }
    } catch (error) {
      console.error('Error loading coaches:', error);
      setCoaches([]);
      Alert.alert('Error', 'Failed to load coaches. Please try again.');
    }
  };

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

  const checkAvailability = async (date: string, coachId: string) => {
    if (!user) return;

    setIsLoading(true);
    console.log('Checking coach availability for date:', date, 'coach:', coachId);
    
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all lessons/events for the coach on the selected date
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('coach_id', coachId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .is('deleted_at', null);

      if (error) {
        console.error('Error checking availability:', error);
        throw error;
      }

      console.log('Coach availability data received:', events);

      // For now, use default time slots (could be enhanced to show actual availability)
      setTimeSlots(AVAILABLE_TIMES);
    } catch (error) {
      console.error('Error checking availability:', error);
      setTimeSlots(AVAILABLE_TIMES); // Fallback to default times
    } finally {
      setIsLoading(false);
    }
  };

  const checkAvailabilityAllCoaches = async (date: string) => {
    if (!user) return;

    setIsLoading(true);
    console.log('Checking availability for all coaches on date:', date);
    
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all lessons/events for all coaches on the selected date
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .not('coach_id', 'is', null)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .is('deleted_at', null);

      if (error) {
        console.error('Error checking availability for all coaches:', error);
        throw error;
      }

      console.log('All coaches availability data received:', events);

      // Create a map of busy coaches for each time slot
      const busyCoaches = new Map<string, Set<string>>();
      
      events?.forEach(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        
        // Check which time slots this event overlaps with
        AVAILABLE_TIMES.forEach(slot => {
          const slotStart = new Date(date);
          const [hours, minutes] = slot.time.split(':');
          slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);
          
          // Check if the event overlaps with this time slot
          if (eventStart < slotEnd && eventEnd > slotStart) {
            if (!busyCoaches.has(slot.time)) {
              busyCoaches.set(slot.time, new Set());
            }
            busyCoaches.get(slot.time)?.add(event.coach_id);
          }
        });
      });

      // Create time slots with available coaches
      const timeSlotswithCoaches = AVAILABLE_TIMES.map(slot => {
        const busyCoachIds = busyCoaches.get(slot.time) || new Set();
        const availableCoaches = coaches.filter(coach => !busyCoachIds.has(coach.id));
        
        return {
          ...slot,
          available: availableCoaches.length > 0,
          coaches: availableCoaches
        };
      });

      setTimeSlots(timeSlotswithCoaches);
    } catch (error) {
      console.error('Error checking availability for all coaches:', error);
      setTimeSlots(AVAILABLE_TIMES); // Fallback to default times
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoachSelect = (coach: Coach) => {
    setSelectedCoach(coach);
    setAnyCoachSelected(false);
    if (selectedDate) {
      checkAvailability(selectedDate, coach.id);
    }
  };

  const handleAnyCoachSelect = () => {
    setSelectedCoach(null);
    setAnyCoachSelected(true);
    if (selectedDate) {
      checkAvailabilityAllCoaches(selectedDate);
    }
  };

  const handleDateSelect = (day: any) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    setSelectedTimeSlots([]);
    if (anyCoachSelected) {
      checkAvailabilityAllCoaches(dateString);
    } else if (selectedCoach) {
      checkAvailability(dateString, selectedCoach.id);
    }
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    const isSelected = selectedTimeSlots.some(slot => slot.time === timeSlot.time);
    
    if (isSelected) {
      // Remove the time slot if already selected
      setSelectedTimeSlots(selectedTimeSlots.filter(slot => slot.time !== timeSlot.time));
      return;
    }
    
    // Check if we can add this time slot (max 3 hours, must be consecutive)
    if (selectedTimeSlots.length === 0) {
      // First selection
      setSelectedTimeSlots([timeSlot]);
    } else if (selectedTimeSlots.length < 3) {
      // Check if it's consecutive
      const newSlots = [...selectedTimeSlots, timeSlot].sort((a, b) => a.time.localeCompare(b.time));
      
      if (isConsecutive(newSlots)) {
        setSelectedTimeSlots(newSlots);
      } else {
        Alert.alert('Invalid Selection', 'Time slots must be consecutive. You can book up to 3 consecutive hours.');
        return;
      }
    } else {
      Alert.alert('Maximum Hours', 'You can book up to 3 consecutive hours maximum.');
      return;
    }
    
    // Handle coach selection for "any coach" mode
    if (anyCoachSelected && selectedTimeSlots.length === 0) {
      if (timeSlot.coaches && timeSlot.coaches.length === 1) {
        setSelectedCoach(timeSlot.coaches[0]);
      } else if (timeSlot.coaches && timeSlot.coaches.length > 1) {
        setSelectedCoach(null);
      }
    }
  };

  const isConsecutive = (slots: TimeSlot[]): boolean => {
    if (slots.length <= 1) return true;
    
    const sortedSlots = slots.sort((a, b) => a.time.localeCompare(b.time));
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const prevTime = parseInt(sortedSlots[i - 1].time.split(':')[0]);
      const currentTime = parseInt(sortedSlots[i].time.split(':')[0]);
      
      if (currentTime !== prevTime + 1) {
        return false;
      }
    }
    
    return true;
  };

  const checkAdjacentHoursAvailability = async () => {
    if (!selectedTimeSlots.length || !selectedDate || selectedTimeSlots.length >= 3) {
      setAdjacentHours({});
      return;
    }

    try {
      const sortedSlots = selectedTimeSlots.sort((a, b) => a.time.localeCompare(b.time));
      const firstSlot = sortedSlots[0];
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      
      // Find hour before and after
      const firstHour = parseInt(firstSlot.time.split(':')[0]);
      const lastHour = parseInt(lastSlot.time.split(':')[0]);
      
      const hourBefore = AVAILABLE_TIMES.find(slot => parseInt(slot.time.split(':')[0]) === firstHour - 1);
      const hourAfter = AVAILABLE_TIMES.find(slot => parseInt(slot.time.split(':')[0]) === lastHour + 1);
      
      const adjacent: any = {};
      
      // Check availability for hour before
      if (hourBefore && await isHourAvailable(hourBefore)) {
        adjacent.hourBefore = hourBefore;
      }
      
      // Check availability for hour after
      if (hourAfter && await isHourAvailable(hourAfter)) {
        adjacent.hourAfter = hourAfter;
      }
      
      setAdjacentHours(adjacent);
    } catch (error) {
      console.error('Error checking adjacent hours:', error);
      setAdjacentHours({});
    }
  };

  const isHourAvailable = async (timeSlot: TimeSlot): Promise<boolean> => {
    if (!selectedDate || !user) return false;

    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const slotStart = new Date(selectedDate);
      const [hours, minutes] = timeSlot.time.split(':');
      slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      if (anyCoachSelected) {
        // Check if any coach is available
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .not('coach_id', 'is', null)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .is('deleted_at', null);

        if (error) return false;

        const busyCoaches = new Set<string>();
        events?.forEach(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          if (eventStart < slotEnd && eventEnd > slotStart) {
            busyCoaches.add(event.coach_id);
          }
        });

        return coaches.some(coach => !busyCoaches.has(coach.id));
      } else if (selectedCoach) {
        // Check if specific coach is available
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .eq('coach_id', selectedCoach.id)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .is('deleted_at', null);

        if (error) return false;

        return !events?.some(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          return eventStart < slotEnd && eventEnd > slotStart;
        });
      }

      return false;
    } catch (error) {
      console.error('Error checking hour availability:', error);
      return false;
    }
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
  };

  const addAdjacentHour = (timeSlot: TimeSlot, position: 'before' | 'after') => {
    if (selectedTimeSlots.length >= 3) {
      Alert.alert('Maximum Hours', 'You can book up to 3 consecutive hours maximum.');
      return;
    }

    const newSlots = [...selectedTimeSlots, timeSlot].sort((a, b) => a.time.localeCompare(b.time));
    setSelectedTimeSlots(newSlots);
    
    // Clear adjacent hours since we'll recalculate them
    setAdjacentHours({});
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

  const handleBookLesson = async () => {
    if (!selectedCoach || !selectedDate || !selectedTimeSlots.length || !selectedCourt || !user?.id) {
      return;
    }

    if (needsWaiver) {
      setShowWaiverModal(true);
      return;
    }

    setIsLoading(true);
    try {
      // First, get the lesson event type ID
      const { data: eventType, error: eventTypeError } = await supabase
        .from('event_types')
        .select('id')
        .ilike('name', '%lesson%')
        .limit(1)
        .single();

      if (eventTypeError || !eventType) {
        console.error('Error finding lesson event type:', eventTypeError);
        throw new Error('Could not find lesson event type');
      }

      // Sort time slots to find earliest and latest times
      const sortedTimeSlots = [...selectedTimeSlots].sort((a, b) => a.time.localeCompare(b.time));
      
      // Calculate start time from first slot
      const startTime = new Date(selectedDate);
      const [startHours, startMinutes] = sortedTimeSlots[0].time.split(':');
      startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      
      // Calculate end time from last slot plus duration
      const endTime = new Date(selectedDate);
      const lastSlot = sortedTimeSlots[sortedTimeSlots.length - 1];
      const [endHours, endMinutes] = lastSlot.time.split(':');
      endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
      endTime.setMinutes(endTime.getMinutes() + duration);

      // Create a single lesson event for all consecutive hours
      const totalHours = selectedTimeSlots.length;
      const lessonName = totalHours > 1 ? `Private Lesson (${totalHours} hours)` : 'Private Lesson';
      
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          name: lessonName,
          description_en: `${totalHours}-hour private lesson with ${selectedCoach.first_name} ${selectedCoach.last_name}`,
          description_es: `Lección privada de ${totalHours} hora${totalHours > 1 ? 's' : ''} con ${selectedCoach.first_name} ${selectedCoach.last_name}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          created_by: user.id,
          coach_id: selectedCoach.id,
          event_type_id: eventType.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error booking lesson:', error);
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
        console.error('Error linking court to lesson:', courtError);
      }

      Alert.alert(
        'Success!',
        `Your ${selectedTimeSlots.length}-hour lesson has been booked successfully.`,
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
      console.error('Error booking lesson:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to book lesson');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    // Determine if we need the coach selection step (3.5)
    const needsCoachSelection = anyCoachSelected && 
      selectedTimeSlots.length > 0 && 
      selectedTimeSlots[0].coaches && 
      selectedTimeSlots[0].coaches.length > 1 && 
      !selectedCoach;
    
    if (step === 3 && needsCoachSelection) {
      setStep(3.5); // Go to coach selection step
    } else if (step === 3.5) {
      setStep(4); // Go to court selection after coach selection
    } else if (step === 4) {
      setStep(5); // Go to checkout step
    } else if (step === 5) {
      handleBookLesson(); // Book from checkout
    } else if (step < 4) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step === 5) {
      setStep(4); // Go back to court selection from checkout
    } else if (step === 3.5) {
      setStep(3); // Go back to time selection from coach selection
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedCoach !== null || anyCoachSelected;
      case 2:
        return selectedDate !== '';
      case 3:
        return selectedTimeSlots.length > 0;
      case 3.5:
        return selectedCoach !== null;
      case 4:
        return selectedCourt !== null;
      case 5:
        return selectedCourt !== null && selectedTimeSlots.length > 0 && selectedCoach !== null;
      default:
        return false;
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose Coach</Text>
            <Text style={styles.stepDescription}>Select your preferred coach or choose any available coach</Text>
            <ScrollView style={styles.coachesContainer}>
              <TouchableOpacity
                style={[
                  styles.coachCard,
                  anyCoachSelected && styles.selectedCoach,
                ]}
                onPress={handleAnyCoachSelect}
              >
                <View style={styles.coachInfo}>
                  <View style={styles.coachAvatar}>
                    <Text style={styles.avatarText}>ANY</Text>
                  </View>
                  <View style={styles.coachDetails}>
                    <Text style={[
                      styles.coachName,
                      anyCoachSelected && styles.selectedCoachText,
                    ]}>
                      Any Available Coach
                    </Text>
                    <Text style={[
                      styles.coachRate,
                      anyCoachSelected && styles.selectedCoachSubtext,
                    ]}>
                      Flexible scheduling
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              {coaches.map((coach) => (
                <TouchableOpacity
                  key={coach.id}
                  style={[
                    styles.coachCard,
                    selectedCoach?.id === coach.id && styles.selectedCoach,
                  ]}
                  onPress={() => handleCoachSelect(coach)}
                >
                  <View style={styles.coachInfo}>
                    <View style={styles.coachAvatar}>
                      {coachAvatars[coach.id] ? (
                        <Image source={{ uri: coachAvatars[coach.id] }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {getInitials(coach.first_name, coach.last_name)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.coachDetails}>
                      <Text style={[
                        styles.coachName,
                        selectedCoach?.id === coach.id && styles.selectedCoachText,
                      ]}>
                        {coach.first_name} {coach.last_name}
                      </Text>
                      {coach.dupr_rating && (
                        <Text style={[
                          styles.coachRating,
                          selectedCoach?.id === coach.id && styles.selectedCoachSubtext,
                        ]}>
                          DUPR: {coach.dupr_rating}
                        </Text>
                      )}
                      <Text style={[
                        styles.coachRate,
                        selectedCoach?.id === coach.id && styles.selectedCoachText,
                      ]}>
                        ${coach.coaching_rate}/hour
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Date</Text>
            <Text style={styles.stepDescription}>Choose when you'd like your lesson</Text>
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
                      selectedTimeSlots.some(s => s.time === slot.time) && styles.selectedTimeSlot,
                      !slot.available && styles.unavailableTimeSlot,
                    ]}
                    onPress={() => handleTimeSlotSelect(slot)}
                    disabled={!slot.available}
                  >
                    <View style={styles.timeSlotContent}>
                      <Text style={[
                        styles.timeSlotText,
                        selectedTimeSlots.some(s => s.time === slot.time) && styles.selectedTimeSlotText,
                        !slot.available && styles.unavailableTimeSlotText,
                      ]}>
                        {slot.time} ({duration} minutes)
                      </Text>
                      {anyCoachSelected && slot.coaches && slot.coaches.length > 0 && (
                        <View style={styles.availableCoachesContainer}>
                          <Text style={[
                            styles.availableCoachesLabel,
                            selectedTimeSlots.some(s => s.time === slot.time) && styles.selectedTimeSlotText,
                          ]}>
                            Available coaches:
                          </Text>
                          <View style={styles.coachAvatarsContainer}>
                            {slot.coaches.slice(0, 3).map((coach, coachIndex) => (
                              <View key={coach.id} style={styles.smallCoachAvatar}>
                                {coachAvatars[coach.id] ? (
                                  <Image source={{ uri: coachAvatars[coach.id] }} style={styles.smallAvatarImage} />
                                ) : (
                                  <Text style={styles.smallAvatarText}>
                                    {getInitials(coach.first_name, coach.last_name)}
                                  </Text>
                                )}
                              </View>
                            ))}
                            {slot.coaches.length > 3 && (
                              <View style={styles.smallCoachAvatar}>
                                <Text style={styles.smallAvatarText}>+{slot.coaches.length - 3}</Text>
                              </View>
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

      case 3.5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose Coach</Text>
            <Text style={styles.stepDescription}>
              Select from available coaches for {selectedTimeSlots.map(slot => slot.time).join(', ')}
            </Text>
            <ScrollView style={styles.coachesContainer}>
              {selectedTimeSlots[0]?.coaches?.map((coach) => (
                <TouchableOpacity
                  key={coach.id}
                  style={[
                    styles.coachCard,
                    selectedCoach?.id === coach.id && styles.selectedCoach,
                  ]}
                  onPress={() => setSelectedCoach(coach)}
                >
                  <View style={styles.coachInfo}>
                    <View style={styles.coachAvatar}>
                      {coachAvatars[coach.id] ? (
                        <Image source={{ uri: coachAvatars[coach.id] }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {getInitials(coach.first_name, coach.last_name)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.coachDetails}>
                      <Text style={[
                        styles.coachName,
                        selectedCoach?.id === coach.id && styles.selectedCoachText,
                      ]}>
                        {coach.first_name} {coach.last_name}
                      </Text>
                      {coach.dupr_rating && (
                        <Text style={[
                          styles.coachRating,
                          selectedCoach?.id === coach.id && styles.selectedCoachSubtext,
                        ]}>
                          DUPR: {coach.dupr_rating}
                        </Text>
                      )}
                      <Text style={[
                        styles.coachRate,
                        selectedCoach?.id === coach.id && styles.selectedCoachText,
                      ]}>
                        ${coach.coaching_rate}/hour
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Court</Text>
            <Text style={styles.stepDescription}>Choose your preferred court</Text>
            <ScrollView style={styles.courtsContainer}>
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

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Confirm Lesson</Text>
            <Text style={styles.stepDescription}>Review your lesson details</Text>

            {selectedCourt && selectedTimeSlots.length > 0 && selectedCoach && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Lesson Summary</Text>
                <Text style={styles.summaryText}>Coach: {selectedCoach.first_name} {selectedCoach.last_name}</Text>
                <Text style={styles.summaryText}>Date: {format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
                <Text style={styles.summaryText}>
                  Time: {selectedTimeSlots.map(slot => slot.time).join(', ')} ({selectedTimeSlots.length * duration} minutes total)
                </Text>
                <Text style={styles.summaryText}>Court: {selectedCourt.name}</Text>
                <View style={styles.pricingBreakdown}>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Base Rate:</Text>
                    <Text style={styles.pricingValue}>${pricing.basePrice.toFixed(2)}</Text>
                  </View>
                  
                  {pricing.discountAmount > 0 && (
                    <>
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingDiscountLabel}>
                          {pricing.membershipType} Discount ({pricing.discountPercentage}%):
                        </Text>
                        <Text style={styles.pricingDiscountValue}>-${pricing.discountAmount.toFixed(2)}</Text>
                      </View>
                    </>
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
                  {selectedCoach ? `${selectedCoach.first_name} ${selectedCoach.last_name}` : 'A coach'} is also available at these times:
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
              <Text style={styles.title}>Book Lesson</Text>
              <Text style={styles.subtitle}>
                Step {step === 3.5 ? '3.5' : step} of 5
              </Text>
            </View>

            <View style={styles.progressBar}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.progressStep,
                    (i < step || (i === 3 && step === 3.5) || (i === 4 && step >= 4) || (i === 5 && step >= 5)) && styles.progressStepActive,
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
                    {step === 5 ? 'Book Lesson' : 'Next'}
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
  coachesContainer: {
    maxHeight: height * 0.4,
  },
  coachCard: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCoach: {
    backgroundColor: '#2A62A2',
    borderColor: '#2A62A2',
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64748B',
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 4,
  },
  selectedCoachText: {
    color: '#ffffff',
  },
  coachRating: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  selectedCoachSubtext: {
    color: '#E2E8F0',
  },
  coachRate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A62A2',
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
    textAlign: 'center',
  },
  selectedTimeSlotText: {
    color: '#ffffff',
  },
  unavailableTimeSlotText: {
    color: '#94A3B8',
  },
  courtsContainer: {
    maxHeight: height * 0.3,
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
  timeSlotContent: {
    flex: 1,
  },
  availableCoachesContainer: {
    marginTop: 8,
  },
  availableCoachesLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  coachAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallCoachAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    overflow: 'hidden',
  },
  smallAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  smallAvatarText: {
    fontSize: 8,
    fontWeight: 'bold',
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