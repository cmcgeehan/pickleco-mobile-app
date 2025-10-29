import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarEvent } from '../types/events';
import { format, parseISO } from 'date-fns';

const { width } = Dimensions.get('window');

interface UserRegistrationsProps {
  registrations?: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
}

const EVENT_TYPE_COLORS: { [key: string]: string } = {
  'Clinic': '#2A62A2',
  'Tournament': '#bed61e',
  'Private Event': '#819DBD',
  'Social Event': '#FF5964',
  'Private Lesson': '#9333EA',
  'Court Reservation': '#059669',
  'Event': '#64748B',
};


export default function UserRegistrations({ 
  registrations = [], 
  onEventPress 
}: UserRegistrationsProps) {
  const { t } = useTranslation();
  const renderRegistration = (event: CalendarEvent) => {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.registrationCard}
        onPress={() => onEventPress?.(event)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#64748B' }
            ]}
          >
            <Text style={styles.typeText}>{event.type}</Text>
          </View>
          {event.price !== undefined && (
            <Text style={styles.price}>${event.price}</Text>
          )}
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.timeLocationContainer}>
          <Text style={styles.time}>
            {format(eventStart, 'MMM d')} • {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
          </Text>
          <Text style={styles.location}>📍 {event.location}</Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{t('common.registered')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (registrations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>{t('common.noRegistrations')}</Text>
        <Text style={styles.emptyText}>
          {t('common.noRegistrationsText')}
        </Text>
        <TouchableOpacity style={styles.browseButton}>
          <Text style={styles.browseButtonText}>{t('common.browseEvents')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {registrations.map(renderRegistration)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -20,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingRight: 20,
  },
  registrationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: width * 0.75,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bed61e',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  timeLocationContainer: {
    marginBottom: 12,
  },
  time: {
    fontSize: 14,
    color: '#2A62A2',
    fontWeight: '500',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#64748B',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2A62A2',
  },
  statusText: {
    color: '#2A62A2',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: '#2A62A2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});