import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  RefreshControl,
} from 'react-native';
import { stripeService, StripePaymentRecord } from '@/lib/stripeService';

// Use the Stripe types from the service
type PaymentRecord = StripePaymentRecord;

interface PaymentHistoryProps {
  userId?: string;
  onRefresh?: () => void;
}

export default function PaymentHistory({ userId, onRefresh: parentOnRefresh }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPaymentHistory();
  }, [userId]);

  const loadPaymentHistory = async (showRefreshIndicator = false) => {
    if (!userId) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      const history = await stripeService.fetchPaymentHistory(userId);
      console.log('Payment history data:', history);
      setPayments(history);
    } catch (error) {
      console.error('Error loading payment history:', error);
      // Show empty state - could be server error, authentication issue, or no payments yet
      // Don't show alert to user since this is likely a backend issue being worked on
      setPayments([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadPaymentHistory(true);
    if (parentOnRefresh) {
      parentOnRefresh();
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const value = amount / 100; // Stripe amounts are in cents
    return `$${value.toLocaleString()} ${currency.toUpperCase()}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return '#bed61e';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      case 'canceled':
        return '#64748B';
      default:
        return '#64748B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'canceled':
        return 'Canceled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleViewReceipt = async (receiptUrl?: string) => {
    if (!receiptUrl) {
      Alert.alert('Receipt Unavailable', 'No receipt is available for this payment.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(receiptUrl);
      if (canOpen) {
        await Linking.openURL(receiptUrl);
      } else {
        Alert.alert('Error', 'Unable to open receipt. Please try again later.');
      }
    } catch (error) {
      console.error('Error opening receipt:', error);
      Alert.alert('Error', 'Failed to open receipt. Please try again.');
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const pdfUrl = await stripeService.downloadInvoice(invoiceId);
      const canOpen = await Linking.canOpenURL(pdfUrl);
      if (canOpen) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Error', 'Unable to download invoice. Please try again later.');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Error', 'Failed to download invoice. Please try again.');
    }
  };

  const formatCardInfo = (paymentMethod?: PaymentRecord['payment_method']) => {
    if (!paymentMethod?.card) {
      return null; // Don't show anything if payment method is unavailable
    }
    
    const { brand, last4 } = paymentMethod.card;
    return `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${last4}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A62A2" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Payment History</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? '🔄' : '↻'} Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No Payment History</Text>
          <Text style={styles.emptyText}>
            Your payment history will appear here after you make your first purchase.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.paymentsList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2A62A2']}
              tintColor={'#2A62A2'}
            />
          }
        >
          {payments.map((payment) => (
            <TouchableOpacity 
              key={payment.id} 
              style={styles.paymentCard}
              onPress={() => {
                if (payment.status === 'succeeded' && payment.receipt_url) {
                  handleViewReceipt(payment.receipt_url);
                }
              }}
              activeOpacity={payment.status === 'succeeded' && payment.receipt_url ? 0.7 : 1}
            >
              <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentDescription} numberOfLines={2}>
                    {payment.description}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {formatDate(payment.created)}{formatCardInfo(payment.payment_method) ? ` • ${formatCardInfo(payment.payment_method)}` : ''}
                  </Text>
                </View>
                
                <View style={styles.paymentAmount}>
                  <Text style={styles.amountText}>
                    {formatAmount(payment.amount, payment.currency)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(payment.status)}</Text>
                  </View>
                </View>
              </View>

              {payment.status === 'succeeded' && payment.receipt_url && (
                <View style={styles.receiptIndicator}>
                  <Text style={styles.receiptIndicatorText}>📄 Tap to view receipt →</Text>
                </View>
              )}

              {payment.status === 'failed' && (
                <View style={styles.failedInfo}>
                  <Text style={styles.failedText}>
                    This payment failed. Please try again or update your payment method.
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#020817',
  },
  refreshButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A62A2',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
    lineHeight: 20,
  },
  paymentsList: {
    flex: 1,
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
    marginRight: 16,
  },
  paymentDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: '#64748B',
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  receiptButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  receiptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A62A2',
  },
  failedInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  failedText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 18,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  invoiceButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  receiptIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F0F9FF',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: -16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  receiptIndicatorText: {
    fontSize: 14,
    color: '#2A62A2',
    fontWeight: '600',
    textAlign: 'center',
  },
});