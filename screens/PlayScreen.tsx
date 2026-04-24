import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import UserRegistrations from '../components/UserRegistrations';
import EventModal from '../components/EventModal';
import MembershipPromoCard from '../components/MembershipPromoCard';
import CoachesSection from '../components/CoachesSection';
import LessonBookingWizard from '../components/LessonBookingWizard';
import LanguageSwitcher from '../components/LanguageSwitcher';
import WaiverModal from '../components/WaiverModal';
import EventPaymentModal from '../components/EventPaymentModal';
import { CalendarEvent } from '../types/events';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

interface EventPricingInfo {
  basePrice: number;
  userPrice: number;
  membershipType: string | null;
  isDiscounted: boolean;
  savings: number;
  eventTypeId?: string;
}

export default function PlayScreen() {
  const { session, user, profile, updateProfile } = useAuthStore()
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<CalendarEvent[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showLessonWizard, setShowLessonWizard] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);

  // Waiver and payment states
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [eventPricing, setEventPricing] = useState<EventPricingInfo | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  // Track local registration state to override stale API data
  const [localRegistrationState, setLocalRegistrationState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user && session) {
      loadData();
    }
  }, [user, session]);

  const loadData = async () => {
    await Promise.all([
      loadEvents(),
      loadUserRegistrations(),
      loadCoaches()
    ]);
  };

  const loadEvents = async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/play?view=spotlight&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const responseData = await response.json();
      
      // Handle different response structures
      let eventsData = responseData;
      if (responseData.events) {
        eventsData = responseData.events;
      } else if (responseData.data) {
        eventsData = responseData.data;
      }
      
      // Ensure eventsData is an array
      if (!Array.isArray(eventsData)) {
        console.error('Events data is not an array:', eventsData);
        setEvents([]);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Transform API data to match our CalendarEvent interface
      const transformedEvents: CalendarEvent[] = eventsData
        .filter((event: any) => event.spotlight !== false) // Include spotlight events
        .map((event: any) => {
          // Determine proper event type by inferring from event name and properties
          let eventType = 'Event'; // Default fallback
          const eventName = (event.name || '').toLowerCase();
          const eventDesc = (event.description_en || event.description_es || '').toLowerCase();
          
          // Infer type from content (more reliable than API event_type)
          if (eventName.includes('reservation')) {
            eventType = 'Court Reservation';
          } else if (eventName.includes('clinic') || eventDesc.includes('clinic')) {
            eventType = 'Clinic';
          } else if (eventName.includes('tournament') || eventDesc.includes('tournament')) {
            eventType = 'Tournament';
          } else if (eventName.includes('lesson') && (eventName.includes('private') || eventDesc.includes('private'))) {
            eventType = 'Private Lesson';
          } else if (eventName.includes('social') || eventDesc.includes('social')) {
            eventType = 'Social Event';
          } else if (event.spotlight === true || eventName.includes('opening') || eventName.includes('grand')) {
            eventType = 'Event'; // Special events/spotlight events
          } else if (event.event_type?.name && event.event_type.name !== 'Other') {
            // Use API type only if it's not "Other"
            eventType = event.event_type.name;
          }
          
          console.log(`Event "${event.name}" -> Type: "${eventType}" (API type: "${event.event_type?.name}")`);
          
          return {
            id: event.id,
            title: event.name,
            type: eventType,
            start: event.start_time,
            end: event.end_time,
            description: event.description_en || event.description_es || '',
            location: event.courts?.map((c: any) => c.name).join(', ') || 'TBD',
            isSpotlight: event.spotlight,
            image_path: event.image_path || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=500',
            maxParticipants: event.capacity,
            currentParticipants: event.participants?.length || 0,
            price: event.cost_mxn || event.cost,
            participants: event.participants || [],
            isRegistered: (() => {
              // Check if we have local state for this event
              if (localRegistrationState.hasOwnProperty(event.id)) {
                return localRegistrationState[event.id];
              }
              // Use the properly filtered participants array from API
              return event.participants?.some((p: any) => p.userId === user?.id) || false;
            })()
          };
        });

      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      // Don't show error alert — empty state is fine when no events exist
      setEvents([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };


  const loadUserRegistrations = async () => {
    if (!session?.access_token || !user?.id) {
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/play?view=my_registrations&user_id=${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user registrations');
      }

      const data = await response.json();
      
      // Transform API data to match our CalendarEvent interface
      const transformedRegistrations: CalendarEvent[] = data.events?.map((event: any) => {
        // Defensive handling for event types (private events may have different structure)
        let eventType = 'Event';
        try {
          if (event.event_types && Array.isArray(event.event_types) && event.event_types.length > 0) {
            eventType = event.event_types[0]?.name || 'Event';
          } else if (event.type) {
            eventType = event.type;
          } else if (event.name?.toLowerCase().includes('lesson')) {
            eventType = 'Private Lesson';
          } else if (event.name?.toLowerCase().includes('reservation')) {
            eventType = 'Court Reservation';
          }
        } catch (error) {
          console.warn('Error determining event type for event:', event.id, error);
          eventType = 'Private Event';
        }

        return {
          id: event.id,
          title: event.name || event.title || 'Untitled Event',
          type: eventType,
          start: event.start_time,
          end: event.end_time,
          description: event.description_en || event.description_es || '',
          location: event.location || event.court_name || 'TBD',
          price: event.cost_mxn || event.cost || 0,
          isRegistered: true, // These are user's registrations, so always true
          participants: event.participants || [],
          maxParticipants: event.capacity || 0,
          currentParticipants: event.participants?.length || 0,
          image_path: event.image_path, // Add the missing image_path field
        };
      }) || [];

      setUserRegistrations(transformedRegistrations);
    } catch (error) {
      console.error('Error loading user registrations:', error);
      // Don't show alert for registrations as it's not critical
    }
  };

  const loadCoaches = async () => {
    if (!user) {
      return;
    }

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
          dupr_singles_rating,
          dupr_doubles_rating,
          image_path
        `)
        .eq('is_coach', true)
        .is('deleted_at', null)
        .order('first_name');

      if (error) {
        console.error('Error loading coaches:', error);
        return;
      }

      // Filter out coaches without names and transform data
      const transformedCoaches = coaches?.filter(
        (coach: any) => coach.first_name && coach.last_name
      ).map((coach: any) => ({
        id: coach.id,
        first_name: coach.first_name,
        last_name: coach.last_name,
        coaching_rate: coach.coaching_rate || 0,
        bio: coach.bio,
        specialties: coach.specialties || [],
        dupr_singles_rating: coach.dupr_singles_rating,
        dupr_doubles_rating: coach.dupr_doubles_rating,
        image_path: coach.image_path,
      })) || [];

      setCoaches(transformedCoaches);
    } catch (error) {
      console.error('Error in loadCoaches:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleBookLesson = (coach: any) => {
    setSelectedCoach(coach);
    setShowLessonWizard(true);
  };

  const handleLessonWizardSuccess = () => {
    setShowLessonWizard(false);
    setSelectedCoach(null);
    // Optionally refresh data
    loadData();
  };

  // Handle waiver acceptance
  const handleWaiverAccept = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('common.authRequired'));
      return;
    }

    try {
      await updateProfile({ has_signed_waiver: true });
      setShowWaiverModal(false);

      // Continue with registration after waiver is signed
      if (pendingEventId) {
        continueRegistrationAfterWaiver(pendingEventId);
      }
    } catch (error) {
      console.error('Error updating waiver status:', error);
      Alert.alert(t('common.error'), t('waiver.updateFailed'));
    }
  };

  // Continue registration flow after waiver is signed
  const continueRegistrationAfterWaiver = async (eventId: string) => {
    await fetchEventPricingAndProceed(eventId);
  };

  // Fetch event pricing with membership awareness
  const fetchEventPricingAndProceed = async (eventId: string) => {
    if (!session?.access_token || !user?.id) return;

    setIsRegistering(true);

    try {
      // Find the event to get its event_type_id
      const event = events.find(e => e.id === eventId);

      // Fetch pricing from API
      const params = new URLSearchParams({
        userId: user.id,
      });

      // If we have an event_type_id, include it
      if (event && (event as any).event_type_id) {
        params.append('eventTypeId', (event as any).event_type_id);
      }

      const pricingResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/events/price?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        console.log('Event pricing data:', pricingData);

        setEventPricing({
          basePrice: pricingData.basePrice || event?.price || 0,
          userPrice: pricingData.userPrice ?? pricingData.basePrice ?? event?.price ?? 0,
          membershipType: pricingData.membershipType || null,
          isDiscounted: pricingData.isDiscounted || false,
          savings: pricingData.savings || 0,
          eventTypeId: pricingData.eventTypeId,
        });

        // Check if payment is required
        const finalPrice = pricingData.userPrice ?? pricingData.basePrice ?? event?.price ?? 0;

        if (finalPrice > 0) {
          // Show payment modal
          setShowPaymentModal(true);
        } else {
          // Free event - complete registration directly
          await completeRegistration(eventId);
        }
      } else {
        // If pricing API fails, use the event's price directly
        console.log('Pricing API failed, using event price directly');
        const eventPrice = event?.price || 0;

        if (eventPrice > 0) {
          setEventPricing({
            basePrice: eventPrice,
            userPrice: eventPrice,
            membershipType: null,
            isDiscounted: false,
            savings: 0,
          });
          setShowPaymentModal(true);
        } else {
          await completeRegistration(eventId);
        }
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Try to complete registration anyway for free events
      const event = events.find(e => e.id === eventId);
      if (!event?.price || event.price === 0) {
        await completeRegistration(eventId);
      } else {
        Alert.alert(t('common.error'), t('events.pricingError'));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Complete registration after payment (or for free events)
  const completeRegistration = async (eventId: string, paymentIntentId?: string) => {
    if (!session?.access_token || !user?.id) return;

    setIsRegistering(true);

    try {
      // Try the /api/play/book endpoint first (as per implementation doc)
      const bookBody: Record<string, any> = {
        type: 'event',
        eventId,
        locationId: 1, // Default location
      };
      if (paymentIntentId) {
        bookBody.paymentIntentId = paymentIntentId;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/play/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(bookBody),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle waiver required error
        if (errorData.code === 'WAIVER_REQUIRED' || errorData.requireWaiver) {
          setPendingEventId(eventId);
          setShowWaiverModal(true);
          return;
        }

        // Handle event full error
        if (errorData.code === 'EVENT_FULL') {
          Alert.alert(t('common.error'), t('events.eventFull'));
          return;
        }

        // Fallback to /api/events/register if /api/play/book returns 404
        if (response.status === 404) {
          console.log('play/book API returned 404, trying events/register');
          const fallbackResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              eventId,
              userId: user.id,
              ...(paymentIntentId ? { paymentIntentId } : {}),
            }),
          });

          if (!fallbackResponse.ok) {
            const fallbackError = await fallbackResponse.json();
            throw new Error(fallbackError.error || t('events.registrationFailed'));
          }
        } else {
          throw new Error(errorData.error || t('events.registrationFailed'));
        }
      }

      // Update local state
      updateLocalStateAfterRegistration(eventId);

      // Close modals
      setShowPaymentModal(false);
      setShowEventModal(false);
      setPendingEventId(null);
      setEventPricing(null);

      Alert.alert(t('common.success'), t('events.registerSuccess'));

      // Refresh user registrations
      loadUserRegistrations();
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('events.registrationFailed'));
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle payment success callback
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (pendingEventId) {
      await completeRegistration(pendingEventId, paymentIntentId);
    }
  };

  // Update local state after successful registration
  const updateLocalStateAfterRegistration = (eventId: string) => {
    // Update local registration state
    setLocalRegistrationState(prev => ({
      ...prev,
      [eventId]: true
    }));

    const participantData = {
      userId: user?.id || '',
      firstName: user?.user_metadata?.first_name || 'You',
      lastInitial: (user?.user_metadata?.last_name || 'U')[0]
    };

    // Update events
    setEvents(prev => prev.map(event =>
      event.id === eventId
        ? {
            ...event,
            isRegistered: true,
            currentParticipants: (event.currentParticipants || 0) + 1,
            participants: [...(event.participants || []), participantData]
          }
        : event
    ));

    // Update selected event
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(prev => prev ? {
        ...prev,
        isRegistered: true,
        currentParticipants: (prev.currentParticipants || 0) + 1,
        participants: [...(prev.participants || []), participantData]
      } : null);
    }
  };

  // Main event registration handler
  const handleEventRegister = async (eventId: string) => {
    if (!session?.access_token || !user?.id) {
      Alert.alert(t('common.error'), t('common.signInToRegister'));
      return;
    }

    // Store the event ID for later use
    setPendingEventId(eventId);

    // Check capacity first
    const event = events.find(e => e.id === eventId);
    if (event && event.maxParticipants && event.currentParticipants !== undefined) {
      if (event.currentParticipants >= event.maxParticipants) {
        Alert.alert(t('common.error'), t('events.eventFull'));
        return;
      }
    }

    // Check waiver status
    if (profile && !profile.has_signed_waiver) {
      setShowWaiverModal(true);
      return;
    }

    // Proceed with pricing and registration
    await fetchEventPricingAndProceed(eventId);
  };

  const handleEventUnregister = async (eventId: string) => {
    if (!session?.access_token || !user?.id) {
      Alert.alert(t('common.error'), t('play.signInToView'));
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Unregistration failed');
      }

      // Update local registration state
      setLocalRegistrationState(prev => ({
        ...prev,
        [eventId]: false
      }));

      // Update local state to reflect unregistration
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { 
              ...event, 
              isRegistered: false, 
              currentParticipants: Math.max((event.currentParticipants || 1) - 1, 0),
              participants: (event.participants || []).filter(p => p.userId !== user.id)
            }
          : event
      ));

      // Update selected event if it's the same event
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(prev => prev ? {
          ...prev,
          isRegistered: false,
          currentParticipants: Math.max((prev.currentParticipants || 1) - 1, 0),
          participants: (prev.participants || []).filter(p => p.userId !== user.id)
        } : null);
      }

      Alert.alert(t('common.success'), t('events.unregisterSuccess'));
      
      // Refresh user registrations to remove the unregistered event
      loadUserRegistrations();
    } catch (error) {
      console.error('Unregistration error:', error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('events.unregisterError'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A62A2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.pageTitle}>{t('play.title')}</Text>
          </View>
          
          <View style={styles.centerSection}>
            <Image 
              source={{ uri: 'https://omqdrgqzlksexruickvh.supabase.co/storage/v1/object/public/email-images/thePickleCoLogoBlue.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.rightSection}>
            <LanguageSwitcher />
          </View>
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2A62A2']}
            tintColor="#2A62A2"
          />
        }
      >

        {/* Membership Promotion - at the top */}
        <MembershipPromoCard 
          hasActiveMembership={!!profile?.active_membership} 
          membershipType={profile?.active_membership?.membership_types?.name}
        />

        {/* User Registrations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('play.yourRegistrations')}</Text>
          </View>
          <UserRegistrations
            registrations={userRegistrations}
            onEventPress={handleEventSelect}
            onBrowseEvents={() => navigation.navigate('Calendar')}
          />
        </View>

        {/* Coaches Section */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('play.coaches')}</Text>
          </View>
          <CoachesSection 
            coaches={coaches}
            onBookLesson={handleBookLesson}
          />
        </View>

      </ScrollView>

      {/* Event Modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          visible={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onRegister={handleEventRegister}
          onUnregister={handleEventUnregister}
        />
      )}

      {/* Lesson Booking Wizard */}
      <LessonBookingWizard
        visible={showLessonWizard}
        initialCoachId={selectedCoach?.id}
        onClose={() => {
          setShowLessonWizard(false);
          setSelectedCoach(null);
        }}
        onSuccess={handleLessonWizardSuccess}
      />

      {/* Waiver Modal */}
      <WaiverModal
        visible={showWaiverModal}
        onClose={() => {
          setShowWaiverModal(false);
          setPendingEventId(null);
        }}
        onAccept={handleWaiverAccept}
      />

      {/* Event Payment Modal */}
      {pendingEventId && eventPricing && (
        <EventPaymentModal
          visible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingEventId(null);
            setEventPricing(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
          eventId={pendingEventId}
          eventName={selectedEvent?.title || events.find(e => e.id === pendingEventId)?.title || t('common.event')}
          pricing={eventPricing}
          isLoading={isRegistering}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  logo: {
    width: 60,
    height: 28,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A62A2',
  },
  languageSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A62A2',
    marginRight: 4,
  },
  languageArrow: {
    fontSize: 10,
    color: '#64748B',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  lastSection: {
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#020817',
  },
});