import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function MembershipHero() {
  const { t } = useTranslation();
  
  const foundingBenefits = [
    {
      icon: '💰',
      title: t('membership.lowestPriceEver'),
      description: t('membership.lowestPriceDesc')
    },
    {
      icon: '🏓',
      title: t('membership.earlyAccessPlay'),
      description: t('membership.earlyAccessDesc')
    },
    {
      icon: '🎉',
      title: t('membership.softLaunchAccess'),
      description: t('membership.softLaunchDesc')
    },
    {
      icon: '👕',
      title: t('membership.foundersMerch'),
      description: t('membership.foundersMerchDesc')
    },
    {
      icon: '🍹',
      title: t('membership.creditAmount'),
      description: t('membership.creditDesc')
    },
    {
      icon: '✅',
      title: t('membership.dayGuarantee'),
      description: t('membership.dayGuaranteeDesc')
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('membership.foundingMembersSpecial')}</Text>
        <Text style={styles.subtitle}>
          {t('membership.foundingMembersSubtitle')}
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