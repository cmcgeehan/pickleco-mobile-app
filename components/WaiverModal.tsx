import React, { useState } from 'react';
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/stores/authStore';

const { width, height } = Dimensions.get('window');

interface WaiverModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => Promise<void>;
}

export default function WaiverModal({
  visible,
  onClose,
  onAccept,
}: WaiverModalProps) {
  const { user } = useAuthStore();
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    if (!hasAgreed || isLoading) return;
    
    setIsLoading(true);
    try {
      await onAccept();
      onClose();
    } catch (error) {
      console.error('Error accepting waiver:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const waiverContent = `WAIVER OF LIABILITY AND ASSUMPTION OF RISK

By participating in pickleball activities at The Pickle Co, I acknowledge that I am voluntarily participating in recreational activities that involve inherent risks of injury.

ASSUMPTION OF RISK
I understand and acknowledge that:
• Pickleball involves physical activity and contact with equipment, other players, and playing surfaces
• Injuries can occur from falls, collisions, overexertion, or equipment malfunction
• Weather conditions and court surfaces may create additional hazards
• I am participating at my own risk

WAIVER OF LIABILITY
In consideration for being allowed to participate, I hereby:
• Waive and release The Pickle Co, its owners, employees, and affiliates from any liability for injuries
• Assume full responsibility for any injuries or damages that may occur
• Agree not to sue or hold liable The Pickle Co for any accidents or injuries

MEDICAL CONDITIONS
I represent that:
• I am in good physical condition and have no medical conditions that would prevent safe participation
• I will immediately notify staff of any injuries or medical emergencies
• I am responsible for my own medical insurance and medical care

RULES AND CONDUCT
I agree to:
• Follow all facility rules and staff instructions
• Play in a safe and sportsmanlike manner
• Respect other players and facility property
• Use appropriate equipment and attire

This waiver shall remain in effect for all future visits and activities at The Pickle Co until revoked in writing.

By signing below, I acknowledge that I have read and understood this waiver, and I voluntarily agree to its terms.`;

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
          <View style={styles.modalHandle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Liability Waiver</Text>
            <Text style={styles.subtitle}>Please read and accept to continue</Text>
          </View>

          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.waiverText}>{waiverContent}</Text>
          </ScrollView>

          <View style={styles.agreementContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setHasAgreed(!hasAgreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, hasAgreed && styles.checkboxChecked]}>
                {hasAgreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.agreementText}>
                I have read and agree to the terms above
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.acceptButton,
                (!hasAgreed || isLoading) && styles.disabledButton,
              ]}
              onPress={handleAccept}
              disabled={!hasAgreed || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
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
  contentContainer: {
    maxHeight: height * 0.5,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginHorizontal: 20,
    backgroundColor: '#F8F9FA',
  },
  waiverText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    paddingVertical: 16,
  },
  agreementContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#2A62A2',
    borderColor: '#2A62A2',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  agreementText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
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
  acceptButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#2A62A2',
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});