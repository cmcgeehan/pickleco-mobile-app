import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface FAQItem {
  question: string;
  answer: string;
}

export default function MembershipFAQ() {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const faqs: FAQItem[] = [
    {
      question: t('membership.faqBillingQuestion'),
      answer: t('membership.faqBillingAnswer')
    },
    {
      question: t('membership.faqEarlyBirdQuestion'),
      answer: t('membership.faqEarlyBirdAnswer')
    },
    {
      question: t('membership.faqSwitchPlansQuestion'),
      answer: t('membership.faqSwitchPlansAnswer')
    },
    {
      question: t('membership.faqRefundQuestion'),
      answer: t('membership.faqRefundAnswer')
    },
    {
      question: t('membership.faqFeesQuestion'),
      answer: t('membership.faqFeesAnswer')
    },
    {
      question: t('membership.faqLocationsQuestion'),
      answer: t('membership.faqLocationsAnswer')
    },
    {
      question: t('membership.faqSatisfactionQuestion'),
      answer: t('membership.faqSatisfactionAnswer')
    }
  ];

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('membership.faqTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('membership.faqSubtitle')}
        </Text>
      </View>

      <View style={styles.faqList}>
        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.questionButton}
              onPress={() => toggleItem(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.questionText}>{faq.question}</Text>
              <Text style={[
                styles.chevron,
                expandedItems.has(index) && styles.chevronExpanded
              ]}>
                ▼
              </Text>
            </TouchableOpacity>
            
            {expandedItems.has(index) && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{faq.answer}</Text>
              </View>
            )}
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
    marginBottom: 32,
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
  },
  faqList: {
    gap: 8,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  questionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 16,
  },
  chevron: {
    fontSize: 12,
    color: '#64748b',
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  answerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 0,
  },
  answerText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});