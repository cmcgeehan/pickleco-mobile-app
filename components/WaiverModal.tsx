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

I understand and acknowledge that playing pickleball involves risks of serious bodily injury, including permanent disability, paralysis, and death, which may be caused by my own actions or inactions, those of others participating in the activity, the conditions in which the activity takes place, or the negligence of the "releasees" named below.

I fully accept and assume all such risks and all responsibility for losses, costs, and damages I incur as a result of my participation in the activity.

I hereby release, discharge, and covenant not to sue The Pickle Co, its respective administrators, directors, agents, officers, volunteers, employees, other participants, sponsors, advertisers, and owners and lessors of premises on which the activity takes place (each considered one of the "releasees" herein) from all liability, claims, demands, losses, or damages on my account caused or alleged to be caused in whole or in part by the negligence of the releasees.

I further agree that if, despite this release, waiver of liability, and assumption of risk, I, or anyone on my behalf, makes a claim against any of the releasees, I will indemnify, save, and hold harmless each of the releasees from any loss, liability, damage, or cost which any may incur as the result of such claim.

MEDIA RELEASE

I grant The Pickle Co permission to use my likeness, image, voice, and/or appearance as such may be embodied in any pictures, photos, video recordings, audiotapes, digital images, and the like, taken or made on behalf of The Pickle Co. I agree that The Pickle Co has complete ownership of such pictures, etc., including the entire copyright, and may use them for any purpose consistent with The Pickle Co's mission. These uses include, but are not limited to, publications, advertising, social media, and web content.

I acknowledge that I will not receive any compensation for the use of such pictures, etc., and hereby release The Pickle Co and its agents and assigns from any and all claims which arise out of or are in any way connected with such use.

By accepting below, I acknowledge that I have read and understood this waiver and media release, and I voluntarily agree to its terms.`;

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
            <Text style={styles.title}>Waiver & Media Release</Text>
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