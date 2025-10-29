import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarEvent } from '../types/events';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface EventSpotlightProps {
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
}

const EVENT_TYPE_COLORS: { [key: string]: string } = {
  'Clinic': '#2A62A2',
  'Tournament': '#bed61e',
  'Private Event': '#819DBD',
  'Social Event': '#FF5964',
};

export default function EventSpotlight({ events, onEventSelect }: EventSpotlightProps) {
  const { t } = useTranslation();
  const spotlightEvents = events.filter(event => event.isSpotlight);

  const renderSpotlightEvent = (event: CalendarEvent) => {
    const eventStart = new Date(event.start);
    const spotsLeft = (event.maxParticipants || 0) - (event.currentParticipants || 0);

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.spotlightCard}
        onPress={() => onEventSelect?.(event)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.image_path || 'https://via.placeholder.com/300x200' }}
            style={styles.eventImage}
            defaultSource={{ uri: 'https://via.placeholder.com/300x200' }}
          />
          <View style={styles.overlay} />
          
          {/* Top row: Type badge only */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.eventTypeBadge,
                { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#64748B' }
              ]}
            >
              <Text style={styles.eventTypeText}>{event.type}</Text>
            </View>
          </View>

          {/* Bottom content */}
          <View style={styles.bottomContent}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>
            
            <Text style={styles.eventDate}>
              {format(eventStart, 'MMM d')} • {format(eventStart, 'h:mm a')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (spotlightEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={styles.emptyText}>{t('common.noFeaturedEvents')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      style={styles.container}
    >
      {spotlightEvents.map(renderSpotlightEvent)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  spotlightCard: {
    width: width * 0.75,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 140,
    justifyContent: 'space-between',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 12,
    zIndex: 3,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  priceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priceText: {
    color: '#bed61e',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 8,
    zIndex: 3,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventDate: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  spotsText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
    backgroundColor: 'rgba(42, 98, 162, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  spotsTextLow: {
    backgroundColor: 'rgba(255, 89, 100, 0.8)',
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
});