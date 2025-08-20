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
import { CalendarEvent, EventParticipant } from '../types/events';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

interface EventModalProps {
  event: CalendarEvent | null;
  visible: boolean;
  onClose: () => void;
  onRegister: (eventId: string) => void;
  onUnregister: (eventId: string) => void;
}

const EVENT_TYPE_COLORS: { [key: string]: string } = {
  'Clinic': '#2A62A2',
  'Tournament': '#bed61e',
  'Private Event': '#819DBD',
  'Social Event': '#FF5964',
};

export default function EventModal({
  event,
  visible,
  onClose,
  onRegister,
  onUnregister,
}: EventModalProps) {
  if (!event) return null;

  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  const spotsLeft = (event.maxParticipants || 0) - (event.currentParticipants || 0);
  const isFull = spotsLeft <= 0;
  const isRegistered = event.isRegistered || false;

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
          {!event.image_path && <View style={styles.modalHandle} />}
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Event Image */}
            {event.image_path && (
              <View style={styles.imageContainer}>
                <View style={styles.modalHandleOverlay} />
                <Image
                  source={{ uri: event.image_path }}
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

            {/* Header */}
            <View style={[styles.header, event.image_path && styles.headerWithImage]}>
              {!event.image_path && (
                <View style={styles.headerTop}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#64748B' }
                    ]}
                  >
                    <Text style={styles.typeText}>{event.type}</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {event.image_path && (
                <View style={styles.headerTopWithImage}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#64748B' }
                    ]}
                  >
                    <Text style={styles.typeText}>{event.type}</Text>
                  </View>
                </View>
              )}
              
              <Text style={styles.title}>{event.title}</Text>
              
              {event.price !== undefined && (
                <Text style={styles.price}>${event.price}</Text>
              )}
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Text style={styles.icon}>📅</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date & Time</Text>
                  <Text style={styles.infoText}>
                    {format(eventStart, 'EEEE, MMMM d, yyyy')}
                  </Text>
                  <Text style={styles.infoText}>
                    {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Text style={styles.icon}>📍</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoText}>{event.location}</Text>
                  <Text style={styles.infoSubtext}>The Pickle Co</Text>
                </View>
              </View>
            </View>

            {/* Capacity */}
            {event.maxParticipants && (
              <View style={styles.section}>
                <View style={styles.infoRow}>
                  <Text style={styles.icon}>👥</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Capacity</Text>
                    <Text style={styles.infoText}>
                      {event.currentParticipants} / {event.maxParticipants} participants
                    </Text>
                    {!isFull && (
                      <Text style={[
                        styles.spotsText,
                        spotsLeft <= 3 && styles.spotsTextLow
                      ]}>
                        {spotsLeft} spots remaining
                      </Text>
                    )}
                    {isFull && (
                      <Text style={styles.fullText}>Event is full</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Description */}
            {event.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About This Event</Text>
                <Text style={styles.description}>{event.description}</Text>
              </View>
            )}

            {/* Participants */}
            {event.participants && event.participants.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Participants ({event.participants.length})</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.participantsScrollContainer}
                >
                  <View style={styles.participantsContainer}>
                    {event.participants.slice(0, 5).map((participant, index) => (
                      <View key={index} style={styles.participantItem}>
                        <View style={styles.participantAvatar}>
                          <Text style={styles.participantInitials}>
                            {participant.firstName[0]}{participant.lastInitial}
                          </Text>
                        </View>
                        <Text style={styles.participantName}>
                          {participant.firstName} {participant.lastInitial}.
                        </Text>
                      </View>
                    ))}
                    {event.participants.length > 5 && (
                      <View style={styles.moreParticipants}>
                        <Text style={styles.moreParticipantsText}>
                          +{event.participants.length - 5} more
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Action Button */}
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
                  ? 'Cancel Registration' 
                  : isFull 
                    ? 'Event Full'
                    : 'Register for Event'}
              </Text>
            </TouchableOpacity>

            {/* Sign In Prompt (if needed) */}
            {false && ( // Replace with actual auth check
              <View style={styles.signInPrompt}>
                <Text style={styles.signInText}>
                  Please sign in to register for events
                </Text>
                <TouchableOpacity style={styles.signInButton}>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    alignItems: 'flex-end',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  signInPrompt: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  signInText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  signInButton: {
    backgroundColor: '#2A62A2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});