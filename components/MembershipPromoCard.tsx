import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface MembershipPromoCardProps {
  hasActiveMembership?: boolean;
  membershipType?: string;
}

export default function MembershipPromoCard({ hasActiveMembership = false, membershipType }: MembershipPromoCardProps) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    navigation.navigate('Membership');
  };

  if (hasActiveMembership) {
    const displayName = membershipType ? `${membershipType.charAt(0).toUpperCase() + membershipType.slice(1)} Member` : 'Active Member';
    
    return (
      <TouchableOpacity style={styles.memberCard} onPress={handlePress}>
        <View style={styles.gradientOverlay}>
          <View style={styles.content}>
            <View style={styles.textContainer}>
              <Text style={styles.memberBadge}>MEMBER BENEFITS</Text>
              <Text style={styles.memberTitle}>{displayName} 💎</Text>
            </View>
            
            <View style={styles.ctaContainer}>
              <View style={styles.memberCtaButton}>
                <Text style={styles.ctaText}>Manage</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.promoCard} onPress={handlePress}>
      <View style={styles.gradientOverlay}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.badge}>🏆 FOUNDING MEMBERS</Text>
            <Text style={styles.title}>Get lowest prices ever + exclusive benefits</Text>
            <Text style={styles.subtitle}>Limited quantity • Available until 2 weeks before opening</Text>
          </View>
          
          <View style={styles.ctaContainer}>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>Join Now</Text>
              <Text style={styles.arrow}>→</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  promoCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A62A2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientOverlay: {
    backgroundColor: '#2A62A2',
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  badge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#bed61e',
    backgroundColor: 'rgba(190, 214, 30, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
  },
  ctaContainer: {
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  arrow: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#bed61e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  memberBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#bed61e',
    backgroundColor: 'rgba(190, 214, 30, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
    overflow: 'hidden',
  },
  memberTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  memberCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});