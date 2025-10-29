import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { CalendarEvent, EventParticipant } from '../types/events';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

const EVENT_TYPE_COLORS: { [key: string]: string } = {
  'Clinic': '#2A62A2',
  'Tournament': '#bed61e',
  'Private Event': '#819DBD',
  'Social Event': '#FF5964',
  'Private Lesson': '#9333EA',
  'Court Reservation': '#059669',
  'Event': '#64748B',
  'Other': '#64748B',
};

interface EventModalProps {
  event: CalendarEvent | null;
  visible: boolean;
  onClose: () => void;
  onRegister: (eventId: string) => void;
  onUnregister: (eventId: string) => void;
}

function EventModal(props: EventModalProps) {
  const { t } = useTranslation();
  
  if (!props?.event) return null;

  const event = props.event;
  const visible = props.visible;
  const onClose = props.onClose;
  const onRegister = props.onRegister;
  const onUnregister = props.onUnregister;


  // Defensive date parsing
  let eventStart: Date, eventEnd: Date;
  try {
    eventStart = new Date(event.start);
    eventEnd = new Date(event.end);
    if (isNaN(eventStart.getTime())) eventStart = new Date();
    if (isNaN(eventEnd.getTime())) eventEnd = new Date();
  } catch (error) {
    console.warn('Error parsing event dates:', error);
    eventStart = new Date();
    eventEnd = new Date();
  }

  const spotsLeft = (event.maxParticipants || 0) - (event.currentParticipants || 0);
  const isFull = spotsLeft <= 0;
  const isRegistered = event.isRegistered || false;
  const safeParticipants = Array.isArray(event.participants) ? event.participants : [];
  
  // Handle image paths with fallback for reservations
  const defaultReservationImage = 'https://omqdrgqzlksexruickvh.supabase.co/storage/v1/object/public/event-images/default_reservation.png';
  let hasImage = false;
  let safeImagePath = '';
  
  if (event.image_path && typeof event.image_path === 'string' && event.image_path.trim() !== '') {
    // Event has a proper image
    hasImage = true;
    safeImagePath = event.image_path;
  } else if (event.type === 'Other' || event.title?.toLowerCase().includes('reservation')) {
    // Court reservation without image - use fallback
    hasImage = true;
    safeImagePath = defaultReservationImage;
  }

  const handleActionPress = () => {
    if (isRegistered) {
      onUnregister(event.id);
    } else {
      onRegister(event.id);
    }
    onClose();
  };

  return (
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
          {!hasImage && <View style={styles.modalHandle} />}
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {hasImage && (
              <View style={styles.imageContainer}>
                <View style={styles.modalHandleOverlay} />
                <Image
                  source={{ uri: safeImagePath }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity onPress={onClose} style={styles.closeButtonOverlay}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={[styles.header, hasImage && styles.headerWithImage]}>
              {!hasImage && (
                <View style={styles.headerTop}>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#64748B' }
                    ]}
                  >
                    <Text style={styles.typeText}>{event.type || t('common.event') || 'Event'}</Text>
                  </View>
                </View>
              )}
              
              {hasImage && (
                <View style={styles.headerTopWithImage}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#64748B' }
                    ]}
                  >
                    <Text style={styles.typeText}>{event.type || t('common.event') || 'Event'}</Text>
                  </View>
                </View>
              )}
              
              <Text style={styles.title}>{event.title || t('common.untitledEvent')}</Text>
              
              {(typeof event.price === 'number' && event.price > 0) ? (
                <Text style={styles.price}>${event.price.toString()}</Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Text style={styles.icon}>📅</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('common.dateTime')}</Text>
                  <Text style={styles.infoText}>
                    {format(eventStart, 'EEEE, MMMM d, yyyy')}
                  </Text>
                  <Text style={styles.infoText}>
                    {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Text style={styles.icon}>📍</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('common.location')}</Text>
                  <Text style={styles.infoText}>{event.location || t('common.tbd')}</Text>
                  <Text style={styles.infoSubtext}>{t('common.thePickleCo')}</Text>
                </View>
              </View>
            </View>

            {(typeof event.maxParticipants === 'number' && event.maxParticipants > 0) ? (
              <View style={styles.section}>
                <View style={styles.infoRow}>
                  <Text style={styles.icon}>👥</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{t('common.capacity')}</Text>
                    <Text style={styles.infoText}>
                      {(event.currentParticipants || 0).toString()} / {(event.maxParticipants || 0).toString()} {t('common.participants')}
                    </Text>
                    {!isFull && (
                      <Text style={[
                        styles.spotsText,
                        spotsLeft <= 3 && styles.spotsTextLow
                      ]}>
                        {spotsLeft.toString()} {t('common.spotsRemaining')}
                      </Text>
                    )}
                    {isFull && (
                      <Text style={styles.fullText}>{t('common.eventIsFull')}</Text>
                    )}
                  </View>
                </View>
              </View>
            ) : null}

            {event.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('common.aboutThisEvent')}</Text>
                <Text style={styles.description}>{event.description}</Text>
              </View>
            ) : null}

            {(safeParticipants && safeParticipants.length > 0) ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('events.participants')} ({safeParticipants.length.toString()})</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.participantsScrollContainer}
                >
                  <View style={styles.participantsContainer}>
                    {safeParticipants.slice(0, 5).map((participant, index) => {
                      const firstName = participant?.firstName && typeof participant.firstName === 'string' ? participant.firstName : '';
                      const lastInitial = participant?.lastInitial && typeof participant.lastInitial === 'string' ? participant.lastInitial : '';
                      
                      return (
                        <View key={index} style={styles.participantItem}>
                          <View style={styles.participantAvatar}>
                            <Text style={styles.participantInitials}>
                              {firstName[0] || ''}{lastInitial}
                            </Text>
                          </View>
                          <Text style={styles.participantName}>
                            {firstName} {lastInitial}.
                          </Text>
                        </View>
                      );
                    })}
                    {safeParticipants.length > 5 && (
                      <View style={styles.moreParticipants}>
                        <Text style={styles.moreParticipantsText}>
                          +{(safeParticipants.length - 5).toString()} {t('common.more')}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.actionButton,
                isRegistered && styles.unregisterButton,
                isFull && !isRegistered && styles.disabledButton,
              ]}
              onPress={handleActionPress}
              disabled={isFull && !isRegistered}
            >
              <Text style={[
                styles.actionButtonText,
                isRegistered && styles.unregisterButtonText,
              ]}>
                {isRegistered 
                  ? t('common.cancelRegistration')
                  : isFull 
                    ? t('common.eventFull')
                    : t('common.registerForEvent')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default EventModal;

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
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalHandleOverlay: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
    zIndex: 10,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 16,
  },
  closeButtonOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  headerWithImage: {
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  headerTopWithImage: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#64748B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#bed61e',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#020817',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  spotsText: {
    fontSize: 14,
    color: '#2A62A2',
    marginTop: 4,
    fontWeight: '500',
  },
  spotsTextLow: {
    color: '#FF5964',
  },
  fullText: {
    fontSize: 14,
    color: '#FF5964',
    marginTop: 4,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    color: '#020817',
    lineHeight: 22,
  },
  participantsScrollContainer: {
    paddingRight: 20,
  },
  participantsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A62A2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  participantInitials: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  participantName: {
    fontSize: 14,
    color: '#020817',
    fontWeight: '500',
  },
  moreParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  moreParticipantsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#2A62A2',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  unregisterButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  disabledButton: {
    backgroundColor: '#E2E8F0',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  unregisterButtonText: {
    color: '#64748B',
  },
});