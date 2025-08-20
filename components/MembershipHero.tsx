import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function MembershipHero() {
  const foundingBenefits = [
    {
      icon: '💰',
      title: 'Lowest Price Ever',
      description: 'Get the lowest price we\'ll ever sell memberships for'
    },
    {
      icon: '🏓',
      title: 'Early Access Play',
      description: 'Play for free on weekends before we open (temporary courts, retas & test leagues)'
    },
    {
      icon: '🎉',
      title: 'Soft Launch Access',
      description: 'Get exclusive access to our soft launch before the grand opening'
    },
    {
      icon: '👕',
      title: 'Founder\'s Merch',
      description: 'Get exclusive founder\'s merchandise we\'ll never print again'
    },
    {
      icon: '🍹',
      title: '$250 MXN Credit',
      description: 'Get $250 MXN in credit towards the bar + pro shop'
    },
    {
      icon: '✅',
      title: '7-Day Guarantee',
      description: 'Full refund available in the first 7 days after we open if you\'re not satisfied'
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Founding Members Special</Text>
        <Text style={styles.subtitle}>
          Why pay for a membership before you see the venue? Here's what makes it worth it:
        </Text>
      </View>


      <View style={styles.featuresGrid}>
        {foundingBenefits.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A62A2',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: (width - 60) / 2, // Two cards per row with spacing
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});