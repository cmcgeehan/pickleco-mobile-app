import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import {
  MembershipType,
  validateCheckout,
  CheckoutValidation
} from '@/lib/membershipService';
import { stripeService, StripePaymentMethod } from '@/lib/stripeService';
import { supabase } from '@/lib/supabase';
import PolicyModal from './PolicyModal';

interface MembershipCheckoutWizardProps {
  visible: boolean;
  membershipType: MembershipType;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MembershipCheckoutWizard({
  visible,
  membershipType,
  onClose,
  onSuccess
}: MembershipCheckoutWizardProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const [step, setStep] = useState(2);
  const [checkoutValidation, setCheckoutValidation] = useState<CheckoutValidation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<StripePaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<StripePaymentMethod | null>(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyType, setPolicyType] = useState<'terms' | 'privacy'>('terms');

  // Initialize when modal opens
  useEffect(() => {
    if (visible) {
      initializeCheckout();
      loadPaymentMethods();
      setStep(2);
      setCheckoutValidation(null);
    }
  }, [visible]);

  const initializeCheckout = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // Default to Polanco location (ID = 5)
      const validation = await validateCheckout(
        membershipType.id,
        5, // Polanco location ID
        user.id
      );

      if (!validation.valid) {
        Alert.alert(t('checkout.validationError'), validation.errors.join('\n'));
        return;
      }

      setCheckoutValidation(validation);
    } catch (error) {
      console.error('Error validating checkout:', error);
      Alert.alert(t('common.error'), t('checkout.failedValidateCheckout'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    if (!user) return;

    try {
      setLoadingPaymentMethods(true);
      const methods = await stripeService.fetchPaymentMethods(user.id);
      console.log('Loaded payment methods:', methods);
      setPaymentMethods(methods);
      
      // Auto-select the default payment method if available
      const defaultMethod = methods.find(method => method.is_default);
      if (defaultMethod) {
        console.log('Auto-selecting default payment method:', defaultMethod);
        setSelectedPaymentMethod(defaultMethod);
      } else if (methods.length > 0) {
        console.log('Auto-selecting first payment method:', methods[0]);
        setSelectedPaymentMethod(methods[0]);
      } else {
        console.log('No payment methods found');
        setSelectedPaymentMethod(null);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      // Show error but don't crash the flow
      setPaymentMethods([]);
      setSelectedPaymentMethod(null);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!user) return;

    const success = await stripeService.addPaymentMethod(user.id);
    if (success) {
      // Reload payment methods after successful addition
      await loadPaymentMethods();
    }
  };


  const handleProceedToPayment = async () => {
    if (!user || !checkoutValidation) return;

    console.log('Starting payment process...');
    console.log('Selected payment method:', selectedPaymentMethod);
    console.log('Available payment methods:', paymentMethods);

    // Check if payment method is selected
    if (!selectedPaymentMethod) {
      console.log('No payment method selected - showing alert');
      Alert.alert(
        'Payment Method Required',
        'Please add a payment method to complete your purchase.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsProcessing(true);

      // Convert to centavos (Stripe requires smallest currency unit)
      const amount = checkoutValidation.totalAmount * 100;

      // Get session for authentication
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Use confirm-payment endpoint for saved cards (Flow 2 from stripe-update doc)
      // This matches the web flow for existing payment methods
      console.log('Confirming payment with saved card...');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://www.thepickleco.mx'}/api/stripe/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          paymentMethodId: selectedPaymentMethod.id,
          amount: amount,
          currency: 'mxn',
          metadata: {
            type: 'membership',
            userId: user.id,
            membershipType: membershipType.name.toLowerCase(),
            locationId: '5',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment failed');
      }

      const result = await response.json();
      console.log('Payment result:', result);

      if (result.success) {
        console.log('Payment succeeded, activating membership...');

        // Activate membership after successful payment confirmation
        const activationResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://www.thepickleco.mx'}/api/membership/activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            locationId: "5", // Polanco location ID (should match what we use in validation)
            membershipType: membershipType.name.toLowerCase() // Convert to match database names
          }),
        });

        if (!activationResponse.ok) {
          const errorText = await activationResponse.text();
          console.error('Membership activation failed:', errorText);
          
          Alert.alert(
            t('checkout.paymentProcessed'),
            t('checkout.paymentSuccessIssue'),
            [{ text: t('common.confirm'), onPress: onSuccess }]
          );
          return;
        }

        const activationResult = await activationResponse.json();
        console.log('Membership activated successfully:', activationResult);
        
        Alert.alert(
          t('checkout.welcomePickleCo'),
          t('checkout.membershipActivated'),
          [{ text: t('checkout.getStarted'), onPress: onSuccess }]
        );
        
        // Force a small delay to ensure backend has processed the payment status update
        setTimeout(() => {
          // The parent component will refresh data when onSuccess is called
        }, 1000);
      } else {
        throw new Error('Payment was not successful');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        t('checkout.paymentFailed'),
        error instanceof Error ? error.message : t('checkout.paymentIssue'),
        [{ text: t('common.confirm') }]
      );
    } finally {
      setIsProcessing(false);
    }
  };




  const renderReviewAndConfirm = () => {
    if (isLoading) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2A62A2" />
            <Text style={styles.loadingText}>{t('checkout.preparingCheckout')}</Text>
          </View>
        </View>
      );
    }

    // Check if profile is complete before showing checkout
    if (!profile?.first_name || !profile?.last_name || !profile?.phone) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>{t('checkout.profileRequired')}</Text>
          <Text style={styles.stepSubtitle}>
            {t('checkout.completeProfileMessage')}
          </Text>
          <View style={styles.profileIncompleteContainer}>
            <Text style={styles.profileIncompleteText}>{t('checkout.missingInformation')}</Text>
            {!profile?.first_name && <Text style={styles.missingItemText}>{t('checkout.firstNameMissing')}</Text>}
            {!profile?.last_name && <Text style={styles.missingItemText}>{t('checkout.lastNameMissing')}</Text>}
            {!profile?.phone && <Text style={styles.missingItemText}>{t('checkout.phoneNumberMissing')}</Text>}
          </View>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onClose}
          >
            <Text style={styles.continueButtonText}>{t('checkout.completeProfile')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{t('checkout.reviewConfirm')}</Text>

        {/* Membership Section - More Compact */}
        <View style={styles.compactReviewSection}>
          <Text style={styles.reviewSectionTitle}>{t('checkout.membershipSection')}</Text>
          <Text style={styles.reviewText}>
            {membershipType.displayName || membershipType.name}
          </Text>
          <View style={styles.foundingBadge}>
            <Text style={styles.foundingBadgeText}>{t('checkout.foundingMemberBenefits')}</Text>
          </View>
        </View>

        {/* Founding Member Benefits */}
        <View style={styles.compactReviewSection}>
          <Text style={styles.reviewSectionTitle}>{t('checkout.yourFoundingBenefits')}</Text>
          <View style={styles.benefitsList}>
            <Text style={styles.benefitItem}>{t('checkout.lowestPriceOffer')}</Text>
            <Text style={styles.benefitItem}>{t('checkout.firstMonthIncluded')}</Text>
            <Text style={styles.benefitItem}>{t('checkout.freeWeekendPlay')}</Text>
            <Text style={styles.benefitItem}>{t('checkout.softLaunchAccess')}</Text>
            <Text style={styles.benefitItem}>{t('checkout.foundersMerchandise')}</Text>
            <Text style={styles.benefitItem}>{t('checkout.barCredit')}</Text>
            <Text style={styles.benefitItem}>{t('checkout.satisfactionGuarantee')}</Text>
          </View>
        </View>

        {/* Payment Methods - Horizontal Scroll */}
        <View style={styles.compactReviewSection}>
          <Text style={styles.reviewSectionTitle}>{t('checkout.paymentMethod')}</Text>
          
          {loadingPaymentMethods ? (
            <View style={styles.loadingPaymentMethods}>
              <ActivityIndicator size="small" color="#2A62A2" />
              <Text style={styles.loadingPaymentMethodsText}>{t('checkout.loading')}</Text>
            </View>
          ) : paymentMethods.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.paymentMethodsScroll}
            >
              {paymentMethods.map((method, index) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethodCard
                  ]}
                  onPress={() => setSelectedPaymentMethod(method)}
                >
                  <Text style={styles.paymentMethodCardText}>
                    **** {method.card.last4}
                  </Text>
                  <Text style={styles.paymentMethodCardSubtext}>
                    {method.card.brand.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {/* Add New Card Button */}
              <TouchableOpacity
                style={styles.addPaymentMethodCard}
                onPress={handleAddPaymentMethod}
              >
                <Text style={styles.addPaymentMethodCardText}>{t('checkout.addCard')}</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.noPaymentMethodContainer}>
              <Text style={styles.noPaymentMethod}>{t('checkout.noPaymentMethods')}</Text>
              <TouchableOpacity
                style={styles.addPaymentMethodButton}
                onPress={handleAddPaymentMethod}
              >
                <Text style={styles.addPaymentMethodButtonText}>{t('checkout.addNewCard')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Total - Always Visible */}
        <View style={styles.totalSection}>
          <Text style={styles.reviewSectionTitle}>{t('checkout.monthlySubscription')}</Text>
          <Text style={styles.reviewPrice}>
            ${checkoutValidation?.totalAmount.toLocaleString()} MXN/month
          </Text>
          <Text style={styles.subscriptionNote}>
            {t('checkout.recurringCharge')}
          </Text>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            {t('checkout.termsAgreement')}{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => {
                console.log('Terms & Conditions pressed');
                Alert.alert(
                  t('checkout.termsConditions'),
                  t('checkout.termsMessage'),
                  [{ text: 'OK' }]
                );
              }}
            >
              {t('checkout.termsConditions')}
            </Text> {t('checkout.and')}{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => {
                console.log('Privacy Policy pressed');
                Alert.alert(
                  t('checkout.privacyPolicy'),
                  t('checkout.privacyMessage'),
                  [{ text: 'OK' }]
                );
              }}
            >
              {t('checkout.privacyPolicy')}
            </Text>.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.paymentButton,
            (!selectedPaymentMethod || isProcessing) && styles.disabledButton
          ]}
          onPress={handleProceedToPayment}
          disabled={!selectedPaymentMethod || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.paymentButtonText}>{t('checkout.startSubscription')}</Text>
          )}
        </TouchableOpacity>
        
        {/* Bottom spacing to prevent button cutoff */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  const renderCurrentStep = () => {
    // Skip profile verification, go directly to review & confirm
    return renderReviewAndConfirm();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Purchase Membership</Text>
            <View style={styles.headerSpacer} />
          </View>

          {renderCurrentStep()}
        </View>
      </Modal>

      <PolicyModal
        visible={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        type={policyType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSpacer: {
    width: 32,
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2A62A2',
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  continueButton: {
    backgroundColor: '#2A62A2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  missingField: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  reviewContainer: {
    flex: 1,
  },
  reviewSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 18,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  reviewPrice: {
    fontSize: 24,
    color: '#2A62A2',
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#bed61e',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingPaymentMethods: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingPaymentMethodsText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  selectedPaymentMethod: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentMethodSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  noPaymentMethod: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  paymentMethodButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  addPaymentMethodButton: {
    backgroundColor: '#2A62A2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addPaymentMethodButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectPaymentMethodButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectPaymentMethodButtonText: {
    color: '#2A62A2',
    fontSize: 14,
    fontWeight: '600',
  },
  compactReviewSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentMethodsScroll: {
    marginVertical: 8,
  },
  paymentMethodCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 100,
  },
  selectedPaymentMethodCard: {
    borderColor: '#2A62A2',
    backgroundColor: '#f0f9ff',
  },
  paymentMethodCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentMethodCardSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  addPaymentMethodCard: {
    backgroundColor: '#2A62A2',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  addPaymentMethodCardText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  noPaymentMethodContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  totalSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A62A2',
  },
  subscriptionNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  termsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    textAlign: 'center',
  },
  termsLink: {
    color: '#2A62A2',
    fontWeight: '600',
  },
  foundingBadge: {
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  foundingBadgeText: {
    fontSize: 12,
    color: '#2A62A2',
    fontWeight: '600',
  },
  benefitsList: {
    gap: 6,
  },
  benefitItem: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  profileIncompleteContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  profileIncompleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  missingItemText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 6,
  },
  bottomSpacing: {
    height: 40,
  },
});