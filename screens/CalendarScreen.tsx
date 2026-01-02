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
  FlatList,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarEvent } from '../types/events';
import EventModal from '../components/EventModal';
import EventSpotlight from '../components/EventSpotlight';
import LanguageSwitcher from '../components/LanguageSwitcher';
import WaiverModal from '../components/WaiverModal';
import EventPaymentModal from '../components/EventPaymentModal';
import { useAuthStore } from '@/stores/authStore';
import { format, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns';

interface EventPricingInfo {
  basePrice: number;
  userPrice: number;
  membershipType: string | null;
  isDiscounted: boolean;
  savings: number;
  eventTypeId?: string;
}

const { width } = Dimensions.get('window');

const EVENT_TYPE_COLORS: { [key: string]: string } = {
  'Clinic': '#2A62A2',
  'Tournament': '#bed61e',
  'Private Event': '#819DBD',
  'Social Event': '#FF5964',
};

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { session, user, profile, updateProfile } = useAuthStore();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [spotlightEvents, setSpotlightEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [localRegistrationState, setLocalRegistrationState] = useState<Record<string, boolean>>({});

  // Waiver and payment states
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [eventPricing, setEventPricing] = useState<EventPricingInfo | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (user && session) {
      loadEvents();
    }
  }, [user, session]);

  useEffect(() => {
    filterEvents();
  }, [allEvents, selectedDate, selectedSkillLevel]);

  const loadEvents = async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/calendar?t=${Date.now()}`, {
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

      const eventsData = await response.json();
      
      // Debug: Log first event to see data structure
      if (eventsData.length > 0) {
        console.log('Sample event data structure:', JSON.stringify(eventsData[0], null, 2));
      }
      
      // Transform API data to match our CalendarEvent interface
      // Filter out private events (lessons and reservations)
      const transformedEvents: CalendarEvent[] = eventsData
        .filter((event: any) => {
          // Since we don't have event_type object, check the event name directly
          const eventName = (event.name || '').toLowerCase();
          const eventDescEn = (event.description_en || '').toLowerCase();
          const eventDescEs = (event.description_es || '').toLowerCase();
          
          // Check if this is a reservation or lesson based on name/description
          const isReservation = eventName.includes('reservation') || 
                               eventName.includes('reserva') ||
                               eventName.includes('court reservation') ||
                               eventDescEn.includes('reservation') ||
                               eventDescEs.includes('reserva');
          
          const isLesson = eventName.includes('lesson') || 
                          eventName.includes('class') ||
                          eventDescEn.includes('lesson') ||
                          eventDescEs.includes('clase');
          
          // Log filtered events for debugging
          if (isReservation || isLesson) {
            console.log(`Filtering out private event: ${event.name} - Is Reservation: ${isReservation} - Is Lesson: ${isLesson}`);
          }
          
          // Exclude if it's a reservation or lesson
          return !isReservation && !isLesson;
        })
        .map((event: any) => ({
          id: event.id,
          title: event.name,
          type: event.event_type?.name || 'Event',
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
        }));

      setAllEvents(transformedEvents);
      // Separate spotlight events for the spotlight section
      setSpotlightEvents(transformedEvents.filter(event => event.isSpotlight));
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert(t('common.error'), t('common.failedToLoadEvents'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterEvents = () => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    
    const filtered = allEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
    
    setFilteredEvents(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleEventPress = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
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
      const event = allEvents.find(e => e.id === eventId) || spotlightEvents.find(e => e.id === eventId);

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
      const event = allEvents.find(e => e.id === eventId);
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
  const completeRegistration = async (eventId: string) => {
    if (!session?.access_token || !user?.id) return;

    setIsRegistering(true);

    try {
      // Try the /api/play/book endpoint first (as per implementation doc)
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/play/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'event',
          eventId,
          locationId: 1, // Default location
        }),
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
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('events.registrationFailed'));
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle payment success callback
  const handlePaymentSuccess = async () => {
    if (pendingEventId) {
      await completeRegistration(pendingEventId);
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

    // Update all events
    setAllEvents(prev => prev.map(event =>
      event.id === eventId
        ? {
            ...event,
            isRegistered: true,
            currentParticipants: (event.currentParticipants || 0) + 1,
            participants: [...(event.participants || []), participantData]
          }
        : event
    ));

    // Update spotlight events
    setSpotlightEvents(prev => prev.map(event =>
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
    const event = allEvents.find(e => e.id === eventId) || spotlightEvents.find(e => e.id === eventId);
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
      Alert.alert(t('common.error'), t('common.signInToUnregister'));
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
      setAllEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { 
              ...event, 
              isRegistered: false, 
              currentParticipants: Math.max((event.currentParticipants || 1) - 1, 0),
              participants: (event.participants || []).filter(p => p.userId !== user.id)
            }
          : event
      ));
      
      setSpotlightEvents(prev => prev.map(event => 
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
    } catch (error) {
      console.error('Unregistration error:', error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('events.unregisterError'));
    }
  };

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return t('calendar.today');
    if (isTomorrow(date)) return t('calendar.tomorrow');
    return format(date, 'EEEE, MMMM d');
  };

  const renderEvent = ({ item }: { item: CalendarEvent }) => {
    const eventStart = new Date(item.start);
    const eventEnd = new Date(item.end);
    const spotsLeft = (item.maxParticipants || 0) - (item.currentParticipants || 0);

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.eventTimeContainer}>
          <Text style={styles.eventTime}>
            {format(eventStart, 'h:mm a')}
          </Text>
          <Text style={styles.eventDuration}>
            {format(eventEnd, 'h:mm a')}
          </Text>
        </View>
        
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <View
              style={[
                styles.eventTypeBadge,
                { backgroundColor: EVENT_TYPE_COLORS[item.type] || '#64748B' }
              ]}
            >
              <Text style={styles.eventTypeText}>{item.type}</Text>
            </View>
            {item.price !== undefined && (
              <Text style={styles.eventPrice}>${item.price}</Text>
            )}
          </View>
          
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <Text style={styles.eventLocation}>📍 {item.location}</Text>
          
          {item.maxParticipants && (
            <View style={styles.eventFooter}>
              <Text style={[
                styles.spotsText,
                ...(spotsLeft <= 3 ? [styles.spotsTextLow] : [])
              ]}>
                {spotsLeft > 0 ? t('calendar.spotsLeft', { count: spotsLeft }) : t('calendar.full')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.pageTitle}>{t('navigation.calendar')}</Text>
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
        style={styles.scrollContainer}
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
        {/* Event Spotlight Section */}
        {spotlightEvents.length > 0 && (
          <View style={styles.spotlightSection}>
            <View style={styles.spotlightHeader}>
              <Text style={styles.spotlightTitle}>{t('calendar.featuredEvents')}</Text>
              <Text style={styles.spotlightDescription}>{t('calendar.featuredEventsDescription')}</Text>
            </View>
            <EventSpotlight 
              events={spotlightEvents} 
              onEventSelect={(event) => {
                setSelectedEvent(event);
                setShowEventModal(true);
              }} 
            />
          </View>
        )}

        {/* Upcoming Events Section */}
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingSectionTitle}>{t('play.upcomingEvents')}</Text>
          
          {/* Date Picker */}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateHeader(selectedDate)}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              key="calendar-date-picker"
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'android');
                if (date) setSelectedDate(date);
              }}
            />
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedSkillLevel === 'all' && styles.filterPillActive
            ]}
            onPress={() => setSelectedSkillLevel('all')}
          >
            <Text style={[
              styles.filterPillText,
              selectedSkillLevel === 'all' && styles.filterPillTextActive
            ]}>
              {t('calendar.allLevels')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedSkillLevel === 'beginner' && styles.filterPillActive
            ]}
            onPress={() => setSelectedSkillLevel('beginner')}
          >
            <Text style={[
              styles.filterPillText,
              selectedSkillLevel === 'beginner' && styles.filterPillTextActive
            ]}>
              {t('calendar.beginner')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedSkillLevel === 'intermediate' && styles.filterPillActive
            ]}
            onPress={() => setSelectedSkillLevel('intermediate')}
          >
            <Text style={[
              styles.filterPillText,
              selectedSkillLevel === 'intermediate' && styles.filterPillTextActive
            ]}>
              {t('calendar.intermediate')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedSkillLevel === 'advanced' && styles.filterPillActive
            ]}
            onPress={() => setSelectedSkillLevel('advanced')}
          >
            <Text style={[
              styles.filterPillText,
              selectedSkillLevel === 'advanced' && styles.filterPillTextActive
            ]}>
              {t('calendar.advanced')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Events List Header */}
        <View style={styles.eventsListHeader}>
          <Text style={styles.eventsListTitle}>
            {t('calendar.eventsFor', { date: formatDateHeader(selectedDate) })}
          </Text>
        </View>

        {/* Events List */}
        {filteredEvents.length > 0 ? (
          filteredEvents.map((item) => (
            <View key={item.id} style={styles.eventCardContainer}>
              {renderEvent({ item })}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>{t('calendar.noEvents')}</Text>
            <Text style={styles.emptyText}>
              {t('calendar.noEventsDescription', { date: formatDateHeader(selectedDate) })}
            </Text>
          </View>
        )}
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
          eventName={selectedEvent?.title || allEvents.find(e => e.id === pendingEventId)?.title || t('common.event')}
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
  upcomingSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  upcomingSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A62A2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  calendarIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#2A62A2',
  },
  filterPillText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  eventsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  eventTimeContainer: {
    width: 70,
    marginRight: 12,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020817',
  },
  eventDuration: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  eventPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bed61e',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 6,
  },
  eventLocation: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotsText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  spotsTextLow: {
    color: '#FF5964',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  spotlightSection: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  spotlightHeader: {
    marginBottom: 16,
  },
  spotlightTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 4,
  },
  spotlightDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollContainer: {
    flex: 1,
  },
  eventsListHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  eventsListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
  },
  eventCardContainer: {
    paddingHorizontal: 20,
  },
});