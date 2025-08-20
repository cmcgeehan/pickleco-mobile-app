import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { UserMembership } from '@/lib/membershipService';

interface ActiveMembershipCardProps {
  membership: UserMembership;
}

export default function ActiveMembershipCard({ membership }: ActiveMembershipCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = () => {
    if (!membership.end_date) return null;
    
    const endDate = new Date(membership.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  const getDisplayName = (name: string): string => {
    const displayNames: Record<string, string> = {
      'standard': 'Standard',
      'ultimate': 'Ultimate',
      'pay_to_play': 'Pay to Play',
      'admin': 'Admin'
    };
    return displayNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <View style={[
      styles.card,
      isExpiringSoon && styles.expiringSoonCard,
      isExpired && styles.expiredCard
    ]}>
      {/* Status Badge */}
      <View style={[
        styles.statusBadge,
        isExpired ? styles.expiredBadge : styles.activeBadge
      ]}>
        <Text style={styles.statusText}>
          {isExpired ? 'EXPIRED' : 'ACTIVE'}
        </Text>
      </View>

      <View style={styles.membershipInfo}>
        <Text style={styles.membershipName}>
          {getDisplayName(membership.membership_types.name)}
        </Text>
        
        <Text style={styles.locationName}>
          {membership.locations.name}
        </Text>
      </View>

      <View style={styles.datesContainer}>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Started:</Text>
          <Text style={styles.dateValue}>
            {formatDate(membership.start_date)}
          </Text>
        </View>
        
        {membership.end_date && (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>
              {isExpired ? 'Expired:' : 'Expires:'}
            </Text>
            <Text style={[
              styles.dateValue,
              isExpiringSoon && styles.expiringDateValue,
              isExpired && styles.expiredDateValue
            ]}>
              {formatDate(membership.end_date)}
            </Text>
          </View>
        )}
        
        {daysUntilExpiry !== null && !isExpired && (
          <View style={styles.daysContainer}>
            <Text style={[
              styles.daysText,
              isExpiringSoon && styles.expiringSoonText
            ]}>
              {daysUntilExpiry === 0 ? 'Expires today' : 
               daysUntilExpiry === 1 ? 'Expires tomorrow' :
               `${daysUntilExpiry} days remaining`}
            </Text>
          </View>
        )}
      </View>

      {membership.membership_types.cost_mxn && membership.membership_types.cost_mxn > 0 && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            ${membership.membership_types.cost_mxn.toLocaleString()} MXN/month
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#bed61e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  expiringSoonCard: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  expiredCard: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
    opacity: 0.8,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#bed61e',
  },
  expiredBadge: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  membershipInfo: {
    marginBottom: 16,
    marginRight: 80,
  },
  membershipName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 18,
    color: '#2A62A2',
    fontWeight: '600',
    marginBottom: 2,
  },
  datesContainer: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  expiringDateValue: {
    color: '#f59e0b',
  },
  expiredDateValue: {
    color: '#ef4444',
  },
  daysContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  daysText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '600',
    textAlign: 'center',
  },
  expiringSoonText: {
    color: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  priceContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  priceText: {
    fontSize: 16,
    color: '#2A62A2',
    fontWeight: '600',
    textAlign: 'center',
  },
});