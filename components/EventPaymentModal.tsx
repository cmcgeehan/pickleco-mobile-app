import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuthStore } from '@/stores/authStore';

const { height } = Dimensions.get('window');

interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default?: boolean;
}

interface PricingInfo {
  basePrice: number;
  userPrice: number;
  membershipType: string | null;
  isDiscounted: boolean;
  savings: number;
}

interface EventPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentIntentId: string) => void;
  eventId: string;
  eventName: string;
  pricing: PricingInfo;
  isLoading?: boolean;
}

export default function EventPaymentModal({
  visible,
  onClose,
  onPaymentSuccess,
  eventId,
  eventName,
  pricing,
  isLoading: externalLoading = false,
}: EventPaymentModalProps) {
  const { t } = useTranslation();
  const { session, user } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMethods, setIsFetchingMethods] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchPaymentMethods();
    }
  }, [visible]);

  const fetchPaymentMethods = async () => {
    if (!session?.access_token || !user?.id) {
      console.log('fetchPaymentMethods: No session or user');
      return;
    }

    console.log('Fetching payment methods for user:', user.id);
    setIsFetchingMethods(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/stripe/payment-methods?userId=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      console.log('Payment methods response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Payment methods data:', data);
        setPaymentMethods(data.paymentMethods || []);

        // Auto-select default method
        const defaultMethod = data.paymentMethods?.find((m: PaymentMethod) => m.is_default);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        } else if (data.paymentMethods?.length > 0) {
          setSelectedMethodId(data.paymentMethods[0].id);
        }
      } else {
        const errorText = await response.text();
        console.error('Payment methods fetch failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsFetchingMethods(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!session?.access_token) return;

    console.log('Adding payment method for user:', user?.id);
    setIsLoading(true);
    try {
      // Create SetupIntent for adding a new card
      // Pass testMode flag so backend knows which Stripe keys to use
      const setupResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-Stripe-Test-Mode': __DEV__ ? 'true' : 'false',
        },
        body: JSON.stringify({ userId: user?.id, testMode: __DEV__ }),
      });

      console.log('Setup intent response status:', setupResponse.status);

      if (!setupResponse.ok) {
        const errorText = await setupResponse.text();
        console.error('Setup intent failed:', setupResponse.status, errorText);
        throw new Error('Failed to create setup intent');
      }

      const setupData = await setupResponse.json();
      console.log('Setup intent data:', setupData);

      // Initialize payment sheet with SetupIntent
      console.log('Initializing payment sheet with client_secret...');
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: setupData.client_secret,
        merchantDisplayName: 'The Pickle Co',
        returnURL: 'thepickleco://stripe-redirect',
      });

      if (initError) {
        console.error('Error initializing payment sheet:', initError);
        Alert.alert(t('common.error'), initError.message);
        return;
      }

      console.log('Payment sheet initialized, presenting...');
      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      console.log('Payment sheet presented, error:', presentError);

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert(t('common.error'), presentError.message);
        }
        return;
      }

      // Card added successfully - refresh payment methods
      await fetchPaymentMethods();
      Alert.alert(t('common.success'), t('payment.cardAdded'));
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert(t('common.error'), t('payment.addCardFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethodId || !session?.access_token || !user?.id) {
      Alert.alert(t('common.error'), t('payment.selectMethod'));
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Amount must be in centavos (smallest currency unit)
      // Use Math.round to match backend's rounding behavior
      const amountInCentavos = Math.round(pricing.userPrice * 100);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          paymentMethodId: selectedMethodId,
          amount: amountInCentavos,
          currency: 'mxn',
          metadata: {
            userId: user.id,
            type: 'event_registration',
            eventId: eventId,
            description: eventName,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Customer not found') {
          Alert.alert(t('common.error'), t('payment.customerNotFound'));
        } else if (data.error === 'Payment method not authorized') {
          Alert.alert(t('common.error'), t('payment.methodNotAuthorized'));
          await fetchPaymentMethods();
        } else {
          Alert.alert(t('common.error'), data.error || t('payment.failed'));
        }
        return;
      }

      // Payment successful - complete registration with payment intent ID
      onPaymentSuccess(data.payment.id);
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(t('common.error'), t('payment.failed'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 Amex';
      default:
        return '💳 Card';
    }
  };

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const isButtonDisabled = isLoading || isProcessingPayment || externalLoading || !selectedMethodId;

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

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{t('payment.completePayment')}</Text>
            </View>

            {/* Event Info */}
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{eventName}</Text>
            </View>

            {/* Pricing Summary */}
            <View style={styles.pricingSection}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('payment.basePrice')}</Text>
                <Text style={styles.priceValue}>${pricing.basePrice} MXN</Text>
              </View>

              {pricing.isDiscounted && pricing.membershipType && (
                <>
                  <View style={styles.priceRow}>
                    <Text style={styles.discountLabel}>
                      {pricing.membershipType} {t('payment.discount')}
                    </Text>
                    <Text style={styles.discountValue}>-${pricing.savings} MXN</Text>
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>{t('payment.total')}</Text>
                <Text style={styles.totalValue}>${pricing.userPrice} MXN</Text>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentMethodsSection}>
              <Text style={styles.sectionTitle}>{t('payment.selectPaymentMethod')}</Text>

              {isFetchingMethods ? (
                <ActivityIndicator size="small" color="#2A62A2" style={styles.loader} />
              ) : paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      selectedMethodId === method.id && styles.selectedMethodCard,
                    ]}
                    onPress={() => setSelectedMethodId(method.id)}
                  >
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodBrand}>
                        {getCardBrandIcon(method.card.brand)}
                      </Text>
                      <Text style={styles.methodLast4}>•••• {method.card.last4}</Text>
                      <Text style={styles.methodExpiry}>
                        {formatExpiry(method.card.exp_month, method.card.exp_year)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedMethodId === method.id && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedMethodId === method.id && <View style={styles.radioButtonInner} />}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noMethodsText}>{t('payment.noSavedMethods')}</Text>
              )}

              <TouchableOpacity
                style={styles.addMethodButton}
                onPress={handleAddPaymentMethod}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#2A62A2" />
                ) : (
                  <Text style={styles.addMethodText}>+ {t('payment.addNewCard')}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmButton, isButtonDisabled && styles.confirmButtonDisabled]}
              onPress={handleConfirmPayment}
              disabled={isButtonDisabled}
            >
              {isProcessingPayment || externalLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {t('payment.payAmount', { amount: pricing.userPrice })}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
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
    maxHeight: height * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeText: {
    fontSize: 18,
    color: '#64748B',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#020817',
  },
  eventInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  eventName: {
    fontSize: 16,
    color: '#64748B',
  },
  pricingSection: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  priceValue: {
    fontSize: 14,
    color: '#020817',
  },
  discountLabel: {
    fontSize: 14,
    color: '#059669',
  },
  discountValue: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A62A2',
  },
  paymentMethodsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 12,
  },
  loader: {
    paddingVertical: 20,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  selectedMethodCard: {
    borderColor: '#2A62A2',
    backgroundColor: '#EBF5FF',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodBrand: {
    fontSize: 14,
    fontWeight: '500',
    color: '#020817',
  },
  methodLast4: {
    fontSize: 14,
    color: '#64748B',
  },
  methodExpiry: {
    fontSize: 12,
    color: '#94A3B8',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2A62A2',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2A62A2',
  },
  noMethodsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 16,
  },
  addMethodButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addMethodText: {
    fontSize: 14,
    color: '#2A62A2',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#2A62A2',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});
