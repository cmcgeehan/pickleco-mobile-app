import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { useFeatureFlag } from '@/stores/featureFlagsStore';

const { width, height } = Dimensions.get('window');

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  onViewAllEvents: () => void;
  onBookLesson: () => void;
  onReserveCourt: () => void;
}

export default function ActionModal({
  visible,
  onClose,
  onViewAllEvents,
  onBookLesson,
  onReserveCourt,
}: ActionModalProps) {
  const { t } = useTranslation();
  const lessonBookingEnabled = useFeatureFlag('lessonBookingEnabled');
  const courtReservationEnabled = useFeatureFlag('courtReservationEnabled');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
            <Text style={styles.title}>{t('quickActions.title')}</Text>
            <Text style={styles.subtitle}>{t('quickActions.subtitle')}</Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onViewAllEvents();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionEmoji}>📅</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>{t('quickActions.viewAllEvents')}</Text>
                <Text style={styles.actionDescription}>{t('quickActions.viewAllEventsDescription')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, !lessonBookingEnabled && styles.disabledButton]}
              onPress={() => {
                if (lessonBookingEnabled) {
                  onBookLesson();
                  onClose();
                } else {
                  Alert.alert(t('quickActions.comingSoonTitle'), t('quickActions.lessonBookingMessage'));
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionEmoji}>🎓</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, !lessonBookingEnabled && styles.disabledText]}>{t('quickActions.bookLesson')}</Text>
                <Text style={[styles.actionDescription, !lessonBookingEnabled && styles.disabledText]}>{t('quickActions.bookLessonDescription')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, !courtReservationEnabled && styles.disabledButton]}
              onPress={() => {
                if (courtReservationEnabled) {
                  onReserveCourt();
                  onClose();
                } else {
                  Alert.alert(t('quickActions.comingSoonTitle'), t('quickActions.courtReservationMessage'));
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionEmoji}>🏓</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, !courtReservationEnabled && styles.disabledText]}>{t('quickActions.reserveCourt')}</Text>
                <Text style={[styles.actionDescription, !courtReservationEnabled && styles.disabledText]}>{t('quickActions.reserveCourtDescription')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>{t('quickActions.cancel')}</Text>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  disabledText: {
    color: '#94A3B8',
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});