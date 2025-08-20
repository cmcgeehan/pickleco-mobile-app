import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { MembershipType } from '@/lib/membershipService';

interface MembershipCardProps {
  membership: MembershipType;
  onSelect: () => void;
  isSelected?: boolean;
  onPayToPlaySelect?: () => void;
}

export default function MembershipCard({ membership, onSelect, isSelected, onPayToPlaySelect }: MembershipCardProps) {
  const isPayToPlay = membership.name === 'pay_to_play';
  const isStandard = membership.name === 'standard';
  const isUltimate = membership.name === 'ultimate';

  return (
    <Pressable
      style={[
        styles.card,
        isSelected && styles.selectedCard,
        isUltimate && styles.ultimateCard,
      ]}
      onPress={onSelect}
    >
      {isUltimate && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Text style={[styles.membershipName, isUltimate && styles.ultimateText]}>
          {membership.displayName || membership.name}
        </Text>
        
        <View style={styles.priceContainer}>
          {isPayToPlay ? (
            <Text style={[styles.price, styles.payToPlayPrice]}>Pay Per Event</Text>
          ) : (
            <>
              <Text style={[styles.price, isUltimate && styles.ultimatePrice]}>
                ${membership.cost_mxn?.toLocaleString()} mxn
              </Text>
              <Text style={[styles.pricePeriod, isUltimate && styles.ultimatePeriod]}>
                /month
              </Text>
            </>
          )}
        </View>
        {isStandard && (
          <Text style={styles.perMonthLabel}>per month</Text>
        )}
        {isUltimate && (
          <Text style={styles.perMonthLabel}>per month</Text>
        )}
      </View>

      {membership.description && (
        <Text style={styles.description}>{membership.description}</Text>
      )}

      {/* Features */}
      <View style={styles.featuresContainer}>
        {membership.features.map((feature, index) => {
          const isNegative = feature.startsWith('No ');
          return (
            <View key={index} style={styles.featureRow}>
              <Text style={[styles.featureIcon, isNegative && styles.negativeFeatureIcon]}>
                {isNegative ? '✗' : '✓'}
              </Text>
              <Text style={[styles.featureText, isNegative && styles.negativeFeatureText]}>
                {feature}
              </Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          isSelected && styles.selectedButton,
          isUltimate && styles.ultimateButton,
        ]}
        onPress={isPayToPlay ? onPayToPlaySelect : onSelect}
      >
        <Text style={[
          styles.selectButtonText,
          isSelected && styles.selectedButtonText,
          isUltimate && styles.ultimateButtonText,
        ]}>
          {isPayToPlay ? 'Play Now' : (isSelected ? 'Selected' : (isStandard ? 'Choose Plan' : 'Select Plan'))}
        </Text>
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedCard: {
    borderColor: '#2A62A2',
    backgroundColor: '#f8fafc',
  },
  ultimateCard: {
    borderColor: '#bed61e',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#bed61e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardHeader: {
    marginBottom: 16,
  },
  membershipName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  ultimateText: {
    color: '#bed61e',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2A62A2',
  },
  ultimatePrice: {
    color: '#bed61e',
  },
  payToPlayPrice: {
    fontSize: 20,
    color: '#bed61e',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 4,
  },
  ultimatePeriod: {
    color: '#819DBD',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 16,
    color: '#bed61e',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  negativeFeatureIcon: {
    color: '#ef4444',
  },
  negativeFeatureText: {
    color: '#6b7280',
  },
  perMonthLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  selectButton: {
    backgroundColor: '#2A62A2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#bed61e',
  },
  ultimateButton: {
    backgroundColor: '#bed61e',
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedButtonText: {
    color: '#ffffff',
  },
  ultimateButtonText: {
    color: '#ffffff',
  },
});